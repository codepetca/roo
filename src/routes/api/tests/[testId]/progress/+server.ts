import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types.js'
import { supabase } from '$lib/server/supabase.js'

export const GET: RequestHandler = async ({ params }) => {
  try {
    const { testId } = params

    // Get all attempts for this test with student details
    const { data: attempts, error: attemptsError } = await supabase
      .from('test_attempts')
      .select(`
        *,
        profiles (
          full_name
        )
      `)
      .eq('test_id', testId)
      .order('started_at', { ascending: false })

    if (attemptsError) {
      console.error('Database error fetching attempts:', attemptsError)
      return json({ error: 'Failed to fetch test progress' }, { status: 500 })
    }

    // Get test details
    const { data: test, error: testError } = await supabase
      .from('coding_tests')
      .select('*')
      .eq('id', testId)
      .single()

    if (testError) {
      console.error('Database error fetching test:', testError)
      return json({ error: 'Test not found' }, { status: 404 })
    }

    // Get question count for this test
    const { data: questionCount, error: countError } = await supabase
      .from('test_questions')
      .select('id', { count: 'exact' })
      .eq('test_id', testId)

    if (countError) {
      console.error('Database error counting questions:', countError)
      return json({ error: 'Failed to count questions' }, { status: 500 })
    }

    const totalQuestions = questionCount?.length || 0

    // Calculate progress for each attempt
    const progressData = await Promise.all(
      attempts.map(async (attempt) => {
        // Get answered questions count
        const { data: answers, error: answersError } = await supabase
          .from('test_answers')
          .select('id', { count: 'exact' })
          .eq('attempt_id', attempt.id)
          .not('answer_code', 'is', null)
          .neq('answer_code', '')

        const answeredQuestions = answersError ? 0 : (answers?.length || 0)

        // Calculate time remaining
        let timeRemaining = 0
        if (attempt.status === 'in_progress') {
          const startTime = new Date(attempt.started_at!)
          const now = new Date()
          const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000)
          const timeLimit = test.time_limit_minutes * 60
          timeRemaining = Math.max(0, timeLimit - elapsed)
        }

        return {
          attemptId: attempt.id,
          studentId: attempt.student_id,
          studentName: attempt.profiles?.full_name || 'Unknown Student',
          status: attempt.status,
          startedAt: attempt.started_at,
          submittedAt: attempt.submitted_at,
          timeSpent: attempt.time_spent_seconds || 0,
          timeRemaining,
          questionsAnswered: answeredQuestions,
          totalQuestions,
          autoSubmitted: attempt.auto_submitted,
          totalScore: attempt.total_score
        }
      })
    )

    // Calculate summary statistics
    const summary = {
      totalStudents: attempts.length,
      inProgress: attempts.filter(a => a.status === 'in_progress').length,
      submitted: attempts.filter(a => a.status === 'submitted').length,
      graded: attempts.filter(a => a.status === 'graded').length,
      averageTimeSpent: attempts.length > 0 
        ? Math.floor(attempts.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0) / attempts.length)
        : 0
    }

    return json({
      success: true,
      test,
      progress: progressData,
      summary
    })

  } catch (error) {
    console.error('Fetch test progress error:', error)
    return json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch test progress' 
    }, { status: 500 })
  }
}