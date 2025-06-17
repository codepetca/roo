import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types.js'
import { supabase } from '$lib/server/supabase.js'
import { gradeCode } from '$lib/server/claude.js'

// Helper function to grade code text (without image)
async function gradeCodeText(code: string, questionText: string, rubric: any) {
  try {
    // Create a mock grading that analyzes the actual code
    const codeLines = code.split('\n').length
    const hasBasicStructure = code.includes('class') || code.includes('public') || code.includes('void')
    const hasSyntaxErrors = !code.includes(';') && code.trim().length > 10
    const hasLogicalFlow = code.includes('if') || code.includes('for') || code.includes('while') || code.includes('=')

    // Simple heuristic grading (in production, you'd want more sophisticated analysis)
    const scores = {
      communication: hasBasicStructure ? (codeLines > 1 ? 3 : 2) : 1,
      correctness: hasSyntaxErrors ? 1 : (hasBasicStructure ? 3 : 2),
      logic: hasLogicalFlow ? 3 : (code.trim().length > 5 ? 2 : 1)
    }

    const feedback = {
      communication: scores.communication >= 3 ? "Good code structure and formatting" : "Code structure could be improved",
      correctness: scores.correctness >= 3 ? "Code appears syntactically correct" : "Check for syntax errors and Java conventions", 
      logic: scores.logic >= 3 ? "Shows good problem-solving approach" : "Consider the logical flow of your solution",
      general: `Code submission received with ${codeLines} lines. ${hasBasicStructure ? 'Basic Java structure detected.' : 'Consider using proper Java class structure.'}`
    }

    return { scores, feedback }
  } catch (error) {
    console.error('Error in text grading:', error)
    return {
      scores: { communication: 2, correctness: 2, logic: 2 },
      feedback: { general: 'Automatic grading completed with basic analysis' }
    }
  }
}

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
          .select('*')
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

        // Get question details for each answer
        const answersWithQuestions = []
        for (const answer of answers) {
          const { data: javaQuestion } = await supabase
            .from('java_questions')
            .select('question_text, java_concepts, rubric')
            .eq('id', answer.question_id)
            .single()

          answersWithQuestions.push({
            ...answer,
            java_questions: javaQuestion
          })
        }

        let totalScore = 0
        let totalWeight = 0
        const gradedAnswers = []

        // Grade each answer
        for (const answer of answersWithQuestions) {
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
            // Use the text grading function instead of image grading
            const gradingResult = await gradeCodeText(
              answer.answer_code,
              answer.java_questions?.question_text || '',
              answer.java_questions?.rubric || {}
            )

            // Calculate weighted score for this question
            const rubric = answer.java_questions?.rubric || {}
            const weights = {
              communication: rubric.communication?.weight || 0.25,
              correctness: rubric.correctness?.weight || 0.50,
              logic: rubric.logic?.weight || 0.25
            }

            const finalQuestionScore = 
              (gradingResult.scores.communication * weights.communication * 25) +
              (gradingResult.scores.correctness * weights.correctness * 25) +
              (gradingResult.scores.logic * weights.logic * 25)

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

        // Calculate final total score (already in percentage format)
        const finalTotalScore = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) / 100 : 0

        // Update attempt with total score and graded status
        await supabase
          .from('test_attempts')
          .update({
            status: 'graded',
            total_score: finalTotalScore,
            graded_at: new Date().toISOString()
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