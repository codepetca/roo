import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types.js'
import { supabase } from '$lib/server/supabase.ts'
import type { TestCreationRequest } from '$lib/types/index.js'

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const testData: TestCreationRequest = await request.json()
    
    if (!testData.createdBy) {
      return json({ error: 'User ID required' }, { status: 401 })
    }

    console.log('Looking up user profile for ID:', testData.createdBy)

    // Verify that the user exists and has teacher role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', testData.createdBy)
      .single()

    console.log('Profile lookup result:', { profile, profileError })

    if (profileError || !profile) {
      console.error('Profile lookup failed:', profileError)
      return json({ error: `Invalid user: ${profileError?.message || 'Profile not found'}` }, { status: 401 })
    }

    if (profile.role !== 'teacher') {
      return json({ error: 'Only teachers can create tests' }, { status: 403 })
    }

    const userId = testData.createdBy

    if (!testData.title || !testData.questionIds || testData.questionIds.length === 0) {
      return json({ error: 'Title and questions are required' }, { status: 400 })
    }

    if (!testData.timeLimitMinutes || testData.timeLimitMinutes < 1) {
      return json({ error: 'Valid time limit is required' }, { status: 400 })
    }

    if (!testData.endDate) {
      return json({ error: 'End date is required' }, { status: 400 })
    }

    // Create the test
    const { data: test, error: testError } = await supabase
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
      .single()

    if (testError) {
      console.error('Database error creating test:', testError)
      return json({ error: 'Failed to create test' }, { status: 500 })
    }

    // Add questions to the test
    const testQuestions = testData.questionIds.map((questionId, index) => ({
      test_id: test.id,
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
      await supabase.from('coding_tests').delete().eq('id', test.id)
      return json({ error: 'Failed to add questions to test' }, { status: 500 })
    }

    // Fetch the complete test with questions
    const { data: completeTest, error: fetchError } = await supabase
      .from('coding_tests')
      .select(`
        *,
        test_questions (
          *,
          java_questions (
            id,
            question_text,
            java_concepts,
            solution
          )
        )
      `)
      .eq('id', test.id)
      .single()

    if (fetchError) {
      console.error('Error fetching complete test:', fetchError)
      return json({ error: 'Test created but failed to fetch details' }, { status: 500 })
    }

    return json({ 
      success: true,
      test: completeTest 
    })

  } catch (error) {
    console.error('Test creation error:', error)
    return json({ 
      error: error instanceof Error ? error.message : 'Failed to create test' 
    }, { status: 500 })
  }
}