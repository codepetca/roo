import { json, type RequestHandler } from '@sveltejs/kit'
import { supabase } from '$lib/server/supabase.js'
import { generateQuestion } from '$lib/server/claude.js'
import type { QuestionModificationRequest, QuestionResponse, ApiResponse } from '$lib/types/index.js'

export const POST: RequestHandler = async ({ params, request }) => {
  try {
    const { id } = params
    const body: QuestionModificationRequest = await request.json()
    const { modificationPrompt } = body
    
    if (!id || !modificationPrompt) {
      const response: ApiResponse = { error: 'Question ID and modification prompt required' }
      return json(response, { status: 400 })
    }

    // Get the original question
    const { data: originalQuestion, error: fetchError } = await supabase
      .from('questions')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !originalQuestion) {
      const response: ApiResponse = { error: 'Original question not found' }
      return json(response, { status: 404 })
    }

    // Generate modified question using AI
    const modifiedQuestionData = await generateModifiedQuestion(
      originalQuestion.question_text,
      originalQuestion.concepts,
      modificationPrompt
    )
    
    // Create a new question entry
    const { data: newQuestion, error: createError } = await supabase
      .from('questions')
      .insert({
        question_text: modifiedQuestionData.question,
        rubric: modifiedQuestionData.rubric,
        concepts: originalQuestion.concepts,
        created_by: originalQuestion.created_by
      })
      .select()
      .single()

    if (createError) {
      console.error('Database error creating modified question:', createError)
      throw createError
    }

    const response: QuestionResponse = { question: newQuestion }
    return json(response)
  } catch (error) {
    console.error('Question modification error:', error)
    const response: ApiResponse = { error: 'Failed to modify question' }
    return json(response, { status: 500 })
  }
}

async function generateModifiedQuestion(originalQuestion: string, concepts: string[], modificationPrompt: string): Promise<any> {
  const { getAnthropic } = await import('$lib/server/claude.js')
  
  const prompt = `You are modifying an existing Java coding question based on teacher feedback.

ORIGINAL QUESTION:
${originalQuestion}

TEACHER'S MODIFICATION REQUEST:
${modificationPrompt}

CONCEPTS TO MAINTAIN: ${concepts.join(', ')}

Please generate a modified version of the question that incorporates the teacher's feedback while maintaining the same Java concepts.

IMPORTANT: Format the question text using simple markdown syntax. Use backticks for inline code and **bold** for headers. Do NOT use code blocks (\`\`\`). Keep it simple to avoid JSON parsing issues.

Example format:
Write a method called \`methodName\` that does something. The method should handle specific requirements.

**Method signature:** 
\`public returnType methodName(parameters)\`

**Examples:**
- \`methodName(input1)\` returns \`output1\`
- \`methodName(input2)\` returns \`output2\`

Create a detailed grading rubric with exactly these categories:
- Communication (25%): code formatting, indentation, clarity, readability
- Correctness (50%): syntax accuracy, compiles without errors, follows Java conventions  
- Logic (25%): problem-solving approach, algorithm correctness

Return ONLY valid JSON in this exact format (use simple markdown with line breaks):
{
  "question": "Write a method called \`methodName\` that does something.\\n\\n**Method signature:**\\n\`public boolean methodName(int param)\`\\n\\n**Examples:**\\n- \`methodName(5)\` returns \`true\`",
  "rubric": {
    "communication": {
      "description": "Code formatting and clarity",
      "weight": 0.25,
      "criteria": ["proper indentation", "clear variable names", "readable structure"]
    },
    "correctness": {
      "description": "Syntax and Java conventions", 
      "weight": 0.50,
      "criteria": ["correct syntax", "proper method structure", "follows Java naming"]
    },
    "logic": {
      "description": "Problem-solving approach",
      "weight": 0.25, 
      "criteria": ["solves the problem", "efficient approach", "handles edge cases"]
    }
  },
  "concepts": ${JSON.stringify(concepts)}
}`

  console.log('Calling Claude API for question modification...')
  const message = await getAnthropic().messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }]
  })

  console.log('Claude API response received for modification')
  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
  
  try {
    // First try to parse the response directly
    const parsedResponse = JSON.parse(responseText)
    console.log('Successfully parsed modified question JSON')
    return parsedResponse
  } catch (firstError: unknown) {
    console.log('Direct JSON parse failed, attempting cleanup...')
    
    // Find JSON content between curly braces
    const jsonStart = responseText.indexOf('{')
    const jsonEnd = responseText.lastIndexOf('}') + 1
    
    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error('No valid JSON found in response')
    }
    
    const jsonText = responseText.substring(jsonStart, jsonEnd)
    
    try {
      // Clean up the JSON by properly escaping newlines and other control characters
      const cleanedJsonText = jsonText
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')
      
      const parsedResponse = JSON.parse(cleanedJsonText)
      console.log('Successfully parsed cleaned modified question JSON')
      return parsedResponse
    } catch (secondError: unknown) {
      const firstErrorMessage = firstError instanceof Error ? firstError.message : 'Unknown error'
      const secondErrorMessage = secondError instanceof Error ? secondError.message : 'Unknown error'
      
      console.error('Modified question JSON parsing failed:', { 
        originalError: firstErrorMessage, 
        cleanupError: secondErrorMessage,
        jsonText: jsonText.substring(0, 500)
      })
      throw new Error(`Failed to parse modified question JSON: ${secondErrorMessage}`)
    }
  }
}