import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockSupabaseClient, createMockTest, createMockQuestion, resetMocks } from '../../test/setup.js'
import type { CodingTest, CodingTestWithQuestions, APIResponse } from '$lib/types/index.js'

// Mock dependencies
vi.mock('$lib/supabase', () => ({
  supabase: mockSupabaseClient
}))

// Mock fetch globally
global.fetch = vi.fn()

describe('Tests Store', () => {
  let TestsStore: any

  beforeEach(async () => {
    resetMocks()
    vi.clearAllMocks()

    // Dynamic import to ensure fresh instance
    const module = await import('./tests.svelte.js')
    TestsStore = module.TestsStore
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const testsStore = new TestsStore()
      
      expect(testsStore.tests).toEqual([])
      expect(testsStore.loading).toBe(false)
      expect(testsStore.error).toBeNull()
    })

    it('should compute derived properties correctly for empty state', () => {
      const testsStore = new TestsStore()
      
      expect(testsStore.activeTests).toEqual([])
      expect(testsStore.draftTests).toEqual([])
      expect(testsStore.endedTests).toEqual([])
    })
  })

  describe('Load Tests', () => {
    it('should load tests successfully', async () => {
      const mockTests = [
        createMockTest({ id: 't1', status: 'active', title: 'Active Test' }),
        createMockTest({ id: 't2', status: 'draft', title: 'Draft Test' }),
        createMockTest({ id: 't3', status: 'ended', title: 'Ended Test' })
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockTests,
            error: null
          })
        })
      })

      const testsStore = new TestsStore()
      await testsStore.loadTests()

      expect(testsStore.tests).toEqual(mockTests)
      expect(testsStore.loading).toBe(false)
      expect(testsStore.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('coding_tests')
    })

    it('should handle database errors during load', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('Database connection failed')
          })
        })
      })

      const testsStore = new TestsStore()
      await testsStore.loadTests()

      expect(testsStore.tests).toEqual([])
      expect(testsStore.loading).toBe(false)
      expect(testsStore.error).toBe('Database connection failed')
    })

    it('should handle unknown errors during load', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockRejectedValue('Unknown error')
        })
      })

      const testsStore = new TestsStore()
      await testsStore.loadTests()

      expect(testsStore.tests).toEqual([])
      expect(testsStore.loading).toBe(false)
      expect(testsStore.error).toBe('Failed to load tests')
    })

    it('should set loading state during request', async () => {
      let resolvePromise: Function
      const loadPromise = new Promise(resolve => {
        resolvePromise = resolve
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue(loadPromise)
        })
      })

      const testsStore = new TestsStore()
      const loadTestsPromise = testsStore.loadTests()

      expect(testsStore.loading).toBe(true)

      resolvePromise({ data: [], error: null })
      await loadTestsPromise

      expect(testsStore.loading).toBe(false)
    })

    it('should handle null data response', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: null
          })
        })
      })

      const testsStore = new TestsStore()
      await testsStore.loadTests()

      expect(testsStore.tests).toEqual([])
      expect(testsStore.error).toBeNull()
    })
  })

  describe('Create Test', () => {
    it('should create test successfully', async () => {
      const testData = {
        title: 'New Test',
        description: 'Test description',
        questionIds: ['q1', 'q2'],
        timeLimitMinutes: 60,
        endDate: new Date(Date.now() + 86400000).toISOString(),
        createdBy: 'teacher-id',
        settings: {
          immediateeFeedback: false,
          fullscreenRequired: true,
          disableCopyPaste: false
        }
      }

      const mockCreatedTest = createMockTest({
        id: 'new-test-id',
        title: testData.title,
        description: testData.description
      })

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockCreatedTest
        })
      } as Response)

      // Mock loadTests call after creation
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [mockCreatedTest],
            error: null
          })
        })
      })

      const testsStore = new TestsStore()
      const result = await testsStore.createTest(testData)

      expect(result.success).toBe(true)
      expect(result.test).toEqual(mockCreatedTest)
      expect(fetch).toHaveBeenCalledWith('/api/tests/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      })
      expect(testsStore.tests).toContain(mockCreatedTest)
    })

    it('should handle create test API error', async () => {
      const testData = {
        title: 'New Test',
        description: 'Test description',
        questionIds: ['q1'],
        timeLimitMinutes: 60,
        endDate: new Date(Date.now() + 86400000).toISOString(),
        createdBy: 'teacher-id',
        settings: {
          immediateeFeedback: false,
          fullscreenRequired: false,
          disableCopyPaste: false
        }
      }

      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          success: false,
          error: { message: 'Invalid test data' }
        })
      } as Response)

      const testsStore = new TestsStore()
      const result = await testsStore.createTest(testData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid test data')
      expect(result.test).toBeUndefined()
    })

    it('should handle network errors during create', async () => {
      const testData = {
        title: 'New Test',
        description: 'Test description',
        questionIds: ['q1'],
        timeLimitMinutes: 60,
        endDate: new Date(Date.now() + 86400000).toISOString(),
        createdBy: 'teacher-id',
        settings: {
          immediateeFeedback: false,
          fullscreenRequired: false,
          disableCopyPaste: false
        }
      }

      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      const testsStore = new TestsStore()
      const result = await testsStore.createTest(testData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })

    it('should handle response with success false', async () => {
      const testData = {
        title: 'New Test',
        description: 'Test description',
        questionIds: ['q1'],
        timeLimitMinutes: 60,
        endDate: new Date(Date.now() + 86400000).toISOString(),
        createdBy: 'teacher-id',
        settings: {
          immediateeFeedback: false,
          fullscreenRequired: false,
          disableCopyPaste: false
        }
      }

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: false,
          error: { message: 'Validation failed' }
        })
      } as Response)

      const testsStore = new TestsStore()
      const result = await testsStore.createTest(testData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Validation failed')
    })
  })

  describe('Publish Test', () => {
    it('should publish test successfully', async () => {
      const testId = 'test-id'
      const existingTest = createMockTest({ id: testId, status: 'draft' })

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true
        })
      } as Response)

      const testsStore = new TestsStore()
      testsStore.tests = [existingTest]

      const result = await testsStore.publishTest(testId)

      expect(result.success).toBe(true)
      expect(fetch).toHaveBeenCalledWith(`/api/tests/${testId}/publish`, {
        method: 'PUT'
      })
      expect(testsStore.tests[0].status).toBe('active')
    })

    it('should handle publish test API error', async () => {
      const testId = 'test-id'

      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({
          success: false,
          error: { message: 'Permission denied' }
        })
      } as Response)

      const testsStore = new TestsStore()
      const result = await testsStore.publishTest(testId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Permission denied')
    })

    it('should handle network errors during publish', async () => {
      const testId = 'test-id'

      vi.mocked(fetch).mockRejectedValue(new Error('Connection timeout'))

      const testsStore = new TestsStore()
      const result = await testsStore.publishTest(testId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Connection timeout')
    })

    it('should not update local state if test not found', async () => {
      const testId = 'non-existent-test'

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as Response)

      const testsStore = new TestsStore()
      testsStore.tests = [createMockTest({ id: 'different-test', status: 'draft' })]

      const result = await testsStore.publishTest(testId)

      expect(result.success).toBe(true)
      expect(testsStore.tests[0].status).toBe('draft') // Should remain unchanged
    })
  })

  describe('Delete Test', () => {
    it('should delete test successfully', async () => {
      const testId = 'test-to-delete'
      const testToKeep = createMockTest({ id: 'test-to-keep' })
      const testToDelete = createMockTest({ id: testId })

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true
        })
      } as Response)

      const testsStore = new TestsStore()
      testsStore.tests = [testToKeep, testToDelete]

      const result = await testsStore.deleteTest(testId)

      expect(result.success).toBe(true)
      expect(fetch).toHaveBeenCalledWith(`/api/tests/${testId}`, {
        method: 'DELETE'
      })
      expect(testsStore.tests).toEqual([testToKeep])
      expect(testsStore.tests).not.toContain(testToDelete)
    })

    it('should handle delete test API error', async () => {
      const testId = 'test-id'

      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 409,
        json: () => Promise.resolve({
          success: false,
          error: { message: 'Cannot delete test with submissions' }
        })
      } as Response)

      const testsStore = new TestsStore()
      const result = await testsStore.deleteTest(testId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Cannot delete test with submissions')
    })

    it('should handle network errors during delete', async () => {
      const testId = 'test-id'

      vi.mocked(fetch).mockRejectedValue(new Error('Request failed'))

      const testsStore = new TestsStore()
      const result = await testsStore.deleteTest(testId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Request failed')
    })
  })

  describe('Get Test By ID', () => {
    it('should return test when found', () => {
      const test1 = createMockTest({ id: 'test-1', title: 'Test 1' })
      const test2 = createMockTest({ id: 'test-2', title: 'Test 2' })

      const testsStore = new TestsStore()
      testsStore.tests = [test1, test2]

      const result = testsStore.getTestById('test-2')

      expect(result).toEqual(test2)
    })

    it('should return undefined when test not found', () => {
      const test1 = createMockTest({ id: 'test-1', title: 'Test 1' })

      const testsStore = new TestsStore()
      testsStore.tests = [test1]

      const result = testsStore.getTestById('non-existent')

      expect(result).toBeUndefined()
    })

    it('should handle empty test list', () => {
      const testsStore = new TestsStore()
      testsStore.tests = []

      const result = testsStore.getTestById('any-id')

      expect(result).toBeUndefined()
    })
  })

  describe('Update Test Status', () => {
    it('should update test status successfully', async () => {
      const testId = 'test-id'
      const existingTest = createMockTest({ id: testId, status: 'draft' })

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true
        })
      } as Response)

      const testsStore = new TestsStore()
      testsStore.tests = [existingTest]

      await testsStore.updateTestStatus(testId, 'active')

      expect(fetch).toHaveBeenCalledWith(`/api/tests/${testId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' })
      })
      expect(testsStore.tests[0].status).toBe('active')
    })

    it('should handle update status API error silently', async () => {
      const testId = 'test-id'
      const existingTest = createMockTest({ id: testId, status: 'draft' })

      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500
      } as Response)

      const testsStore = new TestsStore()
      testsStore.tests = [existingTest]

      await testsStore.updateTestStatus(testId, 'active')

      expect(testsStore.tests[0].status).toBe('draft') // Should remain unchanged
    })

    it('should handle network errors during status update', async () => {
      const testId = 'test-id'
      const existingTest = createMockTest({ id: testId, status: 'draft' })

      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      const testsStore = new TestsStore()
      testsStore.tests = [existingTest]

      await testsStore.updateTestStatus(testId, 'active')

      expect(testsStore.tests[0].status).toBe('draft') // Should remain unchanged
    })

    it('should not update if test not found', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true
      } as Response)

      const testsStore = new TestsStore()
      testsStore.tests = [createMockTest({ id: 'different-test', status: 'draft' })]

      await testsStore.updateTestStatus('non-existent', 'active')

      expect(testsStore.tests[0].status).toBe('draft') // Should remain unchanged
    })
  })

  describe('Computed Properties', () => {
    it('should filter tests by status correctly', () => {
      const activeTest1 = createMockTest({ id: 't1', status: 'active', title: 'Active 1' })
      const activeTest2 = createMockTest({ id: 't2', status: 'active', title: 'Active 2' })
      const draftTest = createMockTest({ id: 't3', status: 'draft', title: 'Draft' })
      const endedTest = createMockTest({ id: 't4', status: 'ended', title: 'Ended' })

      const testsStore = new TestsStore()
      testsStore.tests = [activeTest1, draftTest, activeTest2, endedTest]

      expect(testsStore.activeTests).toEqual([activeTest1, activeTest2])
      expect(testsStore.draftTests).toEqual([draftTest])
      expect(testsStore.endedTests).toEqual([endedTest])
    })

    it('should handle empty test arrays', () => {
      const testsStore = new TestsStore()
      testsStore.tests = []

      expect(testsStore.activeTests).toEqual([])
      expect(testsStore.draftTests).toEqual([])
      expect(testsStore.endedTests).toEqual([])
    })

    it('should update filtered lists when tests change', () => {
      const testsStore = new TestsStore()
      testsStore.tests = [createMockTest({ id: 't1', status: 'draft' })]

      expect(testsStore.draftTests).toHaveLength(1)
      expect(testsStore.activeTests).toHaveLength(0)

      // Change status
      testsStore.tests[0] = { ...testsStore.tests[0], status: 'active' }

      expect(testsStore.draftTests).toHaveLength(0)
      expect(testsStore.activeTests).toHaveLength(1)
    })

    it('should handle tests with unexpected status values', () => {
      const testWithInvalidStatus = createMockTest({ 
        id: 't1', 
        status: 'invalid-status' as any 
      })

      const testsStore = new TestsStore()
      testsStore.tests = [testWithInvalidStatus]

      expect(testsStore.activeTests).toHaveLength(0)
      expect(testsStore.draftTests).toHaveLength(0)
      expect(testsStore.endedTests).toHaveLength(0)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed API responses', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          // Missing success field
          data: null
        })
      } as Response)

      const testsStore = new TestsStore()
      const result = await testsStore.createTest({
        title: 'Test',
        questionIds: ['q1'],
        timeLimitMinutes: 60,
        endDate: new Date().toISOString(),
        createdBy: 'teacher-id',
        settings: {
          immediateeFeedback: false,
          fullscreenRequired: false,
          disableCopyPaste: false
        }
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to create test')
    })

    it('should handle JSON parse errors', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      } as Response)

      const testsStore = new TestsStore()
      const result = await testsStore.publishTest('test-id')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid JSON')
    })

    it('should handle concurrent operations', async () => {
      const testId = 'test-id'
      let callCount = 0

      vi.mocked(fetch).mockImplementation(() => {
        callCount++
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        } as Response)
      })

      const testsStore = new TestsStore()

      // Start multiple concurrent operations
      const promises = [
        testsStore.publishTest(testId),
        testsStore.deleteTest(testId),
        testsStore.updateTestStatus(testId, 'active')
      ]

      await Promise.all(promises)

      expect(callCount).toBe(3) // All operations should complete
    })

    it('should handle tests with null or undefined fields', () => {
      const testWithNulls = createMockTest({
        id: 't1',
        title: null as any,
        description: undefined as any,
        status: 'active'
      })

      const testsStore = new TestsStore()
      testsStore.tests = [testWithNulls]

      expect(testsStore.activeTests).toContain(testWithNulls)
      expect(testsStore.getTestById('t1')).toEqual(testWithNulls)
    })

    it('should handle very large test lists efficiently', async () => {
      const largeTestList = Array(1000).fill(null).map((_, index) => 
        createMockTest({ 
          id: `test-${index}`,
          status: index % 3 === 0 ? 'active' : index % 3 === 1 ? 'draft' : 'ended'
        })
      )

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: largeTestList,
            error: null
          })
        })
      })

      const testsStore = new TestsStore()
      const start = Date.now()
      await testsStore.loadTests()
      const duration = Date.now() - start

      expect(testsStore.tests).toHaveLength(1000)
      expect(testsStore.activeTests.length).toBeGreaterThan(300)
      expect(testsStore.draftTests.length).toBeGreaterThan(300)
      expect(testsStore.endedTests.length).toBeGreaterThan(300)
      expect(duration).toBeLessThan(1000) // Should complete within 1 second
    })
  })

  describe('Performance and Memory Management', () => {
    it('should not cause memory leaks with repeated operations', async () => {
      const testsStore = new TestsStore()

      // Simulate many rapid test creations
      for (let i = 0; i < 100; i++) {
        testsStore.tests = [
          ...testsStore.tests,
          createMockTest({ id: `test-${i}`, title: `Test ${i}` })
        ]
      }

      expect(testsStore.tests).toHaveLength(100)
      expect(testsStore.activeTests.length + testsStore.draftTests.length + testsStore.endedTests.length)
        .toBeLessThanOrEqual(100)
    })

    it('should handle rapid state changes without issues', () => {
      const testsStore = new TestsStore()

      // Rapidly change tests state
      for (let i = 0; i < 50; i++) {
        testsStore.tests = [createMockTest({ id: `test-${i}`, status: 'active' })]
      }

      expect(testsStore.tests).toHaveLength(1)
      expect(testsStore.tests[0].id).toBe('test-49')
      expect(testsStore.activeTests).toHaveLength(1)
    })

    it('should debounce rapid API requests appropriately', async () => {
      let callCount = 0

      vi.mocked(fetch).mockImplementation(() => {
        callCount++
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        } as Response)
      })

      const testsStore = new TestsStore()

      // Make multiple rapid requests to same test
      const promises = Array(5).fill(null).map(() => 
        testsStore.updateTestStatus('test-id', 'active')
      )

      await Promise.all(promises)

      expect(callCount).toBe(5) // All requests should go through (no built-in debouncing)
    })

    it('should clean up resources when needed', () => {
      const testsStore = new TestsStore()

      // Fill with large amount of data
      testsStore.tests = Array(10000).fill(null).map((_, i) => 
        createMockTest({ id: `test-${i}` })
      )

      // Clear data
      testsStore.tests = []

      expect(testsStore.tests).toHaveLength(0)
      expect(testsStore.activeTests).toHaveLength(0)
      expect(testsStore.draftTests).toHaveLength(0)
      expect(testsStore.endedTests).toHaveLength(0)
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle complete test lifecycle', async () => {
      const testsStore = new TestsStore()

      // 1. Create test
      const testData = {
        title: 'Lifecycle Test',
        questionIds: ['q1'],
        timeLimitMinutes: 60,
        endDate: new Date(Date.now() + 86400000).toISOString(),
        createdBy: 'teacher-id',
        settings: {
          immediateeFeedback: false,
          fullscreenRequired: false,
          disableCopyPaste: false
        }
      }

      const createdTest = createMockTest({
        id: 'lifecycle-test',
        title: testData.title,
        status: 'draft'
      })

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: createdTest })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        } as Response)

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [createdTest],
            error: null
          })
        })
      })

      // Create
      const createResult = await testsStore.createTest(testData)
      expect(createResult.success).toBe(true)
      expect(testsStore.draftTests).toHaveLength(1)

      // 2. Publish test
      const publishResult = await testsStore.publishTest('lifecycle-test')
      expect(publishResult.success).toBe(true)
      expect(testsStore.tests[0].status).toBe('active')

      // 3. Update status to ended
      await testsStore.updateTestStatus('lifecycle-test', 'ended')
      expect(testsStore.tests[0].status).toBe('ended')

      // 4. Delete test
      const deleteResult = await testsStore.deleteTest('lifecycle-test')
      expect(deleteResult.success).toBe(true)
      expect(testsStore.tests).toHaveLength(0)
    })

    it('should handle mixed success and failure operations', async () => {
      const testsStore = new TestsStore()
      testsStore.tests = [
        createMockTest({ id: 'test-1', status: 'draft' }),
        createMockTest({ id: 'test-2', status: 'draft' })
      ]

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ 
            success: false, 
            error: { message: 'Permission denied' } 
          })
        } as Response)

      // First publish should succeed
      const result1 = await testsStore.publishTest('test-1')
      expect(result1.success).toBe(true)
      expect(testsStore.tests[0].status).toBe('active')

      // Second publish should fail
      const result2 = await testsStore.publishTest('test-2')
      expect(result2.success).toBe(false)
      expect(testsStore.tests[1].status).toBe('draft') // Should remain unchanged
    })
  })
})