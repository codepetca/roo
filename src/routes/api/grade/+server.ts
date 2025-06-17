import { json, type RequestHandler } from '@sveltejs/kit'
import { supabase } from '$lib/server/supabase.js'
import { gradeCode } from '$lib/server/claude.js'
import type {
  APIResponse,
  APIError,
  ClaudeGradingResponse,
  RubricStructure,
  Submission // Assuming Submission is Tables<'java_submissions'>
} from '$lib/types/index.js'

// Define a type for the question data fetched from DB
interface DbQuestionData {
  question_text: string;
  rubric: RubricStructure | string; // Rubric from DB can be object or string
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData()
    const image = formData.get('image') as File
    const questionId = formData.get('questionId') as string
    const studentId = formData.get('studentId') as string
    const teacherId = formData.get('teacherId') as string

    if (!image || !questionId || !studentId || !teacherId) {
      const errorResponse: APIResponse = { success: false, error: { message: 'Missing required fields' } }
      return json(errorResponse, { status: 400 })
    }

    // Validate file type and size
    if (!image.type.startsWith('image/')) {
      const errorResponse: APIResponse = { success: false, error: { message: 'File must be an image' } }
      return json(errorResponse, { status: 400 })
    }
    
    if (image.size > 10 * 1024 * 1024) { // 10MB limit
      const errorResponse: APIResponse = { success: false, error: { message: 'Image too large (max 10MB)' } }
      return json(errorResponse, { status: 400 })
    }

    // Upload image to Supabase Storage
    const fileExt = image.name.split('.').pop() || 'jpg'
    const fileName = `${crypto.randomUUID()}.${fileExt}`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('java-submission-images')
      .upload(fileName, image, {
        contentType: image.type
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      const errorResponse: APIResponse = { success: false, error: { message: 'Failed to upload image', code: uploadError.name } }
      return json(errorResponse, { status: 500 })
    }

    // Get question details from java_questions table
    const { data: question, error: questionError } = await supabase
      .from('java_questions')
      .select('question_text, rubric')
      .eq('id', questionId)
      .single<DbQuestionData>() // Use the defined type

    if (questionError || !question) {
      const errorResponse: APIResponse = { success: false, error: { message: 'Question not found or error fetching it', code: questionError?.code } }
      return json(errorResponse, { status: 404 })
    }

    // Parse rubric if it's a string
    let rubricForClaude: RubricStructure;
    if (typeof question.rubric === 'string') {
      try {
        rubricForClaude = JSON.parse(question.rubric);
      } catch (parseError) {
        console.error('Rubric parse error:', parseError);
        const errorResponse: APIResponse = { success: false, error: { message: 'Failed to parse question rubric' } };
        return json(errorResponse, { status: 500 });
      }
    } else {
      rubricForClaude = question.rubric;
    }

    // Convert image to base64 for Claude
    const imageBuffer = await image.arrayBuffer()
    const imageBase64 = Buffer.from(imageBuffer).toString('base64')

    // Grade with Claude
    const gradingResult: ClaudeGradingResponse = await gradeCode(
      imageBase64, 
      question.question_text, 
      rubricForClaude // Pass the parsed/verified rubric
    )

    // Save submission to java_submissions table
    const { data: submissionRecord, error: submissionError } = await supabase
      .from('java_submissions')
      .insert({
        question_id: questionId,
        student_id: studentId,
        teacher_id: teacherId,
        image_url: uploadData.path,
        extracted_code: gradingResult.extractedCode,
        scores: gradingResult.scores,
        feedback: gradingResult.feedback,
        overall_score: gradingResult.overallScore,
        status: 'graded',
        graded_at: new Date().toISOString()
      })
      .select()
      .single<Submission>() // Specify the return type as Submission

    if (submissionError) {
      console.error('Submission error:', submissionError)
      const errorResponse: APIResponse = { success: false, error: { message: 'Failed to save submission', code: submissionError.code } }
      return json(errorResponse, { status: 500 })
    }

    // The submissionRecord should now contain all fields, including those from gradingResult
    const response: APIResponse<Submission> = { success: true, data: submissionRecord }
    return json(response)

  } catch (error: any) {
    console.error('Grading error:', error)
    let errorMessage = 'Grading failed';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    const errorResponse: APIResponse = { success: false, error: { message: errorMessage } }
    return json(errorResponse, { status: 500 })
  }
}