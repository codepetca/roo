/**
 * AI Grading API Abstraction Layer
 * Provides a consistent interface for AI grading that can be backed by
 * either AppScript (current) or Firebase Functions (future)
 */

// Configuration loaded lazily to avoid initialization issues
function getAIGradingConfig() {
  return {
    PROVIDER: 'appscript', // 'appscript' or 'firebase-functions'
    FIREBASE_FUNCTIONS_URL: getAppConfig().FIREBASE.FUNCTIONS_URL + '/ai',
    TIMEOUT_MS: 30000, // 30 seconds
    DEBUG: getAppConfig().DEBUG_ENABLED
  };
}

/**
 * AI Grading API - Main interface for all AI grading operations
 * This abstraction allows switching between AppScript and Firebase Functions
 */
const AIGradingAPI = {
  
  /**
   * Grade a single submission with AI
   * @param {Object} gradingContext - Complete grading context
   * @returns {Promise<Object>} Grading result
   */
  async gradeSubmission(gradingContext) {
    const config = getAIGradingConfig();
    this.debugLog('🤖 Starting AI grading request', `Provider: ${config.PROVIDER}`);
    
    try {
      // Validate input
      if (!gradingContext) {
        throw new Error('Grading context is required');
      }
      
      // Add request metadata
      gradingContext.requestId = gradingContext.requestId || this.generateRequestId();
      gradingContext.metadata = gradingContext.metadata || this.createRequestMetadata();
      
      let result;
      
      // Route to appropriate provider
      switch (config.PROVIDER) {
        case 'appscript':
          result = await this.gradeWithAppScript(gradingContext);
          break;
          
        case 'firebase-functions':
          result = await this.gradeWithFirebaseFunctions(gradingContext);
          break;
          
        default:
          throw new Error(`Unknown AI grading provider: ${config.PROVIDER}`);
      }
      
      // Validate and enhance result
      result = this.validateGradingResult(result, gradingContext);
      
      this.debugLog('✅ AI grading completed', `Score: ${result.grade.score}/${result.grade.maxScore}`);
      return result;
      
    } catch (error) {
      this.debugLog('❌ AI grading failed', error.toString());
      return this.createErrorResult(gradingContext, error);
    }
  },
  
  /**
   * Grade multiple submissions in batch
   * @param {Array<Object>} gradingContexts - Array of grading contexts
   * @returns {Promise<Object>} Batch grading results
   */
  async batchGradeSubmissions(gradingContexts) {
    this.debugLog('📦 Starting batch AI grading', `Count: ${gradingContexts.length}`);
    
    try {
      const batchId = this.generateBatchId();
      const results = {
        batchId: batchId,
        successful: 0,
        failed: 0,
        results: [],
        totalTime: 0,
        startedAt: new Date().toISOString()
      };
      
      const startTime = Date.now();
      
      // Process submissions (sequential for AppScript, parallel for Firebase Functions)
      const config = getAIGradingConfig();
      if (config.PROVIDER === 'appscript') {
        // Sequential processing for AppScript to avoid rate limits
        for (let i = 0; i < gradingContexts.length; i++) {
          const context = gradingContexts[i];
          context.metadata = context.metadata || {};
          context.metadata.batchId = batchId;
          context.metadata.itemIndex = i;
          
          try {
            const result = await this.gradeSubmission(context);
            results.results.push(result);
            
            if (result.metadata && !result.metadata.needsReview) {
              results.successful++;
            } else {
              results.failed++;
            }
            
            // Small delay between requests to be respectful
            if (i < gradingContexts.length - 1) {
              Utilities.sleep(1000); // 1 second delay
            }
            
          } catch (error) {
            results.results.push(this.createErrorResult(context, error));
            results.failed++;
          }
        }
        
      } else {
        // Parallel processing for Firebase Functions
        const promises = gradingContexts.map((context, index) => {
          context.metadata = context.metadata || {};
          context.metadata.batchId = batchId;
          context.metadata.itemIndex = index;
          return this.gradeSubmission(context);
        });
        
        const batchResults = await Promise.allSettled(promises);
        
        batchResults.forEach(result => {
          if (result.status === 'fulfilled') {
            results.results.push(result.value);
            if (!result.value.metadata?.needsReview) {
              results.successful++;
            } else {
              results.failed++;
            }
          } else {
            results.results.push(this.createErrorResult(null, result.reason));
            results.failed++;
          }
        });
      }
      
      results.totalTime = Date.now() - startTime;
      results.completedAt = new Date().toISOString();
      
      this.debugLog('📦 Batch grading completed', `${results.successful}/${gradingContexts.length} successful`);
      return results;
      
    } catch (error) {
      this.debugLog('❌ Batch grading failed', error.toString());
      throw error;
    }
  },
  
  /**
   * Grade with AppScript (current implementation)
   */
  async gradeWithAppScript(gradingContext) {
    this.debugLog('🔧 Using AppScript Gemini AI');
    
    // Call the GeminiAI service directly
    return await GeminiAI.gradeSubmission(gradingContext);
  },
  
  /**
   * Grade with Firebase Functions (future implementation)
   */
  async gradeWithFirebaseFunctions(gradingContext) {
    this.debugLog('☁️ Using Firebase Functions');
    
    try {
      const config = getAIGradingConfig();
      const response = UrlFetchApp.fetch(`${config.FIREBASE_FUNCTIONS_URL}/grade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ScriptApp.getOAuthToken()}`
        },
        payload: JSON.stringify(gradingContext),
        muteHttpExceptions: true
      });
      
      const responseCode = response.getResponseCode();
      const responseText = response.getContentText();
      
      if (responseCode !== 200) {
        throw new Error(`Firebase Functions error: ${responseCode} - ${responseText}`);
      }
      
      return JSON.parse(responseText);
      
    } catch (error) {
      throw new Error(`Firebase Functions call failed: ${error.toString()}`);
    }
  },
  
  /**
   * Validate and enhance grading result
   */
  validateGradingResult(result, context) {
    // Ensure required fields exist
    if (!result.requestId) {
      result.requestId = context.requestId;
    }
    
    if (!result.grade) {
      result.grade = {
        score: 0,
        maxScore: context.assignment?.maxScore || 100,
        percentage: 0
      };
    }
    
    if (!result.feedback) {
      result.feedback = {
        summary: 'AI grading completed.',
        strengths: [],
        improvements: []
      };
    }
    
    if (!result.metadata) {
      result.metadata = {
        model: 'unknown',
        confidence: 0.5,
        processingTime: 0,
        needsReview: true,
        gradedAt: new Date().toISOString()
      };
    }
    
    // Add provider information
    const config = getAIGradingConfig();
    result.metadata.provider = config.PROVIDER;
    
    return result;
  },
  
  /**
   * Create error result for failed grading
   */
  createErrorResult(context, error) {
    return {
      requestId: context?.requestId || this.generateRequestId(),
      grade: {
        score: 0,
        maxScore: context?.assignment?.maxScore || 100,
        percentage: 0
      },
      feedback: {
        summary: 'AI grading failed. Please grade manually.',
        strengths: [],
        improvements: ['Technical error occurred during AI grading']
      },
      metadata: {
        model: 'error',
        confidence: 0,
        processingTime: 0,
        needsReview: true,
        reviewReason: `AI grading error: ${error?.toString() || 'Unknown error'}`,
        provider: getAIGradingConfig().PROVIDER,
        gradedAt: new Date().toISOString()
      }
    };
  },
  
  /**
   * Generate unique request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },
  
  /**
   * Generate unique batch ID
   */
  generateBatchId() {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },
  
  /**
   * Create request metadata
   */
  createRequestMetadata() {
    return {
      teacherId: Session.getActiveUser().getEmail(),
      gradingTimestamp: new Date().toISOString(),
      provider: getAIGradingConfig().PROVIDER
    };
  },
  
  /**
   * Debug logging
   */
  debugLog(message, details) {
    const config = getAIGradingConfig();
    if (config.DEBUG) {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
      console.log(`[${timestamp}] [AIGradingAPI] ${message}${details ? ': ' + details : ''}`);
    }
  },
  
  /**
   * Get current provider configuration
   */
  getProviderInfo() {
    const config = getAIGradingConfig();
    return {
      provider: config.PROVIDER,
      firebaseFunctionsUrl: config.FIREBASE_FUNCTIONS_URL,
      timeout: config.TIMEOUT_MS
    };
  },
  
  /**
   * Switch provider (for testing or migration)
   */
  setProvider(provider) {
    if (provider !== 'appscript' && provider !== 'firebase-functions') {
      throw new Error(`Invalid provider: ${provider}. Must be 'appscript' or 'firebase-functions'`);
    }
    
    // Note: This modifies the runtime config, not the persistent config
    this.debugLog('🔄 Provider switched', provider);
    // For now, we'll need to modify the function return directly
  }
};

