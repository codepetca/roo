import { json } from '@sveltejs/kit'
import { supabase } from '$lib/server/supabase.js'
import { getAnthropic } from '$lib/server/claude.js'

export async function GET({ params }) {
  try {
    const { id } = params
    
    if (!id) {
      return json({ error: 'Question ID required' }, { status: 400 })
    }

    // Get the question with stored solution
    const { data: question, error: fetchError } = await supabase
      .from('java_questions')
      .select('solution, question_text, java_concepts')
      .eq('id', id)
      .single()

    if (fetchError || !question) {
      return json({ error: 'Question not found' }, { status: 404 })
    }

    // If solution exists in database, return it
    if (question.solution) {
      return json({ solution: question.solution })
    }

    // Fallback: generate solution for older questions that don't have stored solutions
    const solution = await generateSolution(question.question_text, question.java_concepts)
    
    // Store the generated solution for future use
    await supabase
      .from('java_questions')
      .update({ solution })
      .eq('id', id)
    
    return json({ solution })
  } catch (error) {
    console.error('Solution retrieval error:', error)
    return json({ error: 'Failed to get solution' }, { status: 500 })
  }
}

async function generateSolution(questionText: string, concepts: string[]) {
  const prompt = `You are a Java programming teacher providing the expected solution for a coding question.

QUESTION:
${questionText}

CONCEPTS: ${concepts.join(', ')}

Please provide:
1. A complete, correct Java solution (just the method implementation)
2. A clear explanation of the approach
3. Key points that students should include for full marks

The solution should be:
- Appropriate for high school students (grades 9-12)
- Following Java best practices
- Well-commented and readable
- Using the concepts specified in the question

Return ONLY valid JSON in this exact format:
{
  "code": "public boolean methodName(int param) {\\n    // Implementation here\\n    return result;\\n}",
  "explanation": "This method works by... The key insight is...",
  "keyPoints": [
    "Correct method signature with proper return type",
    "Proper variable naming and code structure", 
    "Handles the logic correctly for all test cases",
    "Uses appropriate Java syntax and conventions"
  ]
}`

  console.log('Calling Claude API for solution generation...')
  const message = await getAnthropic().messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }]
  })

  console.log('Claude API response received for solution')
  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
  
  try {
    // First try to parse the response directly
    const parsedResponse = JSON.parse(responseText)
    console.log('Successfully parsed solution JSON')
    return parsedResponse
  } catch (firstError: any) {
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
      console.log('Successfully parsed cleaned solution JSON')
      return parsedResponse
    } catch (secondError: any) {
      console.error('Solution JSON parsing failed:', { 
        originalError: (firstError as Error).message, 
        cleanupError: secondError.message,
        jsonText: jsonText.substring(0, 500)
      })
      throw new Error(`Failed to parse solution JSON: ${secondError.message}`)
    }
  }
}