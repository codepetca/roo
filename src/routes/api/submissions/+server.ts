import { json } from '@sveltejs/kit'
import { supabase } from '$lib/server/supabase.js'

export async function GET({ url }) {
  try {
    const studentId = url.searchParams.get('studentId')
    const teacherId = url.searchParams.get('teacherId')

    let query = supabase
      .from('java_submissions')
      .select(`
        *,
        java_questions(question_text, java_concepts),
        profiles!java_submissions_student_id_fkey(full_name)
      `)
      .order('created_at', { ascending: false })

    if (studentId) {
      query = query.eq('student_id', studentId)
    } else if (teacherId) {
      query = query.eq('teacher_id', teacherId)
    } else {
      return json({ error: 'Missing studentId or teacherId parameter' }, { status: 400 })
    }

    const { data: submissions, error } = await query

    if (error) throw error

    return json({ submissions })
  } catch (error) {
    console.error('Fetch submissions error:', error)
    return json({ error: 'Failed to fetch submissions' }, { status: 500 })
  }
}