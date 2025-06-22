import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types.js'
import { supabase } from '$lib/server/supabase.ts'

export const GET: RequestHandler = async ({ params }) => {
  try {
    const { testId, attemptId } = params

    // Get the test attempt with student info
    const { data: attempt, error: attemptError } = await supabase
      .from('test_attempts')
      .select(`
        *,
        profiles!test_attempts_student_id_fkey (
          full_name
        )
      `)
      .eq('id', attemptId)
      .eq('test_id', testId)
      .single()

    if (attemptError || !attempt) {
      return json({ error: 'Submission not found' }, { status: 404 })
    }

    // Get all answers for this attempt with question details
    // First get the answers - also check answer_history for any saved code
    const { data: answers, error: answersError } = await supabase
      .from('test_answers')
      .select(`
        *,
        answer_history (
          code_snapshot,
          timestamp
        )
      `)
      .eq('attempt_id', attemptId)
      .order('created_at', { ascending: true })

    if (answersError) {
      return json({ error: 'Failed to fetch answers' }, { status: 500 })
    }

    // Get question details for each answer
    const processedAnswers = []
    
    for (const answer of answers || []) {
      // Direct lookup to questions since that's where question_id points
      const { data: javaQuestion } = await supabase
        .from('questions')
        .select('question_text, concepts, rubric')
        .eq('id', answer.question_id)
        .single()

      // Check if there's code in answer_history if main answer_code is empty
      let finalCode = answer.answer_code
      if (!finalCode?.trim() && answer.answer_history?.length > 0) {
        // Get the most recent code snapshot
        const latestHistory = answer.answer_history
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
        finalCode = latestHistory.code_snapshot || ''
      }

      processedAnswers.push({
        ...answer,
        answer_code: finalCode,
        question_text: javaQuestion?.question_text || 'Question not found',
        concepts: javaQuestion?.concepts || [],
        rubric: javaQuestion?.rubric || null
      })
    }

    return json({
      success: true,
      attempt: {
        ...attempt,
        student_name: attempt.profiles?.full_name || 'Unknown Student'
      },
      answers: processedAnswers
    })

  } catch (error) {
    return json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch submission details' 
    }, { status: 500 })
  }
}