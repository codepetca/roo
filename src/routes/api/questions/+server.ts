import { json } from '@sveltejs/kit'
import { supabase } from '$lib/server/supabase.js'
import { generateQuestion } from '$lib/server/claude.js'

export async function POST({ request }) {
  try {
    const { concepts } = await request.json()
    
    if (!concepts || !Array.isArray(concepts)) {
      return json({ error: 'Concepts array required' }, { status: 400 })
    }

    const questionData = await generateQuestion(concepts)
    
    // Insert into java_questions table
    const { data: question, error } = await supabase
      .from('java_questions')
      .insert({
        question_text: questionData.question,
        rubric: questionData.rubric,
        java_concepts: concepts
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    return json({ question })
  } catch (error) {
    console.error('Question generation error:', error)
    return json({ error: 'Failed to generate question' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { data: questions, error } = await supabase
      .from('java_questions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return json({ questions })
  } catch (error) {
    console.error('Fetch questions error:', error)
    return json({ error: 'Failed to fetch questions' }, { status: 500 })
  }
}