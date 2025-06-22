import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types.js'
import { supabase } from '$lib/server/supabase.ts'

export const GET: RequestHandler = async ({ params, url }) => {
  try {
    const { testId } = params
    const teacherId = url.searchParams.get('teacherId')


    // Verify teacher has access to this test
    if (teacherId) {
      const { data: test, error: testError } = await supabase
        .from('coding_tests')
        .select('*')
        .eq('id', testId)
        .eq('created_by', teacherId)
        .single()


      if (testError || !test) {
        return json({ error: 'Test not found or access denied' }, { status: 404 })
      }
    }

    // Get all submissions for this test with student info and answer counts
    const { data: submissions, error: submissionsError } = await supabase
      .from('test_attempts')
      .select(`
        *,
        profiles!test_attempts_student_id_fkey (
          full_name
        ),
        test_answers (
          id,
          question_id,
          answer_code
        )
      `)
      .eq('test_id', testId)
      .order('submitted_at', { ascending: false })


    if (submissionsError) {
      return json({ error: 'Failed to fetch submissions' }, { status: 500 })
    }

    // Get total questions count for this test
    const { data: questionsCount, error: questionsError } = await supabase
      .from('test_questions')
      .select('id')
      .eq('test_id', testId)

    const totalQuestions = questionsCount?.length || 0

    // Process submissions to add computed fields
    const processedSubmissions = submissions?.map(submission => ({
      ...submission,
      student_name: submission.profiles?.full_name || 'Unknown Student',
      answers_count: submission.test_answers?.filter((a: any) => a.answer_code && a.answer_code.trim()).length || 0,
      total_questions: totalQuestions
    })) || []

    return json({
      success: true,
      submissions: processedSubmissions
    })

  } catch (error) {
    return json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch submissions' 
    }, { status: 500 })
  }
}