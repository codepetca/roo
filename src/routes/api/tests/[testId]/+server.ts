import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types.js'
import { supabase } from '$lib/server/supabase.ts'

export const GET: RequestHandler = async ({ params }) => {
  try {
    const { testId } = params

    const { data: test, error } = await supabase
      .from('coding_tests')
      .select(`
        *,
        test_questions (
          *,
          questions (
            id,
            question_text,
            concepts,
            rubric
          )
        )
      `)
      .eq('id', testId)
      .single()

    if (error) {
      console.error('Database error fetching test:', error)
      return json({ error: 'Test not found' }, { status: 404 })
    }

    return json({ test })

  } catch (error) {
    console.error('Fetch test error:', error)
    return json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch test' 
    }, { status: 500 })
  }
}

export const PUT: RequestHandler = async ({ params, request }) => {
  try {
    const { testId } = params
    const updateData = await request.json()

    const { data: test, error } = await supabase
      .from('coding_tests')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', testId)
      .select()
      .single()

    if (error) {
      console.error('Database error updating test:', error)
      return json({ error: 'Failed to update test' }, { status: 500 })
    }

    return json({ 
      success: true,
      test 
    })

  } catch (error) {
    console.error('Update test error:', error)
    return json({ 
      error: error instanceof Error ? error.message : 'Failed to update test' 
    }, { status: 500 })
  }
}

export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const { testId } = params

    console.log('Deleting test with cascade:', testId)

    // Get all test attempts for this test
    const { data: attempts, error: attemptsError } = await supabase
      .from('test_attempts')
      .select('id')
      .eq('test_id', testId)

    if (attemptsError) {
      console.error('Error fetching test attempts:', attemptsError)
      return json({ error: 'Failed to fetch test attempts' }, { status: 500 })
    }

    console.log('Found attempts to delete:', attempts?.length || 0)

    // Delete all related data in the correct order (child to parent)
    if (attempts && attempts.length > 0) {
      const attemptIds = attempts.map(a => a.id)

      // 1. Get all answer IDs first, then delete answer history
      const { data: answers } = await supabase
        .from('test_answers')
        .select('id')
        .in('attempt_id', attemptIds)

      if (answers && answers.length > 0) {
        const answerIds = answers.map(a => a.id)
        const { error: historyError } = await supabase
          .from('answer_history')
          .delete()
          .in('answer_id', answerIds)

        if (historyError) {
          console.error('Error deleting answer history:', historyError)
          // Continue anyway - this is not critical
        }
      }

      // 2. Delete test answers
      const { error: answersError } = await supabase
        .from('test_answers')
        .delete()
        .in('attempt_id', attemptIds)

      if (answersError) {
        console.error('Error deleting test answers:', answersError)
        return json({ error: 'Failed to delete test answers' }, { status: 500 })
      }

      // 3. Delete test attempts
      const { error: attemptsDeleteError } = await supabase
        .from('test_attempts')
        .delete()
        .eq('test_id', testId)

      if (attemptsDeleteError) {
        console.error('Error deleting test attempts:', attemptsDeleteError)
        return json({ error: 'Failed to delete test attempts' }, { status: 500 })
      }

      console.log('Deleted all attempts and related data')
    }

    // 4. Delete test questions
    const { error: questionsError } = await supabase
      .from('test_questions')
      .delete()
      .eq('test_id', testId)

    if (questionsError) {
      console.error('Error deleting test questions:', questionsError)
      return json({ error: 'Failed to delete test questions' }, { status: 500 })
    }

    // 5. Finally delete the test itself
    const { error: testError } = await supabase
      .from('coding_tests')
      .delete()
      .eq('id', testId)

    if (testError) {
      console.error('Error deleting test:', testError)
      return json({ error: 'Failed to delete test' }, { status: 500 })
    }

    console.log('Test deleted successfully with all related data')
    return json({ success: true })

  } catch (error) {
    console.error('Delete test error:', error)
    return json({ 
      error: error instanceof Error ? error.message : 'Failed to delete test' 
    }, { status: 500 })
  }
}