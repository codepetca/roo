import { json } from '@sveltejs/kit'
import { supabase } from '$lib/server/supabase.js'

export async function POST({ request }) {
  try {
    const { questionIds } = await request.json()
    
    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return json({ error: 'Question IDs array required' }, { status: 400 })
    }

    // Restore questions by setting archived to false
    const { error } = await supabase
      .from('java_questions')
      .update({ archived: false })
      .in('id', questionIds)

    if (error) {
      console.error('Restore questions error:', error)
      throw error
    }

    return json({ success: true, restoredCount: questionIds.length })
  } catch (error) {
    console.error('Restore questions error:', error)
    return json({ error: 'Failed to restore questions' }, { status: 500 })
  }
}