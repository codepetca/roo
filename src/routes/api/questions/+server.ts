import { json, type RequestHandler } from '@sveltejs/kit'
import { supabase } from '$lib/server/supabase.js'
import { generateQuestion } from '$lib/server/claude.js'
import type { QuestionGenerationRequest, QuestionResponse, QuestionsResponse, ArchiveRequest, ApiResponse } from '$lib/types/index.js'

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body: QuestionGenerationRequest = await request.json()
    const { concepts } = body
    
    if (!concepts || !Array.isArray(concepts)) {
      const response: ApiResponse = { error: 'Concepts array required' }
      return json(response, { status: 400 })
    }

    const questionData = await generateQuestion(concepts)
    
    // Insert into java_questions table
    const { data: question, error } = await supabase
      .from('java_questions')
      .insert({
        question_text: questionData.question,
        rubric: JSON.parse(JSON.stringify(questionData.rubric)),
        solution: JSON.parse(JSON.stringify(questionData.solution)),
        java_concepts: concepts,
        archived: false
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    const response: QuestionResponse = { question }
    return json(response)
  } catch (error) {
    console.error('Question generation error:', error)
    const response: ApiResponse = { error: 'Failed to generate question' }
    return json(response, { status: 500 })
  }
}

export const GET: RequestHandler = async () => {
  try {
    const { data: questions, error } = await supabase
      .from('java_questions')
      .select('*')
      .or('archived.eq.false,archived.is.null')
      .order('created_at', { ascending: false })

    if (error) throw error

    const response: QuestionsResponse = { questions }
    return json(response)
  } catch (error) {
    console.error('Fetch questions error:', error)
    const response: ApiResponse = { error: 'Failed to fetch questions' }
    return json(response, { status: 500 })
  }
}

export const DELETE: RequestHandler = async ({ request }) => {
  try {
    const body: ArchiveRequest = await request.json()
    const { questionId } = body
    
    if (!questionId) {
      const response: ApiResponse = { error: 'Question ID required' }
      return json(response, { status: 400 })
    }

    // Archive the question instead of deleting
    const { error } = await supabase
      .from('java_questions')
      .update({ archived: true })
      .eq('id', questionId)

    if (error) {
      console.error('Archive question error:', error)
      throw error
    }

    const response: ApiResponse = { success: true }
    return json(response)
  } catch (error) {
    console.error('Archive question error:', error)
    const response: ApiResponse = { error: 'Failed to archive question' }
    return json(response, { status: 500 })
  }
}