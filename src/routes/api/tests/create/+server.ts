import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types.js'
import { supabase } from '$lib/server/supabase.ts'
import type { TestCreationRequest, APIResponse, APIError, CodingTestWithQuestions, CodingTest } from '$lib/types/index.js' // Added APIResponse, APIError, CodingTestWithQuestions, CodingTest

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const testData: TestCreationRequest = await request.json()
    
    if (!testData.createdBy) {
      const errorResponse: APIResponse = { success: false, error: { message: 'User ID required' } }
      return json(errorResponse, { status: 401 })
    }

    console.log('Looking up user profile for ID:', testData.createdBy)

    // Verify that the user exists and has teacher role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', testData.createdBy)
      .single()

    console.log('Profile lookup result:', { profile, profileError })

    // If profile exists, check role
    if (profile && profile.role !== 'teacher') {
      const errorResponse: APIResponse = { success: false, error: { message: 'Only teachers can create tests' } }
      return json(errorResponse, { status: 403 })
    }

    // If profile doesn't exist, we'll allow it (fallback profile scenario)
    // This handles cases where users are authenticated but profile isn't in DB yet
    if (profileError) {
      console.log('Profile not found in database, allowing fallback auth:', profileError.message)
    }

    const userId = testData.createdBy

    if (!testData.title || !testData.questionIds || testData.questionIds.length === 0) {
      const errorResponse: APIResponse = { success: false, error: { message: 'Title and questions are required' } }
      return json(errorResponse, { status: 400 })
    }

    if (!testData.timeLimitMinutes || testData.timeLimitMinutes < 1) {
      const errorResponse: APIResponse = { success: false, error: { message: 'Valid time limit is required' } }
      return json(errorResponse, { status: 400 })
    }

    if (!testData.endDate) {
      const errorResponse: APIResponse = { success: false, error: { message: 'End date is required' } }
      return json(errorResponse, { status: 400 })
    }

    // Create the test
    const { data: newTest, error: testError } = await supabase // Renamed 'test' to 'newTest' for clarity
      .from('coding_tests')
      .insert({
        title: testData.title,
        description: testData.description,
        time_limit_minutes: testData.timeLimitMinutes,
        start_date: testData.startDate,
        end_date: testData.endDate,
        immediate_feedback: testData.settings.immediateeFeedback,
        fullscreen_required: testData.settings.fullscreenRequired,
        disable_copy_paste: testData.settings.disableCopyPaste,
        created_by: userId,
        status: 'draft'
      })
      .select()
      .single<CodingTest>() // Typed the returned test

    if (testError || !newTest) { // Added !newTest check
      console.error('Database error creating test:', testError)
      const errorResponse: APIResponse = { success: false, error: { message: testError?.message || 'Failed to create test' } }
      return json(errorResponse, { status: 500 })
    }

    // Add questions to the test
    const testQuestions = testData.questionIds.map((questionId, index) => ({
      test_id: newTest.id, // Use newTest.id
      question_id: questionId,
      question_order: index + 1,
      points: 100 // Default points per question
    }))

    const { error: questionsError } = await supabase
      .from('test_questions')
      .insert(testQuestions)

    if (questionsError) {
      console.error('Database error adding questions:', questionsError)
      // Clean up the test if questions failed to add
      await supabase.from('coding_tests').delete().eq('id', newTest.id) // Use newTest.id
      const errorResponse: APIResponse = { success: false, error: { message: questionsError.message || 'Failed to add questions to test' } }
      return json(errorResponse, { status: 500 })
    }

    // Fetch the complete test with questions
    const { data: completeTest, error: fetchError } = await supabase
      .from('coding_tests')
      .select(`
        *,
        test_questions (
          *,
          questions (
            id,
            question_text,
            concepts
          )
        )
      `)
      .eq('id', newTest.id) // Use newTest.id
      .single<CodingTestWithQuestions>() // Typed the complete test

    if (fetchError || !completeTest) { // Added !completeTest check
      console.error('Error fetching complete test:', fetchError)
      // Test was created, but fetching details failed. This is tricky.
      // For now, return error, but client might need to know test ID (newTest.id)
      const errorResponse: APIResponse = { success: false, error: { message: fetchError?.message || 'Test created but failed to fetch details' } }
      return json(errorResponse, { status: 500 })
    }

    const response: APIResponse<CodingTestWithQuestions> = { success: true, data: completeTest }
    return json(response)

  } catch (error: any) {
    console.error('Test creation error:', error)
    const errorResponse: APIResponse = {
      success: false,
      error: { message: error?.message || 'Failed to create test due to an unexpected error' }
    }
    return json(errorResponse, { status: 500 })
  }
}