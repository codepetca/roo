<!--
  Validation Test Component
  Purpose: Test Zod validation directly to identify schema mismatches
-->
<script lang="ts">
  import { z } from 'zod';
  import { teacherDashboardSchema } from '@shared/schemas/core';
  
  let testData = $state<any>(null);
  let validationResult = $state<string>('not tested');
  
  // Test data that matches what we see in the API response
  function testValidation() {
    // Sample data structure based on what we see in the API
    testData = {
      "success": true,
      "data": {
        "teacher": {
          "id": "test-id",
          "email": "teacher@test.com",
          "name": "teacher",
          "role": "teacher",
          "schoolEmail": "test.codepet@gmail.com",
          "classroomIds": [],
          "totalStudents": 0,
          "totalClassrooms": 0,
          "createdAt": "2025-08-11T13:26:17.000Z",
          "updatedAt": "2025-08-11T13:16:16.000Z"
        },
        "classrooms": [
          {
            "teacherId": "test.codepet@gmail.com",
            "name": "11 CS P1",
            "id": "test-classroom",
            "createdAt": "2025-01-01T00:00:00.000Z",
            "updatedAt": "2025-01-01T00:00:00.000Z",
            "studentCount": 5,
            "assignmentCount": 3,
            "activeSubmissions": 0,
            "ungradedSubmissions": 0,
            "assignments": [
              {
                "id": "test-assignment",
                "classroomId": "test-classroom",
                "name": "Test Assignment",
                "createdAt": "2025-01-01T00:00:00.000Z",
                "updatedAt": "2025-01-01T00:00:00.000Z",
                "submissionCount": 0,
                "gradedCount": 0,
                "pendingCount": 0
              }
            ]
          }
        ],
        "recentActivity": [],
        "stats": {
          "totalStudents": 5,
          "totalAssignments": 3,
          "ungradedSubmissions": 0,
          "averageGrade": 85.5
        }
      }
    };
    
    try {
      console.log('🧪 Testing validation with schema...');
      console.log('Data to validate:', testData.data);
      
      const result = teacherDashboardSchema.parse(testData.data);
      validationResult = `✅ Validation successful: ${result.classrooms.length} classrooms`;
      console.log('✅ Validation passed:', result);
    } catch (error) {
      validationResult = `❌ Validation failed: ${error instanceof Error ? error.message : String(error)}`;
      console.error('❌ Validation failed:', error);
      
      if (error instanceof z.ZodError) {
        console.error('Detailed validation errors:', error.issues);
        validationResult += `\n\nDetailed errors:\n${error.issues.map(issue => 
          `Path: ${issue.path.join('.')} - ${issue.message}`
        ).join('\n')}`;
      }
    }
  }
</script>

<div class="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 space-y-4">
  <h3 class="text-lg font-bold text-purple-800">🧪 Schema Validation Test</h3>
  
  <button 
    onclick={testValidation}
    class="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
  >
    Test Schema Validation
  </button>
  
  {#if validationResult !== 'not tested'}
    <div class="bg-white border rounded p-3">
      <h4 class="font-semibold text-gray-700">Validation Result:</h4>
      <pre class="text-sm mt-1 whitespace-pre-wrap {validationResult.startsWith('✅') ? 'text-green-600' : 'text-red-600'}">{validationResult}</pre>
    </div>
  {/if}
  
  {#if testData}
    <div class="bg-white border rounded p-2 max-h-48 overflow-auto">
      <h4 class="font-semibold text-gray-700">Test Data Structure:</h4>
      <pre class="text-xs">{JSON.stringify(testData.data, null, 2)}</pre>
    </div>
  {/if}
</div>

<style>
  pre {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  }
</style>