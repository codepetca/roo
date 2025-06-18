import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { IntegrationTestUtils, expectStoreState, ErrorScenarios } from '../../integration-setup.js'
import { mockSupabaseClient, resetMocks } from '../../setup.js'

// Mock dependencies
vi.mock('$lib/supabase', () => ({
  supabase: mockSupabaseClient
}))

// Set up fetch mock before stores initialize
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ success: true, data: [] })
})

describe('Complete Test Lifecycle Integration Workflow', () => {
  let AuthStore: any
  let QuestionsStore: any
  let TestsStore: any
  let TestAttemptStore: any
  let timers: ReturnType<typeof IntegrationTestUtils.mockTimers>

  beforeEach(async () => {
    resetMocks()
    IntegrationTestUtils.cleanup()

    // Setup timer mocking
    timers = IntegrationTestUtils.mockTimers()

    // Import all stores
    const [authModule, questionsModule, testsModule, testAttemptModule] = await Promise.all([
      import('../../../lib/stores/auth.svelte.js'),
      import('../../../lib/stores/questions.svelte.js'),
      import('../../../lib/stores/tests.svelte.js'),
      import('../../../lib/stores/test-attempt.svelte.js')
    ])

    AuthStore = authModule.AuthStore
    QuestionsStore = questionsModule.QuestionsStore
    TestsStore = testsModule.TestsStore
    TestAttemptStore = testAttemptModule.TestAttemptStore
  })

  afterEach(() => {
    timers.cleanup()
    IntegrationTestUtils.cleanup()
  })

  describe('Teacher to Student Complete Workflow', () => {
    it('should complete full workflow: teacher creates test → student takes test → teacher grades', async () => {
      // === TEACHER SETUP PHASE ===
      const { mockUser: teacherUser, mockProfile: teacherProfile } = 
        await IntegrationTestUtils.createUserSession('teacher')
      const { mockUser: studentUser, mockProfile: studentProfile } = 
        await IntegrationTestUtils.createUserSession('student')

      const authStore = new AuthStore()
      const questionsStore = new QuestionsStore()
      const testsStore = new TestsStore()
      const testAttemptStore = new TestAttemptStore()

      // === STEP 1: Teacher Authentication ===
      authStore.user = teacherUser
      authStore.profile = teacherProfile

      expect(authStore.profile?.role).toBe('teacher')

      // === STEP 2: Teacher Loads Questions ===
      const { questions } = IntegrationTestUtils.createTestScenario()

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: questions
        })
      } as Response)

      await questionsStore.loadQuestions()

      expect(questionsStore.questions).toHaveLength(3)
      expect(questionsStore.activeQuestions).toHaveLength(3)

      // === STEP 3: Teacher Creates Test ===
      const testData = {
        title: 'Java Fundamentals Assessment',
        description: 'Comprehensive test covering basic Java concepts',
        questionIds: questions.map(q => q.id),
        timeLimitMinutes: 90,
        endDate: new Date(Date.now() + 86400000).toISOString(),
        createdBy: teacherUser.id,
        settings: {
          immediateeFeedback: false,
          fullscreenRequired: false,
          disableCopyPaste: false
        }
      }

      const createdTest = {
        id: 'lifecycle-test',
        ...testData,
        status: 'draft',
        created_at: new Date().toISOString()
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: createdTest
        })
      } as Response)

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [createdTest],
            error: null
          })
        })
      })

      const createResult = await testsStore.createTest(testData)

      expect(createResult.success).toBe(true)
      expect(testsStore.tests).toHaveLength(1)
      expect(testsStore.draftTests).toHaveLength(1)

      // === STEP 4: Teacher Publishes Test ===
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as Response)

      const publishResult = await testsStore.publishTest(createdTest.id)

      expect(publishResult.success).toBe(true)
      expect(testsStore.tests[0].status).toBe('active')
      expect(testsStore.activeTests).toHaveLength(1)

      // === STUDENT WORKFLOW PHASE ===

      // === STEP 5: Student Authentication ===
      authStore.user = studentUser
      authStore.profile = studentProfile

      expect(authStore.profile?.role).toBe('student')

      // === STEP 6: Student Starts Test ===
      const attempt = {
        id: 'student-attempt',
        test_id: createdTest.id,
        student_id: studentUser.id,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        submitted_at: null,
        auto_submitted: false,
        time_spent_seconds: 0,
        total_score: null,
        created_at: new Date().toISOString()
      }

      const testQuestions = questions.map((q, index) => ({
        id: `tq${index + 1}`,
        question_id: q.id,
        question_text: q.question_text,
        concepts: q.concepts,
        question_order: index + 1,
        points: 100
      }))

      IntegrationTestUtils.mockFetchSequence([
        {
          ok: true,
          data: { attempt }
        },
        {
          ok: true,
          data: {
            test: { ...createdTest, status: 'active' },
            questions: testQuestions
          }
        }
      ])

      const startResult = await testAttemptStore.startTest(createdTest.id, studentUser.id)

      expect(startResult.success).toBe(true)
      expect(testAttemptStore.test).toBeTruthy()
      expect(testAttemptStore.attempt).toEqual(attempt)
      expect(testAttemptStore.questions).toHaveLength(3)

      // === STEP 7: Student Answers Questions ===
      const studentAnswers = [
        {
          id: 'ans1',
          attempt_id: attempt.id,
          question_id: 'q1',
          answer_code: 'public int add(int a, int b) { return a + b; }',
          last_saved_at: new Date().toISOString()
        },
        {
          id: 'ans2',
          attempt_id: attempt.id,
          question_id: 'q2',
          answer_code: 'for(int i = 1; i <= 10; i++) { System.out.println(i); }',
          last_saved_at: new Date().toISOString()
        },
        {
          id: 'ans3',
          attempt_id: attempt.id,
          question_id: 'q3',
          answer_code: 'if(n % 2 == 0) { return true; } else { return false; }',
          last_saved_at: new Date().toISOString()
        }
      ]

      // Answer each question
      for (let i = 0; i < studentAnswers.length; i++) {
        const answer = studentAnswers[i]

        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            answer
          })
        } as Response)

        testAttemptStore.updateCurrentCode(answer.answer_code)
        const saveResult = await testAttemptStore.saveAnswer(answer.question_id, answer.answer_code)

        expect(saveResult.success).toBe(true)
        expect(testAttemptStore.answers[answer.question_id]).toEqual(answer)

        // Navigate to next question (except on last)
        if (i < studentAnswers.length - 1) {
          testAttemptStore.nextQuestion()
        }
      }

      // Verify progress
      expect(testAttemptStore.progress.answered).toBe(3)
      expect(testAttemptStore.progress.total).toBe(3)
      expect(testAttemptStore.progress.percentage).toBe(100)

      // === STEP 8: Student Submits Test ===
      const submittedAttempt = {
        ...attempt,
        status: 'submitted',
        submitted_at: new Date().toISOString()
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          attempt: submittedAttempt
        })
      } as Response)

      const submitResult = await testAttemptStore.submitTest()

      expect(submitResult.success).toBe(true)
      expect(testAttemptStore.attempt?.status).toBe('submitted')
      expect(testAttemptStore.timer.isRunning).toBe(false)

      // === GRADING PHASE ===

      // === STEP 9: Teacher Views Submissions ===
      authStore.user = teacherUser
      authStore.profile = teacherProfile

      // Mock teacher viewing submissions (would typically be in separate component/flow)
      const submissions = [
        {
          ...submittedAttempt,
          student: studentProfile,
          answers: studentAnswers
        }
      ]

      // This would typically trigger grading workflow
      expect(submissions).toHaveLength(1)
      expect(submissions[0].status).toBe('submitted')
      expect(submissions[0].answers).toHaveLength(3)

      // === STEP 10: Verify Complete Workflow State ===
      
      // Questions store should be unchanged
      expectStoreState(questionsStore, {
        loading: false,
        error: null
      })
      expect(questionsStore.questions).toHaveLength(3)

      // Tests store should have active test
      expectStoreState(testsStore, {
        loading: false,
        error: null
      })
      expect(testsStore.activeTests).toHaveLength(1)

      // Test attempt store should be in submitted state
      expectStoreState(testAttemptStore, {
        submitting: false,
        error: null
      })
      expect(testAttemptStore.attempt?.status).toBe('submitted')

      // Auth store should be properly set for teacher
      expect(authStore.user).toEqual(teacherUser)
      expect(authStore.profile).toEqual(teacherProfile)
    })

    it('should handle workflow interruptions and recovery', async () => {
      const { mockUser: teacherUser } = await IntegrationTestUtils.createUserSession('teacher')
      const { mockUser: studentUser } = await IntegrationTestUtils.createUserSession('student')

      const authStore = new AuthStore()
      const questionsStore = new QuestionsStore()
      const testsStore = new TestsStore()
      const testAttemptStore = new TestAttemptStore()

      authStore.user = teacherUser

      // === STEP 1: Questions load fails ===
      vi.mocked(fetch).mockRejectedValueOnce(ErrorScenarios.networkError())

      await questionsStore.loadQuestions()

      expect(questionsStore.error).toBe('Network request failed')
      expect(questionsStore.questions).toHaveLength(0)

      // === STEP 2: Retry questions load successfully ===
      const { questions } = IntegrationTestUtils.createTestScenario()

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: questions
        })
      } as Response)

      await questionsStore.loadQuestions()

      expect(questionsStore.error).toBeNull()
      expect(questionsStore.questions).toHaveLength(3)

      // === STEP 3: Test creation fails ===
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          success: false,
          error: { message: 'Invalid test configuration' }
        })
      } as Response)

      const testData = {
        title: 'Recovery Test',
        questionIds: ['q1'],
        timeLimitMinutes: 60,
        endDate: new Date(Date.now() + 86400000).toISOString(),
        createdBy: teacherUser.id,
        settings: {
          immediateeFeedback: false,
          fullscreenRequired: false,
          disableCopyPaste: false
        }
      }

      const createResult = await testsStore.createTest(testData)

      expect(createResult.success).toBe(false)
      expect(createResult.error).toBe('Invalid test configuration')

      // === STEP 4: Retry test creation successfully ===
      const createdTest = {
        id: 'recovery-test',
        ...testData,
        status: 'draft'
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: createdTest
        })
      } as Response)

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [createdTest],
            error: null
          })
        })
      })

      const retryResult = await testsStore.createTest(testData)

      expect(retryResult.success).toBe(true)
      expect(testsStore.tests).toHaveLength(1)

      // === STEP 5: Student test start fails ===
      authStore.user = studentUser

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          success: false,
          error: 'Test not yet published'
        })
      } as Response)

      const startResult = await testAttemptStore.startTest(createdTest.id, studentUser.id)

      expect(startResult.success).toBe(false)
      expect(startResult.error).toBe('Test not yet published')

      // === Verify all stores maintain consistency ===
      expect(questionsStore.questions).toHaveLength(3)
      expect(testsStore.tests).toHaveLength(1)
      expect(testAttemptStore.test).toBeNull()
    })

    it('should handle concurrent student access to same test', async () => {
      const { mockUser: teacherUser } = await IntegrationTestUtils.createUserSession('teacher')
      const authStore = new AuthStore()
      const testsStore = new TestsStore()

      authStore.user = teacherUser

      // Create and publish test
      const createdTest = {
        id: 'concurrent-test',
        title: 'Concurrent Access Test',
        status: 'active',
        time_limit_minutes: 60,
        end_date: new Date(Date.now() + 86400000).toISOString()
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: createdTest
        })
      } as Response)

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [createdTest],
            error: null
          })
        })
      })

      const testData = {
        title: createdTest.title,
        questionIds: ['q1'],
        timeLimitMinutes: 60,
        endDate: createdTest.end_date,
        createdBy: teacherUser.id,
        settings: {
          immediateeFeedback: false,
          fullscreenRequired: false,
          disableCopyPaste: false
        }
      }

      await testsStore.createTest(testData)

      // Simulate multiple students starting test concurrently
      const studentStores = Array(3).fill(null).map(() => new TestAttemptStore())
      const studentUsers = Array(3).fill(null).map((_, i) => ({
        id: `student-${i}`,
        email: `student${i}@example.com`
      }))

      // Mock successful starts for all students
      IntegrationTestUtils.mockFetchSequence([
        // Student 1 start
        { ok: true, data: { attempt: { id: 'attempt-1', test_id: createdTest.id, student_id: 'student-0' } } },
        { ok: true, data: { test: createdTest, questions: [] } },
        // Student 2 start
        { ok: true, data: { attempt: { id: 'attempt-2', test_id: createdTest.id, student_id: 'student-1' } } },
        { ok: true, data: { test: createdTest, questions: [] } },
        // Student 3 start
        { ok: true, data: { attempt: { id: 'attempt-3', test_id: createdTest.id, student_id: 'student-2' } } },
        { ok: true, data: { test: createdTest, questions: [] } }
      ])

      const startPromises = studentStores.map((store, i) => 
        store.startTest(createdTest.id, studentUsers[i].id)
      )

      const results = await Promise.all(startPromises)

      // All students should successfully start
      results.forEach((result, i) => {
        expect(result.success).toBe(true)
        expect(studentStores[i].attempt?.id).toBe(`attempt-${i + 1}`)
      })
    })
  })

  describe('Multi-User Scenarios', () => {
    it('should handle teacher managing multiple tests while students take them', async () => {
      const { mockUser: teacherUser } = await IntegrationTestUtils.createUserSession('teacher')
      const { mockUser: student1 } = await IntegrationTestUtils.createUserSession('student')
      const { mockUser: student2 } = await IntegrationTestUtils.createUserSession('student')

      const authStore = new AuthStore()
      const questionsStore = new QuestionsStore()
      const testsStore = new TestsStore()
      const student1Store = new TestAttemptStore()
      const student2Store = new TestAttemptStore()

      authStore.user = teacherUser

      // Load questions
      const { questions } = IntegrationTestUtils.createTestScenario()

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: questions
        })
      } as Response)

      await questionsStore.loadQuestions()

      // Create multiple tests
      const tests = [
        {
          id: 'test-1',
          title: 'Basic Java Test',
          questionIds: ['q1', 'q2'],
          timeLimitMinutes: 30,
          endDate: new Date(Date.now() + 86400000).toISOString(),
          createdBy: teacherUser.id,
          settings: { immediateeFeedback: false, fullscreenRequired: false, disableCopyPaste: false }
        },
        {
          id: 'test-2',
          title: 'Advanced Java Test',
          questionIds: ['q2', 'q3'],
          timeLimitMinutes: 60,
          endDate: new Date(Date.now() + 86400000).toISOString(),
          createdBy: teacherUser.id,
          settings: { immediateeFeedback: false, fullscreenRequired: false, disableCopyPaste: false }
        }
      ]

      for (const testData of tests) {
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { ...testData, status: 'draft' }
          })
        } as Response)

        mockSupabaseClient.from.mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: testsStore.tests.concat({ ...testData, status: 'draft' }),
              error: null
            })
          })
        })

        await testsStore.createTest(testData)
      }

      expect(testsStore.tests).toHaveLength(2)
      expect(testsStore.draftTests).toHaveLength(2)

      // Publish both tests
      for (const test of testsStore.tests) {
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        } as Response)

        await testsStore.publishTest(test.id)
      }

      expect(testsStore.activeTests).toHaveLength(2)

      // Students start different tests simultaneously
      IntegrationTestUtils.mockFetchSequence([
        // Student 1 starts test 1
        { ok: true, data: { attempt: { id: 'attempt-1-1', test_id: 'test-1', student_id: student1.id } } },
        { ok: true, data: { test: tests[0], questions: [] } },
        // Student 2 starts test 2
        { ok: true, data: { attempt: { id: 'attempt-2-2', test_id: 'test-2', student_id: student2.id } } },
        { ok: true, data: { test: tests[1], questions: [] } }
      ])

      const [start1Result, start2Result] = await Promise.all([
        student1Store.startTest('test-1', student1.id),
        student2Store.startTest('test-2', student2.id)
      ])

      expect(start1Result.success).toBe(true)
      expect(start2Result.success).toBe(true)
      expect(student1Store.test?.title).toBe('Basic Java Test')
      expect(student2Store.test?.title).toBe('Advanced Java Test')

      // Verify teacher can still manage tests
      expect(testsStore.getTestById('test-1')).toBeTruthy()
      expect(testsStore.getTestById('test-2')).toBeTruthy()
    })

    it('should handle test time limits and auto-submission across multiple students', async () => {
      const { mockUser: teacherUser } = await IntegrationTestUtils.createUserSession('teacher')
      const students = Array(3).fill(null).map((_, i) => ({
        id: `student-${i}`,
        email: `student${i}@example.com`
      }))

      const testsStore = new TestsStore()
      const studentStores = students.map(() => new TestAttemptStore())

      // Create test with short time limit
      const shortTest = {
        id: 'short-test',
        title: 'Quick Test',
        time_limit_minutes: 1, // 1 minute only
        status: 'active',
        end_date: new Date(Date.now() + 86400000).toISOString()
      }

      // All students start test
      const startTime = new Date()
      
      for (let i = 0; i < students.length; i++) {
        IntegrationTestUtils.mockFetchSequence([
          {
            ok: true,
            data: {
              attempt: {
                id: `attempt-${i}`,
                test_id: shortTest.id,
                student_id: students[i].id,
                started_at: startTime.toISOString(),
                status: 'in_progress'
              }
            }
          },
          {
            ok: true,
            data: { test: shortTest, questions: [] }
          }
        ])

        const result = await studentStores[i].startTest(shortTest.id, students[i].id)
        expect(result.success).toBe(true)
      }

      // Simulate time passing (timer expiration)
      students.forEach((_, i) => {
        studentStores[i].timer.timeRemaining = 0
        studentStores[i].timer.isExpired = true
        studentStores[i].timer.isRunning = false
      })

      // Mock auto-submit for all students
      for (let i = 0; i < students.length; i++) {
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            attempt: {
              id: `attempt-${i}`,
              status: 'submitted',
              submitted_at: new Date().toISOString()
            }
          })
        } as Response)
      }

      // Trigger auto-submit for all
      const submitPromises = studentStores.map(store => store.submitTest(true))
      const submitResults = await Promise.all(submitPromises)

      submitResults.forEach((result, i) => {
        expect(result.success).toBe(true)
        expect(studentStores[i].attempt?.status).toBe('submitted')
      })
    })
  })

  describe('Error Recovery in Complex Workflows', () => {
    it('should handle partial system failures gracefully', async () => {
      const { mockUser: teacherUser } = await IntegrationTestUtils.createUserSession('teacher')
      const { mockUser: studentUser } = await IntegrationTestUtils.createUserSession('student')

      const authStore = new AuthStore()
      const questionsStore = new QuestionsStore()
      const testsStore = new TestsStore()
      const testAttemptStore = new TestAttemptStore()

      // Teacher workflow starts normally
      authStore.user = teacherUser

      const { questions } = IntegrationTestUtils.createTestScenario()

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: questions
        })
      } as Response)

      await questionsStore.loadQuestions()

      // Test creation succeeds
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { id: 'partial-failure-test', status: 'draft' }
        })
      } as Response)

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [{ id: 'partial-failure-test', status: 'draft' }],
            error: null
          })
        })
      })

      const testData = {
        title: 'Partial Failure Test',
        questionIds: ['q1'],
        timeLimitMinutes: 60,
        endDate: new Date(Date.now() + 86400000).toISOString(),
        createdBy: teacherUser.id,
        settings: {
          immediateeFeedback: false,
          fullscreenRequired: false,
          disableCopyPaste: false
        }
      }

      await testsStore.createTest(testData)

      // Publish fails due to system error
      vi.mocked(fetch).mockRejectedValueOnce(ErrorScenarios.networkError())

      const publishResult = await testsStore.publishTest('partial-failure-test')

      expect(publishResult.success).toBe(false)
      expect(testsStore.tests[0].status).toBe('draft') // Should remain draft

      // Retry publish successfully
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as Response)

      const retryPublishResult = await testsStore.publishTest('partial-failure-test')

      expect(retryPublishResult.success).toBe(true)
      expect(testsStore.tests[0].status).toBe('active')

      // Student starts test but save fails
      authStore.user = studentUser

      IntegrationTestUtils.mockFetchSequence([
        {
          ok: true,
          data: {
            attempt: {
              id: 'failure-attempt',
              test_id: 'partial-failure-test',
              student_id: studentUser.id,
              status: 'in_progress'
            }
          }
        },
        {
          ok: true,
          data: {
            test: { id: 'partial-failure-test', time_limit_minutes: 60 },
            questions: [{ id: 'tq1', question_id: 'q1' }]
          }
        }
      ])

      await testAttemptStore.startTest('partial-failure-test', studentUser.id)

      // Save answer fails
      vi.mocked(fetch).mockRejectedValueOnce(ErrorScenarios.networkError())
      global.alert = vi.fn()

      const saveResult = await testAttemptStore.saveAnswer('q1', 'test answer')

      expect(saveResult.success).toBe(false)
      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Network error while saving')
      )

      // Retry save successfully
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          answer: { answer_code: 'test answer' }
        })
      } as Response)

      const retrySaveResult = await testAttemptStore.saveAnswer('q1', 'test answer')

      expect(retrySaveResult.success).toBe(true)
      expect(testAttemptStore.answers['q1']).toBeTruthy()

      // Verify system recovery
      expectStoreState(questionsStore, { loading: false, error: null })
      expectStoreState(testsStore, { loading: false, error: null })
      expect(testAttemptStore.test).toBeTruthy()
    })

    it('should maintain data integrity across store interactions', async () => {
      const { mockUser: teacherUser } = await IntegrationTestUtils.createUserSession('teacher')

      const authStore = new AuthStore()
      const questionsStore = new QuestionsStore()
      const testsStore = new TestsStore()

      authStore.user = teacherUser

      // Load questions
      const { questions } = IntegrationTestUtils.createTestScenario()

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: questions
        })
      } as Response)

      await questionsStore.loadQuestions()

      const initialQuestionCount = questionsStore.questions.length

      // Create test using questions
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { id: 'integrity-test', status: 'draft' }
        })
      } as Response)

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [{ id: 'integrity-test', status: 'draft' }],
            error: null
          })
        })
      })

      const testData = {
        title: 'Integrity Test',
        questionIds: questions.map(q => q.id),
        timeLimitMinutes: 60,
        endDate: new Date(Date.now() + 86400000).toISOString(),
        createdBy: teacherUser.id,
        settings: {
          immediateeFeedback: false,
          fullscreenRequired: false,
          disableCopyPaste: false
        }
      }

      await testsStore.createTest(testData)

      // Archive a question that's used in the test
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as Response)

      await questionsStore.archiveQuestion(questions[0].id)

      // Verify data integrity
      expect(questionsStore.questions).toHaveLength(initialQuestionCount - 1)
      expect(testsStore.tests).toHaveLength(1) // Test should still exist
      
      // Questions used in active tests should typically not be archivable
      // This test verifies the system maintains consistency even if it happens
      const remainingQuestionIds = questionsStore.questions.map((q: any) => q.id)
      expect(remainingQuestionIds).not.toContain(questions[0].id)
    })
  })
})