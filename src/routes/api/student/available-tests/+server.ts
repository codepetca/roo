import { json } from '@sveltejs/kit'
import { supabase } from '$lib/server/supabase.js'

export async function GET({ url }) {
  try {
    const studentId = url.searchParams.get('studentId')
    
    if (!studentId) {
      return json({ error: 'Student ID required' }, { status: 400 })
    }

    // Get all active tests that are currently available
    const { data: tests, error } = await supabase
      .from('coding_tests')
      .select(`
        *,
        test_questions (
          id,
          question_order,
          points
        )
      `)
      .eq('status', 'active')
      .or(`start_date.is.null,start_date.lte.${new Date().toISOString()}`)
      .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    // Add question count to each test
    const testsWithCount = (tests || []).map(test => ({
      ...test,
      question_count: test.test_questions?.length || 0
    }))

    return json({ 
      success: true, 
      tests: testsWithCount 
    })
  } catch (error) {
    return json({ 
      error: error instanceof Error ? error.message : 'Failed to load available tests' 
    }, { status: 500 })
  }
}