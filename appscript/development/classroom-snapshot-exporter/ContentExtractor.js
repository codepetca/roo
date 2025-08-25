/**
 * Content Extractor - Extract content from Google Drive files and Forms
 * Runs within Google Apps Script environment with full access to school's Google account
 * 
 * Provides content extraction for:
 * - Google Docs (text content)
 * - Google Sheets (structured data)  
 * - Google Forms (quiz responses)
 * - Google Slides (text content)
 * 
 * Location: appscript/development/classroom-snapshot-exporter/ContentExtractor.js
 */

const ContentExtractor = {
  
  /**
   * Extract text content from Google Docs
   * @param {string} fileId - Google Drive file ID
   * @returns {Object} Extracted content with text and metadata
   */
  extractDocContent: function(fileId) {
    try {
      const doc = DocumentApp.openById(fileId);
      const body = doc.getBody();
      const text = body.getText();
      
      // Count words (split by whitespace, filter empty strings)
      const words = text.split(/\s+/).filter(word => word.trim().length > 0);
      
      return {
        text: text,
        wordCount: words.length,
        metadata: {
          title: doc.getName(),
          lastModified: doc.getLastUpdated().toISOString(),
          contentType: 'document'
        }
      };
      
    } catch (error) {
      console.error(`Error extracting content from Google Doc ${fileId}:`, error);
      return {
        text: '',
        wordCount: 0,
        metadata: {
          title: 'Error loading document',
          error: error.message,
          contentType: 'document'
        }
      };
    }
  },
  
  /**
   * Extract structured data from Google Sheets
   * @param {string} fileId - Google Drive file ID
   * @returns {Object} Extracted content with data and metadata
   */
  extractSheetContent: function(fileId) {
    try {
      const spreadsheet = SpreadsheetApp.openById(fileId);
      const sheets = spreadsheet.getSheets();
      
      const extractedData = {};
      let totalCells = 0;
      
      // Extract data from all sheets
      for (const sheet of sheets) {
        const range = sheet.getDataRange();
        if (range.getNumRows() > 0 && range.getNumColumns() > 0) {
          const values = range.getValues();
          extractedData[sheet.getName()] = values;
          totalCells += values.length * values[0].length;
        }
      }
      
      // Convert to text for AI processing (first sheet as primary content)
      const firstSheet = sheets[0];
      let textRepresentation = '';
      if (firstSheet && extractedData[firstSheet.getName()]) {
        const data = extractedData[firstSheet.getName()];
        textRepresentation = data.map(row => row.join('\t')).join('\n');
      }
      
      return {
        text: textRepresentation,
        structuredData: extractedData,
        metadata: {
          title: spreadsheet.getName(),
          lastModified: spreadsheet.getLastUpdated().toISOString(),
          contentType: 'spreadsheet',
          sheetCount: sheets.length,
          totalCells: totalCells
        }
      };
      
    } catch (error) {
      console.error(`Error extracting content from Google Sheet ${fileId}:`, error);
      return {
        text: '',
        structuredData: {},
        metadata: {
          title: 'Error loading spreadsheet',
          error: error.message,
          contentType: 'spreadsheet'
        }
      };
    }
  },
  
  /**
   * Extract text content from Google Slides
   * @param {string} fileId - Google Drive file ID
   * @returns {Object} Extracted content with text and metadata
   */
  extractSlidesContent: function(fileId) {
    try {
      const presentation = SlidesApp.openById(fileId);
      const slides = presentation.getSlides();
      
      let allText = '';
      const slideTexts = [];
      
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const pageElements = slide.getPageElements();
        let slideText = '';
        
        for (const element of pageElements) {
          if (element.getPageElementType() === SlidesApp.PageElementType.SHAPE) {
            const shape = element.asShape();
            if (shape.getText) {
              const text = shape.getText().asString();
              if (text.trim()) {
                slideText += text + '\n';
              }
            }
          }
        }
        
        if (slideText.trim()) {
          slideTexts.push(`Slide ${i + 1}:\n${slideText.trim()}`);
          allText += slideText + '\n';
        }
      }
      
      return {
        text: allText.trim(),
        sections: slideTexts,
        metadata: {
          title: presentation.getName(),
          lastModified: new Date().toISOString(), // Slides API doesn't expose lastModified
          contentType: 'presentation',
          slideCount: slides.length
        }
      };
      
    } catch (error) {
      console.error(`Error extracting content from Google Slides ${fileId}:`, error);
      return {
        text: '',
        sections: [],
        metadata: {
          title: 'Error loading presentation',
          error: error.message,
          contentType: 'presentation'
        }
      };
    }
  },
  
  /**
   * Extract response data from Google Forms
   * @param {string} formId - Google Form ID
   * @param {string} studentEmail - Student email to match response (primary)
   * @param {string} fallbackResponseId - Specific response ID (optional fallback)
   * @returns {Object} Extracted responses and metadata
   */
  extractFormResponse: function(formId, studentEmail, fallbackResponseId) {
    // Performance optimization: Skip known problematic forms early
    const SKIP_FORMS = ['Learning Survey', 'Project Reflection'];
    const formTitle = this.getFormTitleQuick(formId);
    if (formTitle && SKIP_FORMS.some(skip => formTitle.toLowerCase().includes(skip.toLowerCase()))) {
      console.log(`🚫 [Performance] Early skip for known problematic form: ${formTitle}`);
      return {
        text: '',
        responses: {},
        structuredData: {},
        metadata: {
          formTitle: formTitle,
          error: 'Form skipped - no email data available',
          contentType: 'form',
          extractionMethod: 'Early-Skip',
          skipReason: 'Known problematic form'
        }
      };
    }
    
    // Set execution time limit to prevent hanging - reduced timeout for faster processing
    const startTime = new Date().getTime();
    const TIMEOUT_MS = 10000; // 10 seconds max (reduced from 15)
    
    try {
      console.log(`🎯 [Forms API] Attempting to extract form ${formId} for student: ${studentEmail}`);
      
      // Try Forms API first (new approach with email data)
      const apiResponse = this.getFormResponsesViaAPI(formId, studentEmail);
      if (apiResponse) {
        console.log(`✅ [Forms API] Successfully extracted via API`);
        return apiResponse;
      }
      
      console.log(`⚠️ [Forms API] Falling back to FormApp method`);
      
      // Check timeout before attempting FormApp fallback
      if (new Date().getTime() - startTime > TIMEOUT_MS) {
        throw new Error(`Form extraction timeout (${TIMEOUT_MS}ms) for form ${formId}`);
      }
      
      // Fallback to FormApp (existing approach)
      let form, responses;
      try {
        form = FormApp.openById(formId);
        responses = form.getResponses();
      } catch (formError) {
        console.error(`❌ [FormApp] Cannot access form ${formId}: ${formError.message}`);
        return {
          text: '',
          responses: {},
          structuredData: {},
          metadata: {
            formTitle: 'Form Access Denied',
            error: `Form access denied: ${formError.message}`,
            contentType: 'form',
            extractionMethod: 'FormApp-Failed',
            extractionErrors: [formError.message],
            requestedEmail: studentEmail || null,
            fallbackResponseId: fallbackResponseId || null
          }
        };
      }
      
      if (!responses || responses.length === 0) {
        return {
          text: '',
          responses: {},
          structuredData: {},
          metadata: {
            formTitle: form.getTitle(),
            error: 'No responses found',
            contentType: 'form',
            extractionMethod: 'FormApp'
          }
        };
      }
      
      // Find response by student email (primary method)
      let targetResponse;
      if (studentEmail) {
        targetResponse = responses.find(r => {
          const respondentEmail = r.getRespondentEmail();
          return respondentEmail && respondentEmail.toLowerCase() === studentEmail.toLowerCase();
        });
        
        if (targetResponse) {
          console.log(`Found Forms response for student: ${studentEmail}`);
        } else {
          console.warn(`No Forms response found for student: ${studentEmail}`);
        }
      }
      
      // Fallback to response ID if email match failed
      if (!targetResponse && fallbackResponseId) {
        targetResponse = responses.find(r => r.getId() === fallbackResponseId);
        if (targetResponse) {
          console.log(`Using fallback response ID: ${fallbackResponseId}`);
        }
      }
      
      // Final fallback to latest response (with warning)
      if (!targetResponse) {
        targetResponse = responses[responses.length - 1];
        console.warn(`No email/ID match found, using latest response. This may be incorrect for student: ${studentEmail}`);
      }
      
      const itemResponses = targetResponse.getItemResponses();
      const extractedResponses = {};
      const structuredData = {};
      
      // Extract question-answer pairs
      for (const itemResponse of itemResponses) {
        const question = itemResponse.getItem().getTitle();
        const answer = itemResponse.getResponse();
        
        extractedResponses[question] = answer;
        
        // Also store by question number for easier processing
        const questionIndex = itemResponse.getItem().getIndex();
        structuredData[questionIndex.toString()] = {
          question: question,
          answer: answer,
          type: itemResponse.getItem().getType().toString()
        };
      }
      
      // Create text representation for AI processing
      const textRepresentation = Object.entries(extractedResponses)
        .map(([question, answer]) => `Q: ${question}\nA: ${answer}`)
        .join('\n\n');
      
      return {
        text: textRepresentation,
        responses: extractedResponses,
        structuredData: structuredData,
        metadata: {
          formTitle: form.getTitle(),
          responseTime: targetResponse.getTimestamp().toISOString(),
          email: targetResponse.getRespondentEmail() || 'anonymous',
          responseId: targetResponse.getId(),
          contentType: 'form',
          questionCount: Object.keys(extractedResponses).length,
          matchedByEmail: studentEmail && targetResponse.getRespondentEmail()?.toLowerCase() === studentEmail.toLowerCase(),
          requestedEmail: studentEmail || null,
          totalFormResponses: responses.length,
          extractionMethod: 'FormApp'
        }
      };
      
    } catch (error) {
      console.error(`Error extracting form response ${formId} for ${studentEmail}:`, error);
      return {
        text: '',
        responses: {},
        structuredData: {},
        metadata: {
          formTitle: 'Error loading form',
          error: error.message,
          contentType: 'form',
          requestedEmail: studentEmail || null,
          fallbackResponseId: fallbackResponseId || null
        }
      };
    }
  },

  /**
   * Get form responses using Google Forms API (new approach with email data)
   * @param {string} formId - Google Form ID
   * @param {string} studentEmail - Student email to match response
   * @returns {Object|null} Processed form response or null if failed
   */
  getFormResponsesViaAPI: function(formId, studentEmail) {
    try {
      console.log(`🌐 [Forms API] Calling API for form ${formId}`);
      
      const oAuthToken = ScriptApp.getOAuthToken();
      const formsAPIUrl = `https://forms.googleapis.com/v1/forms/${formId}/responses`;
      
      const options = {
        'headers': {
          'Authorization': 'Bearer ' + oAuthToken,
          'Accept': 'application/json'
        },
        'method': 'GET',
        'muteHttpExceptions': true,
        'followRedirects': false,  // Performance: avoid redirects
        'timeout': 8000           // Performance: reduced timeout from default
      };
      
      const response = UrlFetchApp.fetch(formsAPIUrl, options);
      console.log(`📡 [Forms API] Response code: ${response.getResponseCode()}`);
      
      if (response.getResponseCode() !== 200) {
        console.log(`ℹ️ [Forms API] API returned ${response.getResponseCode()}`);
        return null;
      }
      
      const data = JSON.parse(response.getContentText());
      const responses = data.responses || [];
      console.log(`📊 [Forms API] Found ${responses.length} responses`);
      
      if (responses.length === 0) {
        return null;
      }
      
      // Get form metadata
      const formResponse = UrlFetchApp.fetch(`https://forms.googleapis.com/v1/forms/${formId}`, options);
      let formTitle = 'Unknown Form';
      if (formResponse.getResponseCode() === 200) {
        const formData = JSON.parse(formResponse.getContentText());
        formTitle = formData.info?.title || 'Unknown Form';
      }
      
      return this.processAPIResponses(responses, formTitle, studentEmail, formId);
      
    } catch (error) {
      console.log(`ℹ️ [Forms API] API not available: ${error.message}`);
      return null;
    }
  },

  /**
   * Process API responses and find matching student response
   * @param {Array} responses - Array of API response objects
   * @param {string} formTitle - Title of the form
   * @param {string} studentEmail - Student email to match
   * @param {string} formId - Form ID for logging
   * @returns {Object} Processed form response
   */
  processAPIResponses: function(responses, formTitle, studentEmail, formId) {
    // Try to find response with matching email
    let targetResponse = null;
    let matchedByEmail = false;
    
    if (studentEmail) {
      for (const response of responses) {
        // Check if response has respondentEmail field
        if (response.respondentEmail && 
            response.respondentEmail.toLowerCase() === studentEmail.toLowerCase()) {
          targetResponse = response;
          matchedByEmail = true;
          console.log(`✅ [Forms API] Found matching response by email: ${studentEmail}`);
          break;
        }
      }
    }
    
    // If no email match, use most recent response with warning
    if (!targetResponse) {
      targetResponse = responses[responses.length - 1];
      console.warn(`⚠️ [Forms API] No email match, using latest response for: ${studentEmail}`);
    }
    
    // Extract answers from the API response
    const extractedResponses = {};
    const structuredData = {};
    const answers = targetResponse.answers || {};
    
    let questionIndex = 0;
    for (const [questionId, answerData] of Object.entries(answers)) {
      const questionText = answerData.questionId || `Question ${questionIndex + 1}`;
      let answerText = '';
      
      // Handle different answer types
      if (answerData.textAnswers) {
        answerText = answerData.textAnswers.answers?.map(a => a.value).join('; ') || '';
      } else if (answerData.fileUploadAnswers) {
        answerText = `[${answerData.fileUploadAnswers.answers?.length || 0} file(s) uploaded]`;
      } else if (answerData.gradeAnswers) {
        answerText = answerData.gradeAnswers.answers?.map(a => a.value).join('; ') || '';
      } else {
        answerText = JSON.stringify(answerData);
      }
      
      extractedResponses[questionText] = answerText;
      structuredData[questionIndex.toString()] = {
        question: questionText,
        answer: answerText,
        questionId: questionId,
        type: 'api_response'
      };
      
      questionIndex++;
    }
    
    // Create text representation
    const textRepresentation = Object.entries(extractedResponses)
      .map(([question, answer]) => `Q: ${question}\\nA: ${answer}`)
      .join('\\n\\n');
    
    return {
      text: textRepresentation,
      responses: extractedResponses,
      structuredData: structuredData,
      metadata: {
        formTitle: formTitle,
        responseTime: targetResponse.createTime || new Date().toISOString(),
        email: targetResponse.respondentEmail || 'anonymous',
        responseId: targetResponse.responseId,
        contentType: 'form',
        questionCount: Object.keys(extractedResponses).length,
        matchedByEmail: matchedByEmail,
        requestedEmail: studentEmail || null,
        totalFormResponses: responses.length,
        extractionMethod: 'FormsAPI'
      }
    };
  },

  /**
   * Check form settings for debugging purposes
   * @param {string} formId - Google Form ID
   * @returns {Object} Form settings information
   */
  checkFormSettings: function(formId) {
    try {
      const form = FormApp.openById(formId);
      console.log(`📋 [Form Settings] Form: ${form.getTitle()}`);
      console.log(`📧 [Form Settings] Collects emails: ${form.collectsEmail()}`);
      console.log(`🔄 [Form Settings] Accepting responses: ${form.isAcceptingResponses()}`);
      
      const responses = form.getResponses();
      console.log(`📊 [Form Settings] Total responses: ${responses.length}`);
      
      if (responses.length > 0) {
        const firstResponse = responses[0];
        console.log(`👤 [Form Settings] First response email: ${firstResponse.getRespondentEmail() || 'anonymous'}`);
        console.log(`⏰ [Form Settings] First response time: ${firstResponse.getTimestamp()}`);
      }
      
      return {
        title: form.getTitle(),
        collectsEmail: form.collectsEmail(),
        acceptingResponses: form.isAcceptingResponses(),
        totalResponses: responses.length,
        firstResponseEmail: responses.length > 0 ? (responses[0].getRespondentEmail() || 'anonymous') : null
      };
      
    } catch (error) {
      console.error(`❌ [Form Settings] Error checking form settings: ${error.message}`);
      return {
        error: error.message
      };
    }
  },
  
  /**
   * Extract content from any Google Drive file based on MIME type
   * @param {string} fileId - Google Drive file ID
   * @param {string} mimeType - MIME type of the file
   * @returns {Object} Extracted content appropriate for the file type
   */
  extractContentByMimeType: function(fileId, mimeType) {
    try {
      switch (mimeType) {
        case 'application/vnd.google-apps.document':
          return this.extractDocContent(fileId);
          
        case 'application/vnd.google-apps.spreadsheet':
          return this.extractSheetContent(fileId);
          
        case 'application/vnd.google-apps.presentation':
          return this.extractSlidesContent(fileId);
          
        case 'application/vnd.google-apps.form':
          return this.extractFormResponse(fileId);
          
        default:
          console.warn(`Unsupported MIME type for content extraction: ${mimeType}`);
          return {
            text: '',
            metadata: {
              title: 'Unsupported file type',
              mimeType: mimeType,
              contentType: 'other'
            }
          };
      }
    } catch (error) {
      console.error(`Error extracting content by MIME type ${mimeType}:`, error);
      return {
        text: '',
        metadata: {
          error: error.message,
          mimeType: mimeType,
          contentType: 'error'
        }
      };
    }
  },
  
  /**
   * Helper function to detect if content appears to be coding-related
   * @param {string} text - Text content to analyze
   * @returns {boolean} Whether content appears to contain code
   */
  detectCodingContent: function(text) {
    if (!text || typeof text !== 'string') {
      return false;
    }
    
    const codingIndicators = [
      'karel', 'function', 'def ', 'class ', 'import ', 'for (', 'while (', 
      'if (', 'else', '{', '}', 'return ', 'void ', 'int ', 'string ',
      'move()', 'turnLeft()', 'pickBeeper()', 'putBeeper()',
      'frontIsClear()', 'leftIsClear()', 'rightIsClear()',
      'beepersPresent()', 'facingNorth()', 'facingEast()',
      'facingSouth()', 'facingWest()'
    ];
    
    const textLower = text.toLowerCase();
    return codingIndicators.some(indicator => 
      textLower.includes(indicator.toLowerCase())
    );
  },
  
  /**
   * Comprehensive form ownership and permission diagnostic
   * @param {string} formId - Google Form ID to diagnose
   * @returns {Object} Detailed diagnostic information
   */
  diagnoseFormOwnership: function(formId) {
    try {
      console.log(`🔍 [Form Diagnosis] Starting diagnosis for form: ${formId}`);
      
      const form = FormApp.openById(formId);
      const currentUser = Session.getActiveUser().getEmail();
      
      console.log(`📋 [Form Diagnosis] Form: ${form.getTitle()}`);
      console.log(`👤 [Form Diagnosis] Current user: ${currentUser}`);
      
      // Safely check edit access (may not be available in all contexts)
      let hasEditAccess = false;
      try {
        hasEditAccess = form.hasEditAccess ? form.hasEditAccess() : false;
        console.log(`🔒 [Form Diagnosis] Can edit: ${hasEditAccess}`);
      } catch (editError) {
        console.log(`🔒 [Form Diagnosis] Edit access check failed: ${editError.message}`);
      }
      
      console.log(`📧 [Form Diagnosis] Collects emails: ${form.collectsEmail()}`);
      console.log(`🔄 [Form Diagnosis] Accepting responses: ${form.isAcceptingResponses()}`);
      
      // Try to determine form owner
      let formOwner = 'Unknown';
      try {
        const formFile = DriveApp.getFileById(formId);
        const owner = formFile.getOwner();
        formOwner = owner ? owner.getEmail() : 'Unknown';
        console.log(`👑 [Form Diagnosis] Form owner: ${formOwner}`);
        console.log(`🎯 [Form Diagnosis] Owner match: ${formOwner === currentUser}`);
      } catch (ownerError) {
        console.log(`⚠️ [Form Diagnosis] Cannot determine owner: ${ownerError.message}`);
      }
      
      // Analyze all responses
      const responses = form.getResponses();
      console.log(`📊 [Form Diagnosis] Total responses: ${responses.length}`);
      
      let emailCount = 0;
      let anonymousCount = 0;
      const responseDates = [];
      const uniqueEmails = new Set();
      
      responses.forEach((response, index) => {
        const email = response.getRespondentEmail();
        const timestamp = response.getTimestamp();
        responseDates.push(timestamp);
        
        if (email && email !== 'anonymous') {
          emailCount++;
          uniqueEmails.add(email);
          if (index < 3) { // Log first 3 emails
            console.log(`📧 [Form Diagnosis] Response ${index + 1} email: ${email}`);
          }
        } else {
          anonymousCount++;
          if (index < 3) { // Log first 3 anonymous
            console.log(`👻 [Form Diagnosis] Response ${index + 1} email: anonymous`);
          }
        }
      });
      
      console.log(`✅ [Form Diagnosis] Responses with emails: ${emailCount}`);
      console.log(`❌ [Form Diagnosis] Anonymous responses: ${anonymousCount}`);
      console.log(`👥 [Form Diagnosis] Unique email addresses: ${uniqueEmails.size}`);
      
      // Check response date range
      if (responseDates.length > 0) {
        const earliest = new Date(Math.min(...responseDates));
        const latest = new Date(Math.max(...responseDates));
        console.log(`📅 [Form Diagnosis] Earliest response: ${earliest.toISOString()}`);
        console.log(`📅 [Form Diagnosis] Latest response: ${latest.toISOString()}`);
      }
      
      return {
        formTitle: form.getTitle(),
        currentUser: currentUser,
        formOwner: formOwner,
        isOwner: formOwner === currentUser,
        hasEditAccess: hasEditAccess,
        collectsEmail: form.collectsEmail(),
        acceptingResponses: form.isAcceptingResponses(),
        totalResponses: responses.length,
        responsesWithEmails: emailCount,
        anonymousResponses: anonymousCount,
        uniqueEmails: Array.from(uniqueEmails),
        dateRange: responseDates.length > 0 ? {
          earliest: new Date(Math.min(...responseDates)).toISOString(),
          latest: new Date(Math.max(...responseDates)).toISOString()
        } : null
      };
      
    } catch (error) {
      console.error(`❌ [Form Diagnosis] Error: ${error.message}`);
      return {
        error: error.message,
        formId: formId
      };
    }
  },
  
  /**
   * Quick form title lookup for performance optimization
   * @param {string} formId - Google Form ID
   * @returns {string|null} Form title or null if not accessible
   */
  getFormTitleQuick: function(formId) {
    try {
      // Quick attempt to get form title without full processing
      const form = FormApp.openById(formId);
      return form.getTitle();
    } catch (error) {
      // If we can't access the form quickly, return null
      return null;
    }
  },

  /**
   * Extract Form ID from Google Forms URL
   * @param {string} formUrl - Google Forms URL
   * @returns {string|null} Form ID or null if not found
   */
  extractFormIdFromUrl: function(formUrl) {
    if (!formUrl || typeof formUrl !== 'string') {
      return null;
    }
    
    // Match Google Forms URL patterns
    const patterns = [
      /\/forms\/d\/([a-zA-Z0-9-_]+)/,  // Standard form URL
      /\/forms\/d\/e\/([a-zA-Z0-9-_]+)/, // Form response URL
      /\/forms\/([a-zA-Z0-9-_]+)/      // Alternative pattern
    ];
    
    for (const pattern of patterns) {
      const match = formUrl.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  }
};