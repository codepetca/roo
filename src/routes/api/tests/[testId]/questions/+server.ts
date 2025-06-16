import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types.js'
import { supabase } from '$lib/server/supabase.ts'

export const GET: RequestHandler = async ({ params, url }) => {
  try {
    const { testId } = params
    const studentId = url.searchParams.get('studentId')

    if (!studentId) {
      return json({ error: 'Student ID is required' }, { status: 400 })
    }

    // Verify student has an active attempt for this test
    const { data: attempt, error: attemptError } = await supabase
      .from('test_attempts')
      .select('*')
      .eq('test_id', testId)
      .eq('student_id', studentId)
      .single()

    if (attemptError || !attempt) {
      return json({ error: 'No active attempt found' }, { status: 404 })
    }

    // Get test details
    const { data: test, error: testError } = await supabase
      .from('coding_tests')
      .select('*')
      .eq('id', testId)
      .single()

    if (testError || !test) {
      return json({ error: 'Test not found' }, { status: 404 })
    }

    // Get test questions with their details
    const { data: testQuestions, error: questionsError } = await supabase
      .from('test_questions')
      .select(`
        *,
        java_questions (
          id,
          question_text,
          java_concepts,
          rubric
        )
      `)
      .eq('test_id', testId)
      .order('question_order')

    if (questionsError) {
      console.error('Database error fetching questions:', questionsError)
      return json({ error: 'Failed to fetch questions' }, { status: 500 })
    }

    // Get existing answers for this attempt
    const { data: answers, error: answersError } = await supabase
      .from('test_answers')
      .select('*')
      .eq('attempt_id', attempt.id)

    if (answersError) {
      console.error('Database error fetching answers:', answersError)
      return json({ error: 'Failed to fetch answers' }, { status: 500 })
    }

    // Combine questions with their answers
    const questionsWithAnswers = testQuestions.map(tq => ({
      ...tq,
      // Flatten java_questions data for easier access
      question_text: tq.java_questions?.question_text || '',
      java_concepts: tq.java_questions?.java_concepts || [],
      rubric: tq.java_questions?.rubric || null,
      answer: answers.find(a => a.question_id === tq.question_id) || null
    }))

    console.log('Test questions processed:', {
      testId,
      questionsCount: questionsWithAnswers.length,
      sampleQuestion: questionsWithAnswers[0] ? {
        id: questionsWithAnswers[0].id,
        question_id: questionsWithAnswers[0].question_id,
        question_text: questionsWithAnswers[0].question_text,
        java_concepts: questionsWithAnswers[0].java_concepts
      } : null
    })

    return json({
      success: true,
      test,
      questions: questionsWithAnswers,
      attempt
    })

  } catch (error) {
    console.error('Fetch test questions error:', error)
    return json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch test questions' 
    }, { status: 500 })
  }
}