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
   * @param {string} responseId - Specific response ID (optional)
   * @returns {Object} Extracted responses and metadata
   */
  extractFormResponse: function(formId, responseId) {
    try {
      const form = FormApp.openById(formId);
      const responses = form.getResponses();
      
      if (!responses || responses.length === 0) {
        return {
          responses: {},
          structuredData: {},
          metadata: {
            formTitle: form.getTitle(),
            error: 'No responses found',
            contentType: 'form'
          }
        };
      }
      
      // Find specific response or use the latest one
      let targetResponse;
      if (responseId) {
        targetResponse = responses.find(r => r.getId() === responseId);
      }
      if (!targetResponse) {
        targetResponse = responses[responses.length - 1]; // Latest response
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
          questionCount: Object.keys(extractedResponses).length
        }
      };
      
    } catch (error) {
      console.error(`Error extracting form response ${formId}/${responseId}:`, error);
      return {
        text: '',
        responses: {},
        structuredData: {},
        metadata: {
          formTitle: 'Error loading form',
          error: error.message,
          contentType: 'form'
        }
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
  }
};