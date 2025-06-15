import { json } from '@sveltejs/kit'
import { supabase } from '$lib/server/supabase.js'
import { gradeCode } from '$lib/server/claude.js'

export async function POST({ request }) {
  try {
    const formData = await request.formData()
    const image = formData.get('image') as File
    const questionId = formData.get('questionId') as string
    const studentId = formData.get('studentId') as string
    const teacherId = formData.get('teacherId') as string

    if (!image || !questionId || !studentId || !teacherId) {
      return json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate file type and size
    if (!image.type.startsWith('image/')) {
      return json({ error: 'File must be an image' }, { status: 400 })
    }
    
    if (image.size > 10 * 1024 * 1024) { // 10MB limit
      return json({ error: 'Image too large (max 10MB)' }, { status: 400 })
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
      throw new Error('Failed to upload image')
    }

    // Get question details from java_questions table
    const { data: question, error: questionError } = await supabase
      .from('java_questions')
      .select('question_text, rubric')
      .eq('id', questionId)
      .single()

    if (questionError || !question) {
      throw new Error('Question not found')
    }

    // Convert image to base64 for Claude
    const imageBuffer = await image.arrayBuffer()
    const imageBase64 = Buffer.from(imageBuffer).toString('base64')

    // Grade with Claude
    const gradingResult = await gradeCode(
      imageBase64, 
      question.question_text, 
      question.rubric
    )

    // Save submission to java_submissions table
    const { data: submission, error: submissionError } = await supabase
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
      .single()

    if (submissionError) {
      console.error('Submission error:', submissionError)
      throw new Error('Failed to save submission')
    }

    return json({ 
      success: true, 
      submission: {
        ...submission,
        gradingResult
      }
    })
  } catch (error) {
    console.error('Grading error:', error)
    return json({ 
      error: error instanceof Error ? error.message : 'Grading failed' 
    }, { status: 500 })
  }
}