/**
 * Content Extraction Service
 * Extracts text content from various submission attachment types
 */
const ContentExtractor = {
  
  /**
   * Extract content from submission attachments
   * @param {Object} submission - Enhanced submission object
   * @returns {Object} Extracted content ready for AI processing
   */
  extractSubmissionContent(submission) {
    this.debugLog('📄 Starting content extraction', `${submission.attachments?.length || 0} attachments`);
    
    const extractedContent = {
      text: submission.submissionText || '',
      structuredData: {},
      sections: [],
      images: [],
      metadata: {
        extractedAt: new Date().toISOString(),
        extractionMethod: 'appscript',
        extractionQuality: 'medium'
      }
    };
    
    // Process each attachment
    if (submission.attachments && submission.attachments.length > 0) {
      submission.attachments.forEach((attachment, index) => {
        try {
          switch (attachment.type) {
            case 'driveFile':
              this.extractFromDriveFile(attachment, extractedContent);
              break;
              
            case 'link':
              this.extractFromLink(attachment, extractedContent);
              break;
              
            case 'form':
              this.extractFromForm(attachment, extractedContent);
              break;
              
            default:
              this.debugLog('⚠️ Unknown attachment type', attachment.type);
          }
        } catch (error) {
          this.debugLog('❌ Attachment extraction failed', `${attachment.type}: ${error.toString()}`);
        }
      });
    }
    
    // Combine all text content
    if (extractedContent.sections.length > 0) {
      const allText = extractedContent.sections.map(section => 
        (section.title ? `${section.title}\n` : '') + section.content
      ).join('\n\n');
      
      if (allText.length > extractedContent.text.length) {
        extractedContent.text = allText;
      }
    }
    
    this.debugLog('✅ Content extraction completed', `${extractedContent.text.length} characters`);
    return extractedContent;
  },
  
  /**
   * Extract content from Google Drive files
   */
  extractFromDriveFile(attachment, extractedContent) {
    // For now, we'll add a placeholder since Drive API content extraction
    // requires additional permissions and complexity
    extractedContent.sections.push({
      title: `Drive File: ${attachment.title}`,
      content: `[Drive file: ${attachment.title}]\nFile type: ${attachment.contentType}\nLink: ${attachment.alternateLink}`,
      type: 'document'
    });
    
    // In a full implementation, we would:
    // 1. Use DriveApp.getFileById() to access the file
    // 2. Extract text based on MIME type (Google Docs, Sheets, etc.)
    // 3. Handle different file formats appropriately
  },
  
  /**
   * Extract content from web links
   */
  extractFromLink(attachment, extractedContent) {
    extractedContent.sections.push({
      title: `Link: ${attachment.title}`,
      content: `[Web link: ${attachment.title}]\nURL: ${attachment.url}\nDomain: ${attachment.domain}`,
      type: 'link'
    });
    
    // In a full implementation, we could:
    // 1. Fetch the web page content (if accessible)
    // 2. Extract text from HTML
    // 3. Handle different link types (GitHub repos, videos, etc.)
  },
  
  /**
   * Extract content from Google Forms
   */
  extractFromForm(attachment, extractedContent) {
    extractedContent.sections.push({
      title: `Form Response: ${attachment.title}`,
      content: `[Google Form response]\nForm: ${attachment.title}\nForm URL: ${attachment.formUrl}`,
      type: 'form'
    });
    
    // In a full implementation, we could:
    // 1. Use Forms API to get form structure
    // 2. Extract student responses
    // 3. Format as structured quiz data
  },
  
  /**
   * Debug logging for content extraction
   */
  debugLog(message, details) {
    const config = getAIGradingConfig();
    if (config.DEBUG) {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
      console.log(`[${timestamp}] [ContentExtractor] ${message}${details ? ': ' + details : ''}`);
    }
  }
};