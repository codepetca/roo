/**
 * Gemini AI Service for AppScript
 * Direct integration with Google's Gemini API for AI grading
 * Designed to be easily replaceable with Firebase Functions later
 */

// Configuration loaded lazily to avoid initialization issues
function getGeminiAIConfig() {
  return getGeminiConfig();
}

/**
 * Gemini AI Service - Main interface for AI grading
 */
const GeminiAI = {
  
  /**
   * Grade a submission using AI
   * @param {Object} gradingContext - Complete grading context matching aiGradingContextSchema
   * @returns {Object} Grading result matching aiGradingResponseSchema
   */
  async gradeSubmission(gradingContext) {
    debugLog('GeminiAI', '🤖 Starting AI grading', `Request ID: ${gradingContext.requestId}`);
    
    try {
      const startTime = Date.now();
      
      // Check if API key is configured
      const config = getGeminiAIConfig();
      if (!config.isConfigured) {
        throw new Error(`Gemini API not configured: ${config.validationMessage}`);
      }
      
      // Validate grading context
      if (!gradingContext || !gradingContext.assignment || !gradingContext.submission || !gradingContext.criteria) {
        throw new Error('Invalid grading context - missing required fields');
      }
      
      // Prepare the prompt based on grading criteria type
      const prompt = this.buildGradingPrompt(gradingContext);
      
      // Call Gemini API
      const geminiResponse = await this.callGeminiAPI(prompt, gradingContext.gradingOptions);
      
      // Process and structure the response
      const gradingResult = this.processGeminiResponse(
        geminiResponse, 
        gradingContext,
        Date.now() - startTime
      );
      
      debugLog('GeminiAI', '✅ AI grading completed', `Score: ${gradingResult.grade.score}/${gradingResult.grade.maxScore}`);
      
      return gradingResult;
      
    } catch (error) {
      debugLog('GeminiAI', '❌ AI grading failed', error.toString());
      
      return {
        requestId: gradingContext.requestId,
        grade: {
          score: 0,
          maxScore: gradingContext.assignment.maxScore || 100,
          percentage: 0
        },
        feedback: {
          summary: 'AI grading failed. Please grade manually.',
          strengths: [],
          improvements: ['Technical error occurred during grading']
        },
        metadata: {
          model: config.MODEL,
          confidence: 0,
          processingTime: 0,
          needsReview: true,
          reviewReason: `AI grading error: ${error.toString()}`,
          gradedAt: new Date().toISOString()
        }
      };
    }
  },
  
  /**
   * Build grading prompt based on assignment type and criteria
   */
  buildGradingPrompt(context) {
    const { assignment, criteria, submission, gradingOptions } = context;
    
    let prompt = `You are an expert teacher grading student work. Please provide fair, constructive feedback.\n\n`;
    
    // Assignment context
    prompt += `## Assignment Details\n`;
    prompt += `**Title:** ${assignment.title}\n`;
    prompt += `**Description:** ${assignment.description}\n`;
    prompt += `**Type:** ${assignment.type}\n`;
    prompt += `**Max Score:** ${assignment.maxScore}\n\n`;
    
    // Add materials if available
    if (assignment.materials && assignment.materials.length > 0) {
      prompt += `**Assignment Materials:**\n`;
      assignment.materials.forEach(material => {
        prompt += `- ${material.title}: ${material.url || material.content || 'See attachment'}\n`;
      });
      prompt += `\n`;
    }
    
    // Grading criteria
    prompt += `## Grading Criteria\n`;
    
    if (criteria.type === 'rubric') {
      prompt += `**Rubric-based grading:**\n`;
      criteria.rubric.criteria.forEach(criterion => {
        prompt += `\n**${criterion.title}** (${criterion.description})\n`;
        criterion.levels.forEach(level => {
          prompt += `- ${level.title} (${level.points} pts): ${level.description}\n`;
        });
      });
      
    } else if (criteria.type === 'quiz') {
      prompt += `**Quiz grading with answer key:**\n`;
      criteria.questions.forEach((question, index) => {
        prompt += `\n**Question ${index + 1}:** ${question.title}\n`;
        if (question.correctAnswers) {
          prompt += `**Correct Answer(s):** ${question.correctAnswers.join(', ')}\n`;
        }
        if (question.sampleSolution) {
          prompt += `**Sample Solution:** ${question.sampleSolution}\n`;
        }
        prompt += `**Points:** ${question.points}\n`;
      });
      
    } else if (criteria.type === 'points') {
      prompt += `**Point-based grading:**\n`;
      prompt += `**Max Points:** ${criteria.maxPoints}\n`;
      prompt += `**Instructions:** ${criteria.gradingInstructions}\n`;
      if (criteria.keyPoints) {
        prompt += `**Key Points to Look For:**\n`;
        criteria.keyPoints.forEach(point => {
          prompt += `- ${point}\n`;
        });
      }
      
    } else if (criteria.type === 'completion') {
      prompt += `**Completion-based grading:**\n`;
      prompt += `**Requirements:**\n`;
      criteria.requirements.forEach(req => {
        prompt += `- ${req}\n`;
      });
    }
    
    // Add grading instructions
    if (criteria.gradingInstructions) {
      prompt += `\n**Additional Grading Instructions:** ${criteria.gradingInstructions}\n`;
    }
    
    // Student submission
    prompt += `\n## Student Submission\n`;
    prompt += `**Student:** ${submission.studentName}\n`;
    
    if (submission.text) {
      prompt += `**Written Response:**\n${submission.text}\n\n`;
    }
    
    if (submission.quizAnswers) {
      prompt += `**Quiz Responses:**\n`;
      submission.quizAnswers.forEach((answer, index) => {
        prompt += `**Q${index + 1}:** ${answer.questionText}\n`;
        prompt += `**Student Answer:** ${Array.isArray(answer.answer) ? answer.answer.join(', ') : answer.answer}\n\n`;
      });
    }
    
    if (submission.sections && submission.sections.length > 0) {
      prompt += `**Document Sections:**\n`;
      submission.sections.forEach(section => {
        if (section.title) prompt += `**${section.title}**\n`;
        prompt += `${section.content}\n\n`;
      });
    }
    
    if (submission.attachmentCount > 0) {
      prompt += `**Attachments:** ${submission.attachmentCount} file(s) submitted\n`;
    }
    
    // Grading preferences
    const strictness = gradingOptions?.strictness || 'moderate';
    const feedbackStyle = gradingOptions?.feedbackStyle || 'constructive';
    
    prompt += `\n## Grading Instructions\n`;
    prompt += `**Grading Strictness:** ${strictness} (lenient = generous, moderate = balanced, strict = demanding)\n`;
    prompt += `**Feedback Style:** ${feedbackStyle}\n`;
    
    if (gradingOptions?.focusAreas) {
      prompt += `**Focus Areas:** ${gradingOptions.focusAreas.join(', ')}\n`;
    }
    
    // Response format
    prompt += `\n## Required Response Format\n`;
    prompt += `Please respond with a JSON object containing:\n`;
    prompt += `{\n`;
    prompt += `  "score": <numeric score>,\n`;
    prompt += `  "maxScore": <maximum possible score>,\n`;
    prompt += `  "percentage": <score as percentage>,\n`;
    prompt += `  "feedback": {\n`;
    prompt += `    "summary": "<overall feedback summary>",\n`;
    prompt += `    "strengths": ["<strength 1>", "<strength 2>"],\n`;
    prompt += `    "improvements": ["<improvement 1>", "<improvement 2>"],\n`;
    prompt += `    "suggestions": ["<suggestion 1>", "<suggestion 2>"]\n`;
    prompt += `  },\n`;
    prompt += `  "confidence": <confidence level 0-1>\n`;
    prompt += `}\n\n`;
    
    prompt += `Please be encouraging while providing honest assessment. Focus on specific, actionable feedback.`;
    
    return prompt;
  },
  
  /**
   * Call Gemini API with retry logic
   */
  async callGeminiAPI(prompt, options = {}) {
    const config = getGeminiAIConfig();
    const model = options?.model || config.MODEL;
    const temperature = options?.temperature || 0.3;
    const maxTokens = options?.maxTokens || 2000;
    
    const url = `${config.API_URL}${model}:generateContent?key=${config.API_KEY}`;
    
    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: temperature,
        maxOutputTokens: maxTokens,
        responseMimeType: "application/json"
      }
    };
    
    let lastError = null;
    
    for (let attempt = 1; attempt <= config.MAX_RETRIES; attempt++) {
      try {
        debugLog('GeminiAI', `🌟 Calling Gemini API (attempt ${attempt}/${config.MAX_RETRIES})`);
        
        const response = UrlFetchApp.fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          payload: JSON.stringify(requestBody),
          muteHttpExceptions: true
        });
        
        const responseCode = response.getResponseCode();
        const responseText = response.getContentText();
        
        if (responseCode === 200) {
          const data = JSON.parse(responseText);
          
          if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const generatedText = data.candidates[0].content.parts[0].text;
            debugLog('GeminiAI', '✅ Gemini API response received');
            return {
              text: generatedText,
              model: model,
              usage: data.usageMetadata || {}
            };
          } else {
            throw new Error('No valid response from Gemini API');
          }
        } else {
          throw new Error(`Gemini API error: ${responseCode} - ${responseText}`);
        }
        
      } catch (error) {
        lastError = error;
        debugLog('GeminiAI', `❌ Attempt ${attempt} failed`, error.toString());
        
        if (attempt < config.MAX_RETRIES) {
          debugLog('GeminiAI', `⏳ Retrying in ${config.RETRY_DELAY}ms`);
          Utilities.sleep(config.RETRY_DELAY);
        }
      }
    }
    
    throw new Error(`Gemini API failed after ${config.MAX_RETRIES} attempts: ${lastError?.toString()}`);
  },
  
  /**
   * Process and validate Gemini response
   */
  processGeminiResponse(geminiResponse, context, processingTime) {
    try {
      // Parse the JSON response
      const aiResult = JSON.parse(geminiResponse.text);
      
      // Validate required fields
      if (typeof aiResult.score !== 'number' || typeof aiResult.maxScore !== 'number') {
        throw new Error('Invalid AI response: missing or invalid score fields');
      }
      
      // Ensure score is within bounds
      const score = Math.max(0, Math.min(aiResult.score, aiResult.maxScore));
      const percentage = aiResult.maxScore > 0 ? (score / aiResult.maxScore) * 100 : 0;
      
      // Build structured response
      const gradingResult = {
        requestId: context.requestId,
        grade: {
          score: score,
          maxScore: aiResult.maxScore,
          percentage: Math.round(percentage * 100) / 100
        },
        feedback: {
          summary: aiResult.feedback?.summary || 'AI grading completed.',
          strengths: Array.isArray(aiResult.feedback?.strengths) ? aiResult.feedback.strengths : [],
          improvements: Array.isArray(aiResult.feedback?.improvements) ? aiResult.feedback.improvements : [],
          suggestions: Array.isArray(aiResult.feedback?.suggestions) ? aiResult.feedback.suggestions : []
        },
        metadata: {
          model: geminiResponse.model || getGeminiAIConfig().MODEL,
          confidence: Math.max(0, Math.min(aiResult.confidence || 0.8, 1)),
          processingTime: processingTime,
          tokenUsage: geminiResponse.usage,
          needsReview: (aiResult.confidence || 0.8) < 0.7, // Flag low confidence for review
          reviewReason: (aiResult.confidence || 0.8) < 0.7 ? 'Low AI confidence score' : undefined,
          gradedAt: new Date().toISOString()
        }
      };
      
      return gradingResult;
      
    } catch (error) {
      debugLog('GeminiAI', '❌ Failed to process Gemini response', error.toString());
      
      // Return fallback response
      return {
        requestId: context.requestId,
        grade: {
          score: 0,
          maxScore: context.assignment.maxScore || 100,
          percentage: 0
        },
        feedback: {
          summary: 'AI response processing failed. Please grade manually.',
          strengths: [],
          improvements: ['AI response could not be processed']
        },
        metadata: {
          model: config.MODEL,
          confidence: 0,
          processingTime: processingTime,
          needsReview: true,
          reviewReason: `Response processing error: ${error.toString()}`,
          gradedAt: new Date().toISOString()
        }
      };
    }
  }
};

/**
 * Debug logging for Gemini AI
 */
function debugLog(component, message, details) {
  if (getAppConfig().DEBUG_ENABLED) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`[${timestamp}] [${component}] ${message}${details ? ': ' + details : ''}`);
  }
}