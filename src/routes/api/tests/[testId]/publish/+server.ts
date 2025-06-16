import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types.js'
import { supabase } from '$lib/server/supabase.js'

export const PUT: RequestHandler = async ({ params }) => {
  try {
    const { testId } = params

    // Update test status to active
    const { data: test, error } = await supabase
      .from('coding_tests')
      .update({
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', testId)
      .select()
      .single()

    if (error) {
      console.error('Database error publishing test:', error)
      return json({ error: 'Failed to publish test' }, { status: 500 })
    }

    // Verify test has questions
    const { data: questions, error: questionsError } = await supabase
      .from('test_questions')
      .select('id')
      .eq('test_id', testId)
      .limit(1)

    if (questionsError || !questions || questions.length === 0) {
      // Revert status change
      await supabase
        .from('coding_tests')
        .update({ status: 'draft' })
        .eq('id', testId)
      
      return json({ error: 'Cannot publish test without questions' }, { status: 400 })
    }

    return json({ 
      success: true,
      test 
    })

  } catch (error) {
    console.error('Publish test error:', error)
    return json({ 
      error: error instanceof Error ? error.message : 'Failed to publish test' 
    }, { status: 500 })
  }
}