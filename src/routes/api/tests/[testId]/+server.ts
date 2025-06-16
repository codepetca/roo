import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types.js'
import { supabase } from '$lib/server/supabase.js'

export const GET: RequestHandler = async ({ params }) => {
  try {
    const { testId } = params

    const { data: test, error } = await supabase
      .from('coding_tests')
      .select(`
        *,
        test_questions (
          *,
          java_questions (
            id,
            question_text,
            java_concepts,
            rubric,
            solution
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

    const { error } = await supabase
      .from('coding_tests')
      .delete()
      .eq('id', testId)

    if (error) {
      console.error('Database error deleting test:', error)
      return json({ error: 'Failed to delete test' }, { status: 500 })
    }

    return json({ success: true })

  } catch (error) {
    console.error('Delete test error:', error)
    return json({ 
      error: error instanceof Error ? error.message : 'Failed to delete test' 
    }, { status: 500 })
  }
}