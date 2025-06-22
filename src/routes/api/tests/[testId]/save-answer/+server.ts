import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types.js'
import { supabase } from '$lib/server/supabase.js'

export const POST: RequestHandler = async ({ params, request }) => {
  try {
    const { testId } = params
    const { questionId, code, attemptId, timestamp } = await request.json()


    if (!questionId || !attemptId) {
      return json({ error: 'Question ID and attempt ID are required' }, { status: 400 })
    }

    // Verify attempt belongs to this test and is still in progress
    const { data: attempt, error: attemptError } = await supabase
      .from('test_attempts')
      .select('*')
      .eq('id', attemptId)
      .eq('test_id', testId)
      .eq('status', 'in_progress')
      .single()


    if (attemptError || !attempt) {
      return json({ error: 'Invalid attempt or test already submitted' }, { status: 400 })
    }

    // Check if test is still within time limit
    const testStartTime = new Date(attempt.started_at!)
    const { data: test } = await supabase
      .from('coding_tests')
      .select('time_limit_minutes')
      .eq('id', testId)
      .single()

    if (test) {
      const timeLimit = test.time_limit_minutes * 60 * 1000 // Convert to milliseconds
      const now = new Date()
      const elapsed = now.getTime() - testStartTime.getTime()

      if (elapsed > timeLimit) {
        // Auto-submit the test
        await supabase
          .from('test_attempts')
          .update({
            status: 'submitted',
            submitted_at: now.toISOString(),
            auto_submitted: true,
            time_spent_seconds: Math.floor(elapsed / 1000)
          })
          .eq('id', attemptId)

        return json({ error: 'Time limit exceeded, test auto-submitted' }, { status: 400 })
      }
    }

    // Save or update the answer
    
    const { data: answer, error: saveError } = await supabase
      .from('test_answers')
      .upsert({
        attempt_id: attemptId,
        question_id: questionId,
        answer_code: code || '',
        last_saved_at: timestamp || new Date().toISOString()
      }, {
        onConflict: 'attempt_id,question_id'
      })
      .select()
      .single()


    if (saveError) {
      return json({ error: `Database error: ${saveError.message}` }, { status: 500 })
    }

    // Update time spent on attempt
    const now = new Date()
    const timeSpent = Math.floor((now.getTime() - testStartTime.getTime()) / 1000)
    
    await supabase
      .from('test_attempts')
      .update({ time_spent_seconds: timeSpent })
      .eq('id', attemptId)

    // Create history entry for code changes (if code is provided)
    if (code && code.trim()) {
      await supabase
        .from('answer_history')
        .insert({
          answer_id: answer.id,
          code_snapshot: code,
          timestamp: timestamp || new Date().toISOString()
        })
    }

    return json({ 
      success: true,
      answer,
      timeSpent
    })

  } catch (error) {
    return json({ 
      error: error instanceof Error ? error.message : 'Failed to save answer' 
    }, { status: 500 })
  }
}