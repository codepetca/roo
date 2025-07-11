import { json } from '@sveltejs/kit'
import { supabase } from '$lib/server/supabase.js'

export async function DELETE({ request }) {
  try {
    const { questionIds } = await request.json()
    
    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return json({ error: 'Question IDs array required' }, { status: 400 })
    }

    // Permanently delete the questions
    const { error } = await supabase
      .from('java_questions')
      .delete()
      .in('id', questionIds)

    if (error) {
      console.error('Permanent delete questions error:', error)
      throw error
    }

    return json({ success: true, deletedCount: questionIds.length })
  } catch (error) {
    console.error('Permanent delete questions error:', error)
    return json({ error: 'Failed to permanently delete questions' }, { status: 500 })
  }
}