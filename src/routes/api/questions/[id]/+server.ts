import { json } from '@sveltejs/kit'
import { supabase } from '$lib/server/supabase.js'

export async function DELETE({ params }) {
  try {
    const { id } = params
    
    console.log('Attempting to delete question with ID:', id)
    
    if (!id) {
      return json({ error: 'Question ID required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('java_questions')
      .delete()
      .eq('id', id)
      .select()

    if (error) {
      console.error('Delete question error:', error)
      throw error
    }

    console.log('Delete result:', { deletedRows: data?.length || 0, data })

    return json({ success: true, deletedCount: data?.length || 0 })
  } catch (error) {
    console.error('Question deletion error:', error)
    return json({ error: 'Failed to delete question' }, { status: 500 })
  }
}