/**
 * Tests for ContentExtractor and SchemaAdapters content extraction
 * These are manual tests to run within Google Apps Script environment
 * 
 * Location: appscript/development/classroom-snapshot-exporter/ContentExtractor.test.js
 */

/**
 * Test assignment type detection with various titles
 */
function testAssignmentTypeDetection() {
  console.log('Testing Assignment Type Detection...');
  
  const testCases = [
    // Coding assignments
    { title: 'Karel Programming Quiz', workType: 'SHORT_ANSWER_QUESTION', expected: 'coding' },
    { title: 'Introduction to Coding - Quiz 1', workType: 'MULTIPLE_CHOICE_QUESTION', expected: 'coding' },
    { title: 'Functions and Loops Programming Test', workType: 'SHORT_ANSWER_QUESTION', expected: 'coding' },
    { title: 'Code Writing Assessment', workType: 'SHORT_ANSWER_QUESTION', expected: 'coding' },
    { title: 'Algorithm Design Quiz', workType: 'MULTIPLE_CHOICE_QUESTION', expected: 'coding' },
    
    // Regular quizzes
    { title: 'Math Quiz Chapter 5', workType: 'MULTIPLE_CHOICE_QUESTION', expected: 'quiz' },
    { title: 'History Test - World War II', workType: 'SHORT_ANSWER_QUESTION', expected: 'quiz' },
    { title: 'Science Quiz: Photosynthesis', workType: 'MULTIPLE_CHOICE_QUESTION', expected: 'quiz' },
    { title: 'Grammar and Punctuation Quiz', workType: 'SHORT_ANSWER_QUESTION', expected: 'quiz' },
    
    // Written assignments
    { title: 'Essay on Climate Change', workType: 'ASSIGNMENT', expected: 'written' },
    { title: 'Research Project', workType: 'ASSIGNMENT', expected: 'written' },
    { title: 'Lab Report', workType: 'ASSIGNMENT', expected: 'written' }
  ];
  
  for (const testCase of testCases) {
    const mockCourseWork = {
      id: 'test-id',
      title: testCase.title,
      workType: testCase.workType,
      maxPoints: 100
    };
    
    const result = SchemaAdapters.adaptAssignment(mockCourseWork);
    const passed = result.type === testCase.expected;
    
    console.log(`${passed ? '✅' : '❌'} "${testCase.title}" -> Expected: ${testCase.expected}, Got: ${result.type}`);
    
    if (!passed) {
      console.error(`Failed test case:`, testCase);
    }
  }
  
  console.log('Assignment type detection tests completed.\n');
}

/**
 * Test content extraction from submission data
 */
function testSubmissionContentExtraction() {
  console.log('Testing Submission Content Extraction...');
  
  // Test short answer submission
  const shortAnswerSubmission = {
    id: 'test-submission-1',
    shortAnswerSubmission: {
      answer: 'This is a test short answer response with some karel commands: move(); turnLeft(); pickBeeper();'
    },
    state: 'TURNED_IN'
  };
  
  const codingAssignment = {
    type: 'coding',
    title: 'Karel Programming Quiz',
    maxScore: 10
  };
  
  const mockStudent = {
    email: 'test@student.com',
    name: 'Test Student'
  };
  
  const result = SchemaAdapters.adaptSubmission(shortAnswerSubmission, codingAssignment, mockStudent);
  
  console.log('Short Answer Submission Test:');
  console.log('✅ Extracted Content:', result.extractedContent);
  console.log('✅ AI Processing Status:', result.aiProcessingStatus);
  
  // Test detection of coding content
  const hasCodingContent = ContentExtractor.detectCodingContent(result.extractedContent.text);
  console.log(`✅ Coding content detected: ${hasCodingContent}`);
  
  console.log('Submission content extraction tests completed.\n');
}

/**
 * Test ContentExtractor methods with mock data
 */
function testContentExtractorMethods() {
  console.log('Testing ContentExtractor Methods...');
  
  // Test coding content detection
  const testTexts = [
    'This is a regular text answer',
    'Karel should move() and then turnLeft()',
    'Write a function that does something',
    'def calculate_sum(): return x + y',
    'The program should use a for loop',
    'Math problem: solve 2x + 3 = 7'
  ];
  
  console.log('Coding Content Detection Tests:');
  for (const text of testTexts) {
    const isCoding = ContentExtractor.detectCodingContent(text);
    console.log(`${isCoding ? '🔧' : '📝'} "${text.slice(0, 30)}..." -> ${isCoding ? 'CODING' : 'REGULAR'}`);
  }
  
  console.log('ContentExtractor method tests completed.\n');
}

/**
 * Run all tests
 */
function runAllTests() {
  console.log('Starting Content Extraction Tests...\n');
  
  try {
    testAssignmentTypeDetection();
    testSubmissionContentExtraction();
    testContentExtractorMethods();
    
    console.log('🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  }
}

/**
 * Test with actual Google Drive file (requires file ID)
 * Run this manually with a real Google Doc ID from your Drive
 */
function testRealDocExtraction() {
  console.log('Testing Real Document Extraction...');
  
  // Replace with actual Google Doc ID for testing
  const testDocId = 'YOUR_GOOGLE_DOC_ID_HERE';
  
  try {
    const result = ContentExtractor.extractDocContent(testDocId);
    console.log('✅ Document extraction successful:');
    console.log('Text length:', result.text.length);
    console.log('Word count:', result.wordCount);
    console.log('Metadata:', result.metadata);
    
    // Test coding detection on extracted content
    const isCoding = ContentExtractor.detectCodingContent(result.text);
    console.log('Coding content detected:', isCoding);
    
  } catch (error) {
    console.error('❌ Document extraction failed:', error);
    console.log('Note: Replace testDocId with actual Google Doc ID to test');
  }
}

/**
 * Test form response extraction (requires form ID and response)
 */
function testRealFormExtraction() {
  console.log('Testing Real Form Extraction...');
  
  // Replace with actual Google Form ID for testing
  const testFormId = 'YOUR_GOOGLE_FORM_ID_HERE';
  
  try {
    const result = ContentExtractor.extractFormResponse(testFormId);
    console.log('✅ Form extraction successful:');
    console.log('Response count:', Object.keys(result.responses).length);
    console.log('Metadata:', result.metadata);
    
  } catch (error) {
    console.error('❌ Form extraction failed:', error);
    console.log('Note: Replace testFormId with actual Google Form ID to test');
  }
}