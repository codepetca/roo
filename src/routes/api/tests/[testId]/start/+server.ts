import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types.js'
import { supabase } from '$lib/server/supabase.ts'

export const POST: RequestHandler = async ({ params, request }) => {
  try {
    const { testId } = params
    const { studentId } = await request.json()

    if (!studentId) {
      return json({ error: 'Student ID is required' }, { status: 400 })
    }

    // Check if test exists and is active
    const { data: test, error: testError } = await supabase
      .from('coding_tests')
      .select('*')
      .eq('id', testId)
      .eq('status', 'active')
      .single()

    if (testError || !test) {
      return json({ error: 'Test not found or not active' }, { status: 404 })
    }

    // Check if test is within time window
    const now = new Date()
    const startDate = test.start_date ? new Date(test.start_date) : null
    const endDate = new Date(test.end_date)

    if (startDate && now < startDate) {
      return json({ error: 'Test has not started yet' }, { status: 400 })
    }

    if (now > endDate) {
      return json({ error: 'Test has ended' }, { status: 400 })
    }

    // Check if student already has an attempt
    const { data: existingAttempt } = await supabase
      .from('test_attempts')
      .select('*')
      .eq('test_id', testId)
      .eq('student_id', studentId)
      .single()

    if (existingAttempt) {
      if (existingAttempt.status === 'submitted') {
        return json({ error: 'Test already submitted' }, { status: 400 })
      }
      // Return existing attempt if in progress
      return json({ 
        success: true,
        attempt: existingAttempt 
      })
    }

    // Create new attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('test_attempts')
      .insert({
        test_id: testId,
        student_id: studentId,
        status: 'in_progress'
      })
      .select()
      .single()

    if (attemptError) {
      return json({ error: 'Failed to start test' }, { status: 500 })
    }

    // Get test questions to initialize answers
    const { data: testQuestions, error: questionsError } = await supabase
      .from('test_questions')
      .select('question_id')
      .eq('test_id', testId)
      .order('question_order')

    if (questionsError) {
      return json({ error: 'Failed to initialize test' }, { status: 500 })
    }

    // Create initial empty answers for each question
    const initialAnswers = testQuestions.map(tq => ({
      attempt_id: attempt.id,
      question_id: tq.question_id,
      answer_code: ''
    }))

    const { error: answersError } = await supabase
      .from('test_answers')
      .insert(initialAnswers)

    if (answersError) {
      // Clean up attempt if answers failed to create
      await supabase.from('test_attempts').delete().eq('id', attempt.id)
      return json({ error: 'Failed to initialize answers' }, { status: 500 })
    }

    return json({ 
      success: true,
      attempt 
    })

  } catch (error) {
    return json({ 
      error: error instanceof Error ? error.message : 'Failed to start test' 
    }, { status: 500 })
  }
}