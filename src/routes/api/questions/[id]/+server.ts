import { json } from '@sveltejs/kit'
import { supabase } from '$lib/server/supabase.js'

export async function DELETE({ params }) {
  try {
    const { id } = params
    
    
    if (!id) {
      return json({ error: 'Question ID required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('questions')
      .delete()
      .eq('id', id)
      .select()

    if (error) {
      throw error
    }


    return json({ success: true, deletedCount: data?.length || 0 })
  } catch (error) {
    return json({ error: 'Failed to delete question' }, { status: 500 })
  }
}