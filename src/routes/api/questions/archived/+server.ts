import { json } from '@sveltejs/kit'
import { supabase } from '$lib/server/supabase.js'

export async function GET() {
  try {
    const { data: questions, error } = await supabase
      .from('java_questions')
      .select('*')
      .eq('archived', true)
      .order('created_at', { ascending: false })

    if (error) throw error

    return json({ questions })
  } catch (error) {
    console.error('Fetch archived questions error:', error)
    return json({ error: 'Failed to fetch archived questions' }, { status: 500 })
  }
}