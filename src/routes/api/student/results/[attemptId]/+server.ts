import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types.js'
import { supabase } from '$lib/server/supabase.ts'

export const GET: RequestHandler = async ({ params, url }) => {
  try {
    const { attemptId } = params
    const studentId = url.searchParams.get('studentId')

    if (!attemptId) {
      return json({ error: 'Attempt ID is required' }, { status: 400 })
    }

    // Get the test attempt with related data
    const { data: attempt, error: attemptError } = await supabase
      .from('test_attempts')
      .select(`
        *,
        coding_tests (
          id,
          title,
          description,
          time_limit_minutes,
          immediate_feedback
        )
      `)
      .eq('id', attemptId)
      .single()

    if (attemptError || !attempt) {
      return json({ error: 'Test attempt not found' }, { status: 404 })
    }

    // Security check: ensure student can only view their own results
    if (studentId && attempt.student_id !== studentId) {
      return json({ error: 'Access denied' }, { status: 403 })
    }

    // Get all answers for this attempt with question details
    const { data: answers, error: answersError } = await supabase
      .from('test_answers')
      .select(`
        *,
        questions (
          id,
          question_text,
          concepts
        )
      `)
      .eq('attempt_id', attemptId)
      .order('created_at', { ascending: true })

    if (answersError) {
      return json({ error: 'Failed to fetch answers' }, { status: 500 })
    }

    // Flatten the data structure for easier frontend consumption
    const processedAnswers = answers?.map(answer => ({
      ...answer,
      question_text: answer.questions?.question_text || null,
      concepts: answer.questions?.concepts || []
    })) || []

    return json({
      success: true,
      attempt,
      test: attempt.coding_tests,
      answers: processedAnswers
    })

  } catch (error) {
    return json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch results' 
    }, { status: 500 })
  }
}