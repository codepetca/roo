import Anthropic from '@anthropic-ai/sdk'
import { env } from '$env/dynamic/private'

let _anthropic: Anthropic | null = null

export function getAnthropic() {
  if (_anthropic) return _anthropic

  const apiKey = env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error(`ANTHROPIC_API_KEY environment variable is required. Available: ${!!apiKey}`)
  }

  _anthropic = new Anthropic({ apiKey })
  return _anthropic
}

export async function generateQuestion(concepts: string[]) {
  try {
    console.log('Generating question for concepts:', concepts)
    
    const prompt = `Generate a Java coding question for high school students (grades 9-12) covering these concepts: ${concepts.join(', ')}. 

Requirements:
- Format like CodingBat.com problems - focus on writing a single method
- Method should be 5-10 lines of handwritten code  
- Include method signature and clear description
- Focus on CodeHS Java Unit 1 fundamentals
- Appropriate difficulty for beginners

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
  "concepts": ["variables", "loops", "conditionals"]
}`

    console.log('Calling Claude API...')
    const message = await getAnthropic().messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    })

    console.log('Claude API response received')
    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    console.log('Raw response:', responseText.substring(0, 200) + '...')
    
    try {
      // First try to parse the response directly
      const parsedResponse = JSON.parse(responseText)
      console.log('Successfully parsed JSON response')
      return parsedResponse
    } catch (firstError) {
      console.log('Direct JSON parse failed, attempting cleanup...')
      
      // Find JSON content between curly braces
      const jsonStart = responseText.indexOf('{')
      const jsonEnd = responseText.lastIndexOf('}') + 1
      
      if (jsonStart === -1 || jsonEnd === 0) {
        throw new Error('No valid JSON found in response')
      }
      
      const jsonText = responseText.substring(jsonStart, jsonEnd)
      console.log('Extracted JSON:', jsonText.substring(0, 200) + '...')
      
      try {
        // Clean up the JSON by properly escaping newlines and other control characters
        const cleanedJsonText = jsonText
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\t/g, '\\t')
        
        console.log('Cleaned JSON:', cleanedJsonText.substring(0, 200) + '...')
        
        const parsedResponse = JSON.parse(cleanedJsonText)
        console.log('Successfully parsed cleaned JSON response')
        return parsedResponse
      } catch (secondError) {
        console.error('JSON parsing failed:', { 
          originalError: firstError.message, 
          cleanupError: secondError.message,
          jsonText: jsonText.substring(0, 500)
        })
        throw new Error(`Failed to parse JSON: ${secondError.message}`)
      }
    }
  } catch (error) {
    console.error('Question generation error details:', {
      message: error.message,
      stack: error.stack,
      concepts
    })
    throw new Error(`Failed to generate question: ${error.message}`)
  }
}

export async function gradeCode(imageBase64: string, question: string, rubric: any) {
  try {
    const prompt = `You are grading handwritten Java code for a high school student.

QUESTION: ${question}

RUBRIC: ${JSON.stringify(rubric, null, 2)}

TASK:
1. Extract the handwritten Java code from the image as accurately as possible
2. Grade each rubric category on a scale of 1-4 (4=excellent, 3=good, 2=fair, 1=poor)
3. Provide specific, constructive feedback for each category
4. Calculate overall score as weighted average

Return ONLY valid JSON in this exact format:
{
  "extractedCode": "// The actual code you can read from the image",
  "scores": {
    "communication": 3,
    "correctness": 2, 
    "logic": 4
  },
  "feedback": {
    "communication": "Specific feedback about formatting and clarity",
    "correctness": "Specific feedback about syntax and Java conventions",
    "logic": "Specific feedback about problem-solving approach"
  },
  "overallScore": 2.75,
  "generalComments": "Overall encouraging feedback for the student"
}`

    const message = await getAnthropic().messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { 
            type: 'image', 
            source: { 
              type: 'base64', 
              media_type: 'image/jpeg', 
              data: imageBase64 
            } 
          }
        ]
      }]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    return JSON.parse(responseText)
  } catch (error) {
    console.error('Grading error:', error)
    throw new Error('Failed to grade submission')
  }
}