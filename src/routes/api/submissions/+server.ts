import { json, type RequestHandler } from '@sveltejs/kit'
import { supabase } from '$lib/server/supabase.js'
import type { SubmissionsResponse, ApiResponse } from '$lib/types/index.js'

export const GET: RequestHandler = async ({ url }) => {
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
      const response: ApiResponse = { error: 'Missing studentId or teacherId parameter' }
      return json(response, { status: 400 })
    }

    const { data: submissions, error } = await query

    if (error) throw error

    const response: SubmissionsResponse = { submissions }
    return json(response)
  } catch (error) {
    console.error('Fetch submissions error:', error)
    const response: ApiResponse = { error: 'Failed to fetch submissions' }
    return json(response, { status: 500 })
  }
}