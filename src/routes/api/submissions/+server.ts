import { json, type RequestHandler } from '@sveltejs/kit'
import { supabase } from '$lib/server/supabase.js'
import type { SubmissionWithRelations, APIResponse } from '$lib/types/index.js'

export const GET: RequestHandler = async ({ url }) => {
  try {
    const studentId = url.searchParams.get('studentId')
    const teacherId = url.searchParams.get('teacherId')


    let query = supabase
      .from('submissions')
      .select(`
        *,
        questions(question_text, concepts),
        profiles!submissions_student_id_fkey(full_name)
      `)
      .order('created_at', { ascending: false })

    if (studentId) {
      query = query.eq('student_id', studentId)
    } else if (teacherId) {
      query = query.eq('teacher_id', teacherId)
    } else {
      const response: APIResponse = { 
        success: false, 
        error: { message: 'Missing studentId or teacherId parameter' }
      }
      return json(response, { status: 400 })
    }

    const { data: submissions, error } = await query


    if (error) {
      throw error
    }

    const response: APIResponse<SubmissionWithRelations[]> = { 
      success: true, 
      data: submissions || []
    }
    return json(response)
  } catch (error) {
    const response: APIResponse = { 
      success: false, 
      error: { message: 'Failed to fetch submissions' }
    }
    return json(response, { status: 500 })
  }
}