import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types.js'
import { supabase } from '$lib/server/supabase.js'

export const POST: RequestHandler = async ({ params, request }) => {
  try {
    const { testId } = params
    const { attemptId } = await request.json()

    if (!attemptId) {
      return json({ error: 'Attempt ID is required' }, { status: 400 })
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

    // Calculate time spent
    const startTime = new Date(attempt.started_at!)
    const endTime = new Date()
    const timeSpent = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)

    // Update attempt status to submitted
    const { data: submittedAttempt, error: submitError } = await supabase
      .from('test_attempts')
      .update({
        status: 'submitted',
        submitted_at: endTime.toISOString(),
        time_spent_seconds: timeSpent,
        auto_submitted: false
      })
      .eq('id', attemptId)
      .select()
      .single()

    if (submitError) {
      console.error('Database error submitting test:', submitError)
      return json({ error: 'Failed to submit test' }, { status: 500 })
    }

    // Get test settings to check if immediate feedback is enabled
    const { data: test } = await supabase
      .from('coding_tests')
      .select('immediate_feedback')
      .eq('id', testId)
      .single()

    let gradingResult = null

    // If immediate feedback is enabled, trigger grading
    if (test?.immediate_feedback) {
      try {
        const gradeResponse = await fetch(`/api/tests/${testId}/grade-attempt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attemptId })
        })

        if (gradeResponse.ok) {
          const gradeData = await gradeResponse.json()
          gradingResult = gradeData.results
        }
      } catch (gradeError) {
        console.error('Error grading immediately:', gradeError)
        // Don't fail the submission if grading fails
      }
    }

    return json({ 
      success: true,
      attempt: submittedAttempt,
      timeSpent,
      gradingResult
    })

  } catch (error) {
    console.error('Submit test error:', error)
    return json({ 
      error: error instanceof Error ? error.message : 'Failed to submit test' 
    }, { status: 500 })
  }
}