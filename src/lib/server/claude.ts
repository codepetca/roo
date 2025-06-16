import Anthropic from '@anthropic-ai/sdk'
import { env } from '$env/dynamic/private'
import type { QuestionData, GradingResult, JavaConcept } from '$lib/types/index.js'

let _anthropic: Anthropic | null = null

export function getAnthropic(): Anthropic {
  if (_anthropic) return _anthropic

  const apiKey = env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error(`ANTHROPIC_API_KEY environment variable is required. Available: ${!!apiKey}`)
  }

  _anthropic = new Anthropic({ apiKey })
  return _anthropic
}

function countCodeLines(code: string): number {
  return code.trim().split('\n').filter(line => line.trim().length > 0).length
}

function validateSolutionLength(solution: any): boolean {
  if (!solution || !solution.code) return false
  const lineCount = countCodeLines(solution.code)
  console.log(`Solution has ${lineCount} lines`)
  return lineCount <= 12
}

export async function generateQuestion(concepts: JavaConcept[]): Promise<QuestionData> {
  const maxAttempts = 3
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Generating question for concepts: ${concepts.join(', ')} (attempt ${attempt}/${maxAttempts})`)
      
      const questionData = await generateQuestionAttempt(concepts, attempt)
      
      // Validate solution length
      if (validateSolutionLength(questionData.solution)) {
        console.log('✅ Question generated with valid solution length')
        return questionData
      } else {
        console.log(`❌ Solution too long (attempt ${attempt}), regenerating simpler version...`)
        if (attempt === maxAttempts) {
          console.log('⚠️ All attempts failed, using last generated question anyway')
          return questionData
        }
      }
    } catch (error) {
      console.error(`Question generation attempt ${attempt} failed:`, error)
      if (attempt === maxAttempts) {
        throw error
      }
    }
  }
  
  throw new Error('Failed to generate question after all attempts')
}

async function generateQuestionAttempt(concepts: JavaConcept[], attempt: number): Promise<QuestionData> {
  try {
    const simplificationLevel = attempt > 1 ? `\n\nSIMPLIFICATION LEVEL ${attempt}: Make this problem even simpler than usual. Use fewer variables, simpler logic, and more basic operations. Priority is fitting in 12 lines or less.` : ''
    
    const prompt = `Generate a Java coding question for high school students (grades 9-12) covering these concepts: ${concepts.join(', ')}. 

CRITICAL REQUIREMENTS:
- Format like CodingBat.com problems - focus on writing a single method
- Solution MUST be 12 lines or fewer (including method signature and closing brace)
- Method body should be 8-10 lines maximum to fit handwritten answer sheets
- Include method signature and clear description
- Focus on CodeHS Java Unit 1 fundamentals
- Appropriate difficulty for beginners
- Keep the problem simple enough that the solution fits in 12 lines total

SOLUTION LENGTH CONSTRAINT:
The solution you generate MUST fit within 12 lines when properly formatted. If a problem would require more than 12 lines, simplify it or choose a different approach. This is a hard constraint for answer sheet formatting.${simplificationLevel}

IMPORTANT: Format the question text using simple markdown syntax. Use backticks for inline code and **bold** for headers. Do NOT use code blocks (triple backticks). Keep it simple to avoid JSON parsing issues.

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
  "solution": {
    "code": "public boolean methodName(int param) {\\n    // Implementation here\\n    return result;\\n}",
    "explanation": "This method works by...",
    "keyPoints": ["Correct method signature", "Proper variable naming", "Handles logic correctly"]
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

export async function gradeCode(imageBase64: string, question: string, rubric: any): Promise<GradingResult> {
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