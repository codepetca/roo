import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types.js'
import { supabase } from '$lib/server/supabase.js'
import { gradeCode } from '$lib/server/claude.js'

export const POST: RequestHandler = async ({ params, request }) => {
  try {
    const { testId } = params
    const { attemptIds } = await request.json()

    if (!attemptIds || !Array.isArray(attemptIds) || attemptIds.length === 0) {
      return json({ error: 'Attempt IDs are required' }, { status: 400 })
    }

    // Get all submitted attempts for this test
    const { data: attempts, error: attemptsError } = await supabase
      .from('test_attempts')
      .select('*')
      .eq('test_id', testId)
      .in('id', attemptIds)
      .eq('status', 'submitted')

    if (attemptsError || !attempts || attempts.length === 0) {
      return json({ error: 'No submitted attempts found' }, { status: 404 })
    }

    const results = []
    let gradedCount = 0
    let failedCount = 0

    // Process each attempt
    for (const attempt of attempts) {
      try {
        // Get all answers for this attempt
        const { data: answers, error: answersError } = await supabase
          .from('test_answers')
          .select(`
            *,
            java_questions (
              question_text,
              rubric
            )
          `)
          .eq('attempt_id', attempt.id)

        if (answersError || !answers) {
          results.push({
            attemptId: attempt.id,
            success: false,
            error: 'Failed to fetch answers'
          })
          failedCount++
          continue
        }

        let totalScore = 0
        let totalWeight = 0
        const gradedAnswers = []

        // Grade each answer
        for (const answer of answers) {
          if (!answer.answer_code || !answer.java_questions) {
            gradedAnswers.push({
              answerId: answer.id,
              questionId: answer.question_id,
              scores: { communication: 1, correctness: 1, logic: 1 },
              feedback: {
                communication: 'No code provided',
                correctness: 'No code provided',
                logic: 'No code provided'
              },
              questionScore: 1.0
            })
            totalScore += 1.0
            totalWeight += 1.0
            continue
          }

          try {
            // Convert code to base64 for grading (simulated image)
            const codeImage = Buffer.from(answer.answer_code).toString('base64')
            
            const gradingResult = await gradeCode(
              codeImage,
              answer.java_questions.question_text,
              answer.java_questions.rubric
            )

            // Calculate weighted score based on rubric
            const rubric = answer.java_questions.rubric as any
            let questionScore = 0
            let questionWeight = 0

            for (const [category, details] of Object.entries(rubric)) {
              const categoryDetails = details as any
              const score = gradingResult.scores[category] || 1
              const weight = categoryDetails.weight || 0.25
              questionScore += score * weight
              questionWeight += weight
            }

            const finalQuestionScore = questionWeight > 0 ? questionScore / questionWeight : 1.0

            // Save grading results
            await supabase
              .from('test_answers')
              .update({
                scores: gradingResult.scores,
                feedback: gradingResult.feedback,
                question_score: finalQuestionScore,
                graded_at: new Date().toISOString()
              })
              .eq('id', answer.id)

            gradedAnswers.push({
              answerId: answer.id,
              questionId: answer.question_id,
              scores: gradingResult.scores,
              feedback: gradingResult.feedback,
              questionScore: finalQuestionScore
            })

            totalScore += finalQuestionScore
            totalWeight += 1.0

          } catch (gradeError) {
            console.error('Error grading answer:', gradeError)
            gradedAnswers.push({
              answerId: answer.id,
              questionId: answer.question_id,
              scores: { communication: 1, correctness: 1, logic: 1 },
              feedback: {
                communication: 'Grading failed',
                correctness: 'Grading failed', 
                logic: 'Grading failed'
              },
              questionScore: 1.0
            })
            totalScore += 1.0
            totalWeight += 1.0
          }
        }

        // Calculate final total score
        const finalTotalScore = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0

        // Update attempt with total score and graded status
        await supabase
          .from('test_attempts')
          .update({
            status: 'graded',
            total_score: finalTotalScore
          })
          .eq('id', attempt.id)

        results.push({
          attemptId: attempt.id,
          success: true,
          totalScore: finalTotalScore,
          answers: gradedAnswers
        })

        gradedCount++

      } catch (error) {
        console.error(`Error grading attempt ${attempt.id}:`, error)
        results.push({
          attemptId: attempt.id,
          success: false,
          error: error instanceof Error ? error.message : 'Grading failed'
        })
        failedCount++
      }
    }

    return json({
      success: true,
      testId,
      gradedCount,
      failedCount,
      results
    })

  } catch (error) {
    console.error('Bulk grading error:', error)
    return json({ 
      error: error instanceof Error ? error.message : 'Failed to grade submissions' 
    }, { status: 500 })
  }
}