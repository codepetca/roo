import { json } from '@sveltejs/kit'
import { supabase } from '$lib/server/supabase.js'

export async function GET({ url }) {
  try {
    const studentId = url.searchParams.get('studentId')
    
    if (!studentId) {
      return json({ error: 'Student ID required' }, { status: 400 })
    }

    // Get all test attempts for this student
    const { data: attempts, error } = await supabase
      .from('test_attempts')
      .select(`
        *,
        coding_tests (
          id,
          title,
          time_limit_minutes
        )
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching student attempts:', error)
      throw error
    }

    // Transform the data to include test title
    const transformedAttempts = (attempts || []).map(attempt => ({
      ...attempt,
      test_title: attempt.coding_tests?.title || 'Unknown Test'
    }))

    return json({ 
      success: true, 
      attempts: transformedAttempts 
    })
  } catch (error) {
    console.error('Error in student attempts endpoint:', error)
    return json({ 
      error: error instanceof Error ? error.message : 'Failed to load attempts' 
    }, { status: 500 })
  }
}