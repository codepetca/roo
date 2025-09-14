/**
 * Gemini Flash AI Service for Question Generation
 * Location: ai-service.gs
 * 
 * Handles AI-powered quiz question generation using Google Gemini Flash
 */

// Configuration for Gemini API
const GEMINI_API_CONFIG = {
  apiKey: PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY'),
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent',
  model: 'gemini-1.5-flash-latest'
};

/**
 * Generate quiz questions using Gemini Flash AI
 * @param {Object} config - Quiz generation configuration
 * @param {string} config.unit - Selected CodeHS unit
 * @param {number} config.codingQuestions - Number of coding questions
 * @param {number} config.multipleChoiceQuestions - Number of multiple choice questions
 * @param {Array} config.concepts - Key concepts to focus on
 * @returns {Object} Generated questions in structured format
 */
function generateQuizQuestions(config) {
  try {
    const unitContent = getUnitContent(config.unit);
    if (!unitContent) {
      throw new Error(`Unit not found: ${config.unit}`);
    }

    const prompt = buildQuestionGenerationPrompt(config, unitContent);
    const response = callGeminiAPI(prompt);
    
    return parseAIResponse(response);
  } catch (error) {
    console.error('Error generating quiz questions:', error);
    throw new Error(`Failed to generate questions: ${error.message}`);
  }
}

/**
 * Build comprehensive prompt for AI question generation
 * @param {Object} config - Quiz configuration
 * @param {Object} unitContent - CodeHS unit content
 * @returns {string} Formatted prompt for AI
 */
function buildQuestionGenerationPrompt(config, unitContent) {
  const conceptsList = config.concepts.join(', ');
  const lessonTitles = unitContent.lessons.map(lesson => lesson.title).join(', ');
  
  return `You are an expert computer science educator creating quiz questions for a CodeHS programming course.

CONTEXT:
- Unit: ${unitContent.title}
- Description: ${unitContent.description}
- Key Concepts: ${conceptsList}
- Available Lessons: ${lessonTitles}

REQUIREMENTS:
Generate exactly ${config.codingQuestions} coding questions and ${config.multipleChoiceQuestions} multiple choice questions.

CODING QUESTIONS REQUIREMENTS:
- Focus on Karel the Dog programming
- Include specific Karel commands: move(), turnLeft(), putBall(), takeBall()
- For advanced questions: include functions, loops (for/while), conditionals (if/else)
- Each question should have a clear problem statement and expected outcome
- Use coordinate system format: (column, row) when specifying positions
- Keep questions direct and clean - no hints or difficulty labels

MULTIPLE CHOICE REQUIREMENTS:
- Cover conceptual understanding of programming fundamentals
- Include questions about Karel's world, functions, loops, conditionals
- 4 options per question (A, B, C, D)
- Mix of difficulty levels
- Clear, unambiguous correct answers

OUTPUT FORMAT:
Return ONLY valid JSON in this exact structure:

{
  "codingQuestions": [
    {
      "id": 1,
      "title": "Question Title",
      "description": "Clear problem statement for Karel",
      "concepts": ["concept1", "concept2"],
      "solution": "Complete Karel program solution",
      "pointValue": 5
    }
  ],
  "multipleChoiceQuestions": [
    {
      "id": 1,
      "title": "Question text",
      "options": {
        "A": "Option A text",
        "B": "Option B text", 
        "C": "Option C text",
        "D": "Option D text"
      },
      "correctAnswer": "A",
      "explanation": "Why this answer is correct",
      "concepts": ["concept1"],
      "pointValue": 1
    }
  ]
}

Focus on educational value and ensure questions test understanding of core programming concepts within the Karel environment.`;
}

/**
 * Make API call to Gemini Flash
 * @param {string} prompt - Formatted prompt for AI
 * @returns {Object} Raw API response
 */
function callGeminiAPI(prompt) {
  const apiKey = GEMINI_API_CONFIG.apiKey;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not found in script properties');
  }

  const requestBody = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 4000,
      responseMimeType: "application/json"
    }
  };

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    payload: JSON.stringify(requestBody)
  };

  const url = `${GEMINI_API_CONFIG.baseUrl}?key=${apiKey}`;
  const response = UrlFetchApp.fetch(url, options);
  
  if (response.getResponseCode() !== 200) {
    throw new Error(`Gemini API error: ${response.getContentText()}`);
  }

  return JSON.parse(response.getContentText());
}

/**
 * Parse AI response and extract question data
 * @param {Object} apiResponse - Raw Gemini API response
 * @returns {Object} Parsed question data
 */
function parseAIResponse(apiResponse) {
  try {
    if (!apiResponse.candidates || !apiResponse.candidates[0]) {
      throw new Error('No content in AI response');
    }

    const content = apiResponse.candidates[0].content;
    if (!content || !content.parts || !content.parts[0]) {
      throw new Error('Invalid response structure');
    }

    const questionText = content.parts[0].text;
    const questions = JSON.parse(questionText);
    
    // Validate required structure
    if (!questions.codingQuestions || !questions.multipleChoiceQuestions) {
      throw new Error('Invalid question structure in AI response');
    }

    // Add IDs if missing and validate data
    questions.codingQuestions.forEach((q, index) => {
      q.id = q.id || (index + 1);
      q.pointValue = q.pointValue || 5;
    });

    questions.multipleChoiceQuestions.forEach((q, index) => {
      q.id = q.id || (index + 1);
      q.pointValue = q.pointValue || 1;
    });

    return questions;
  } catch (error) {
    console.error('Error parsing AI response:', error);
    console.error('Raw response:', apiResponse);
    throw new Error(`Failed to parse AI response: ${error.message}`);
  }
}

/**
 * Validate generated questions for quality and completeness
 * @param {Object} questions - Generated question data
 * @returns {Object} Validation results
 */
function validateGeneratedQuestions(questions) {
  const issues = [];
  
  // Validate coding questions
  questions.codingQuestions.forEach((q, index) => {
    if (!q.title || !q.description) {
      issues.push(`Coding question ${index + 1}: Missing title or description`);
    }
    if (!q.concepts || q.concepts.length === 0) {
      issues.push(`Coding question ${index + 1}: No concepts specified`);
    }
  });

  // Validate multiple choice questions
  questions.multipleChoiceQuestions.forEach((q, index) => {
    if (!q.title || !q.options || !q.correctAnswer) {
      issues.push(`Multiple choice question ${index + 1}: Missing required fields`);
    }
    if (q.options && Object.keys(q.options).length !== 4) {
      issues.push(`Multiple choice question ${index + 1}: Must have exactly 4 options`);
    }
    if (q.correctAnswer && !q.options[q.correctAnswer]) {
      issues.push(`Multiple choice question ${index + 1}: Correct answer not in options`);
    }
  });

  return {
    isValid: issues.length === 0,
    issues: issues,
    questionCount: {
      coding: questions.codingQuestions.length,
      multipleChoice: questions.multipleChoiceQuestions.length
    }
  };
}

/**
 * Setup function to configure Gemini API key
 * Call this once to set up the API key in script properties
 */
function setupGeminiAPIKey() {
  const apiKey = Browser.inputBox(
    'Setup Required', 
    'Enter your Google Gemini API key:', 
    Browser.Buttons.OK_CANCEL
  );
  
  if (apiKey && apiKey !== 'cancel') {
    PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', apiKey);
    Browser.msgBox('Success', 'Gemini API key has been saved securely.', Browser.Buttons.OK);
  }
}