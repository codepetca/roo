import { json, type RequestHandler } from '@sveltejs/kit'
import { supabase } from '$lib/server/supabase.js'
import { generateQuestion } from '$lib/server/claude.js'
import type { QuestionGenerationRequest, ArchiveRequest, APIResponse, APIError, Question, RubricStructure } from '$lib/types/index.js' // Updated imports

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body: QuestionGenerationRequest = await request.json()
    const { concepts } = body
    
    if (!concepts || !Array.isArray(concepts)) {
      const errorResponse: APIResponse = { success: false, error: { message: 'Concepts array required' } }
      return json(errorResponse, { status: 400 })
    }

    const questionData = await generateQuestion(concepts)
    
    // Insert into questions table
    const { data: question, error } = await supabase
      .from('questions')
      .insert({
        question_text: questionData.question,
        rubric: JSON.parse(JSON.stringify(questionData.rubric)),
        concepts: concepts,
        language: 'java',
        archived: false
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      // throw error // Keep original error handling for now, adjust if needed after testing
      const errorResponse: APIResponse = { success: false, error: { message: error.message || 'Database error inserting question' } }
      return json(errorResponse, { status: 500 })
    }

    // Assuming 'question' from DB matches the new 'Question' interface structure for the most part.
    // Rubric is stored as JSONB, Supabase typically returns it as an object.
    const response: APIResponse<Question> = { success: true, data: question as Question }
    return json(response)
  } catch (error: any) {
    console.error('Question generation error:', error)
    const errorResponse: APIResponse = { success: false, error: { message: error.message || 'Failed to generate question' } }
    return json(errorResponse, { status: 500 })
  }
}

export const GET: RequestHandler = async () => {
  try {
    const { data: questionsData, error } = await supabase
      .from('questions')
      .select('*')
      .or('archived.eq.false,archived.is.null')
      .order('created_at', { ascending: false })

    if (error) {
      // throw error // Keep original error handling for now
      const errorResponse: APIResponse = { success: false, error: { message: error.message || 'Failed to fetch questions from database' } }
      return json(errorResponse, { status: 500 })
    }

    // Explicitly cast to Question[] to align with APIResponse<Question[]>
    // This assumes that the structure of Tables<'java_questions'> is compatible with the new Question interface.
    // Specifically, the `rubric` field from the DB (JSONB) should be automatically parsed into an object by Supabase,
    // matching RubricStructure. If it's a string, parsing would be needed:
    // const questions = questionsData?.map(q => ({ ...q, rubric: typeof q.rubric === 'string' ? JSON.parse(q.rubric) : q.rubric })) || []
    const questions = questionsData as Question[] || []

    const response: APIResponse<Question[]> = { success: true, data: questions }
    return json(response)
  } catch (error: any) {
    console.error('Fetch questions error:', error)
    const errorResponse: APIResponse = { success: false, error: { message: error.message || 'Failed to fetch questions' } }
    return json(errorResponse, { status: 500 })
  }
}

export const DELETE: RequestHandler = async ({ request }) => {
  try {
    const body: ArchiveRequest = await request.json()
    const { questionId } = body
    
    if (!questionId) {
      const errorResponse: APIResponse = { success: false, error: { message: 'Question ID required' } }
      return json(errorResponse, { status: 400 })
    }

    // Archive the question instead of deleting
    const { error } = await supabase
      .from('questions')
      .update({ archived: true })
      .eq('id', questionId)

    if (error) {
      console.error('Archive question error:', error)
      // throw error // Keep original error handling
      const errorResponse: APIResponse = { success: false, error: { message: error.message || 'Failed to archive question in database' } }
      return json(errorResponse, { status: 500 })
    }

    const response: APIResponse = { success: true }
    return json(response)
  } catch (error: any) {
    console.error('Archive question error:', error)
    const errorResponse: APIResponse = { success: false, error: { message: error.message || 'Failed to archive question' } }
    return json(errorResponse, { status: 500 })
  }
}