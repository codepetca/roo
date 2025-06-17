import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types.js'
import { supabase } from '$lib/server/supabase.js'

export const GET: RequestHandler = async ({ params }) => {
  try {
    const { testId } = params

    // Get test details
    const { data: test, error: testError } = await supabase
      .from('coding_tests')
      .select(`
        *,
        test_questions (
          *,
          questions (
            id,
            question_text,
            concepts
          )
        )
      `)
      .eq('id', testId)
      .single()

    if (testError) {
      console.error('Database error fetching test:', testError)
      return json({ error: 'Test not found' }, { status: 404 })
    }

    // Get all graded attempts with student details and answers
    const { data: attempts, error: attemptsError } = await supabase
      .from('test_attempts')
      .select(`
        *,
        profiles (
          full_name
        ),
        test_answers (
          *,
          questions (
            question_text,
            concepts
          )
        )
      `)
      .eq('test_id', testId)
      .eq('status', 'graded')
      .order('total_score', { ascending: false })

    if (attemptsError) {
      console.error('Database error fetching results:', attemptsError)
      return json({ error: 'Failed to fetch results' }, { status: 500 })
    }

    // Calculate statistics
    const scores = attempts.map(a => a.total_score || 0)
    const statistics = {
      totalAttempts: attempts.length,
      averageScore: scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0,
      highestScore: scores.length > 0 ? Math.max(...scores) : 0,
      lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
      medianScore: scores.length > 0 ? calculateMedian(scores) : 0,
      passRate: scores.filter(score => score >= 60).length / (scores.length || 1) * 100
    }

    // Group results by question for analysis
    const questionAnalysis = test.test_questions?.map(tq => {
      const questionAnswers = attempts.flatMap(attempt => 
        attempt.test_answers?.filter(answer => answer.question_id === tq.question_id) || []
      )

      const questionScores = questionAnswers
        .filter(answer => answer.question_score !== null)
        .map(answer => answer.question_score!)

      return {
        questionId: tq.question_id,
        questionText: tq.questions?.question_text || 'Unknown Question',
        concepts: tq.questions?.concepts || [],
        points: tq.points || 100,
        totalAnswers: questionAnswers.length,
        averageScore: questionScores.length > 0 
          ? questionScores.reduce((sum, score) => sum + score, 0) / questionScores.length 
          : 0,
        highestScore: questionScores.length > 0 ? Math.max(...questionScores) : 0,
        lowestScore: questionScores.length > 0 ? Math.min(...questionScores) : 0
      }
    }) || []

    // Format student results
    const studentResults = attempts.map(attempt => ({
      attemptId: attempt.id,
      studentId: attempt.student_id,
      studentName: attempt.profiles?.full_name || 'Unknown Student',
      totalScore: attempt.total_score || 0,
      timeSpent: attempt.time_spent_seconds || 0,
      submittedAt: attempt.submitted_at,
      autoSubmitted: attempt.auto_submitted || false,
      answers: attempt.test_answers?.map(answer => ({
        questionId: answer.question_id,
        questionText: answer.questions?.question_text || 'Unknown Question',
        answerCode: answer.answer_code,
        scores: answer.scores,
        feedback: answer.feedback,
        questionScore: answer.question_score,
        gradedAt: answer.graded_at
      })) || []
    }))

    return json({
      success: true,
      test: {
        id: test.id,
        title: test.title,
        description: test.description,
        timeLimitMinutes: test.time_limit_minutes,
        status: test.status,
        createdAt: test.created_at
      },
      statistics,
      questionAnalysis,
      studentResults
    })

  } catch (error) {
    console.error('Fetch test results error:', error)
    return json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch test results' 
    }, { status: 500 })
  }
}

function calculateMedian(numbers: number[]): number {
  const sorted = [...numbers].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  } else {
    return sorted[mid]
  }
}