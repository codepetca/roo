<script lang="ts">
  import { onMount } from 'svelte'
  import { user, profile } from '$lib/stores/auth.js'
  import { goto } from '$app/navigation'
  import Markdown from '$lib/components/Markdown.svelte'
  import { addToast } from '$lib/stores/toast.js'
  
  // Use Svelte 5 runes for state management
  let questions = $state([])
  let selectedConcepts = $state(['variables', 'conditionals'])
  let generatingQuestion = $state(false)
  let uploadingImage = $state(false)
  let selectedQuestion = $state(null)
  let gradingResult = $state(null)
  let recentSubmissions = $state([])
  let modifyingQuestion = $state(null)
  let modificationPrompt = $state('')
  let isModifying = $state(false)
  
  const javaConcepts = [
    'variables', 'data-types', 'conditionals', 'loops', 
    'methods', 'arrays', 'strings', 'input-output'
  ]

  // Redirect if not a teacher
  $effect(() => {
    if ($profile && $profile.role !== 'teacher') {
      goto('/student')
    }
  })

  async function generateQuestion() {
    generatingQuestion = true
    try {
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concepts: selectedConcepts })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate question')
      }
      
      const data = await response.json()
      questions = [data.question, ...questions]
      
      // Show success message
      addToast('Question generated successfully!', 'success')
    } catch (error) {
      addToast('Error generating question: ' + error.message, 'error')
    } finally {
      generatingQuestion = false
    }
  }

  async function handleImageUpload(event) {
    const file = event.target.files[0]
    if (!file || !selectedQuestion) return

    uploadingImage = true
    gradingResult = null

    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('questionId', selectedQuestion.id)
      formData.append('studentId', 'demo-student-' + Date.now()) // Demo student ID
      formData.append('teacherId', $user?.id || 'demo-teacher')

      const response = await fetch('/api/grade', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to grade submission')
      }

      const data = await response.json()
      gradingResult = data.submission.gradingResult
      
      // Refresh submissions list
      await loadRecentSubmissions()
      
      // Clear file input
      event.target.value = ''
    } catch (error) {
      addToast('Error grading submission: ' + error.message, 'error')
    } finally {
      uploadingImage = false
    }
  }

  async function loadQuestions() {
    try {
      const response = await fetch('/api/questions')
      const data = await response.json()
      questions = data.questions || []
    } catch (error) {
      console.error('Failed to load questions:', error)
    }
  }

  async function loadRecentSubmissions() {
    if (!$user?.id) return
    
    try {
      const response = await fetch(`/api/submissions?teacherId=${$user.id}`)
      const data = await response.json()
      recentSubmissions = data.submissions || []
    } catch (error) {
      console.error('Failed to load submissions:', error)
    }
  }

  async function deleteQuestion(questionId) {
    if (!confirm('Are you sure you want to delete this question?')) {
      return
    }

    try {
      const response = await fetch(`/api/questions/${questionId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete question')
      }

      // Remove from local list
      questions = questions.filter(q => q.id !== questionId)
      
      // Also remove from selected question if it was selected
      if (selectedQuestion?.id === questionId) {
        selectedQuestion = null
      }
    } catch (error) {
      addToast('Error deleting question: ' + error.message, 'error')
    }
  }

  function startModifyQuestion(question) {
    modifyingQuestion = question
    modificationPrompt = ''
  }

  function cancelModifyQuestion() {
    modifyingQuestion = null
    modificationPrompt = ''
    isModifying = false
  }

  async function submitModifyQuestion() {
    if (!modificationPrompt.trim()) {
      addToast('Please enter a modification request', 'error')
      return
    }

    isModifying = true
    try {
      const response = await fetch(`/api/questions/${modifyingQuestion.id}/modify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modificationPrompt })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to modify question')
      }

      const data = await response.json()
      
      // Add the modified question to the top of the list
      questions = [data.question, ...questions]
      
      addToast('Question modified successfully!', 'success')
      cancelModifyQuestion()
    } catch (error) {
      addToast('Error modifying question: ' + error.message, 'error')
    } finally {
      isModifying = false
    }
  }

  onMount(async () => {
    await loadQuestions()
    await loadRecentSubmissions()
  })
</script>

<div class="max-w-7xl mx-auto p-6">
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-gray-900">Teacher Dashboard</h1>
    <p class="text-gray-600 mt-2">Generate questions and grade student submissions</p>
    
    <div class="mt-4">
      <a href="/teacher/print" class="btn btn-secondary">
        📄 Print Question & Answer Sheets
      </a>
    </div>
  </div>
  
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
    <!-- Question Generation -->
    <div class="card">
      <h2 class="text-xl font-semibold mb-4">Generate New Question</h2>
      
      <div class="mb-4">
        <label for="java-concepts" class="block text-sm font-medium text-gray-700 mb-2">
          Select Java Concepts:
        </label>
        <div class="grid grid-cols-2 gap-2" id="java-concepts">
          {#each javaConcepts as concept}
            <label class="flex items-center">
              <input 
                type="checkbox" 
                bind:group={selectedConcepts} 
                value={concept}
                class="mr-2 rounded"
              />
              <span class="text-sm">{concept}</span>
            </label>
          {/each}
        </div>
      </div>
      
      <button 
        onclick={generateQuestion}
        disabled={generatingQuestion || selectedConcepts.length === 0}
        class="btn btn-primary w-full"
      >
        {generatingQuestion ? 'Generating Question...' : 'Generate Question'}
      </button>
    </div>

    <!-- Image Upload and Grading -->
    <div class="card">
      <h2 class="text-xl font-semibold mb-4">Grade Student Submission</h2>
      
      <div class="mb-4">
        <label for="question-select" class="block text-sm font-medium text-gray-700 mb-2">
          Select Question:
        </label>
        <select bind:value={selectedQuestion} class="input" id="question-select">
          <option value={null}>Choose a question...</option>
          {#each questions as question}
            <option value={question}>
              {question.question_text.slice(0, 80)}...
            </option>
          {/each}
        </select>
      </div>
      
      <div class="mb-4">
        <label for="image-upload" class="block text-sm font-medium text-gray-700 mb-2">
          Upload Student Code Image:
        </label>
        <input 
          type="file" 
          accept="image/*"
          onchange={handleImageUpload}
          disabled={!selectedQuestion || uploadingImage}
          class="input"
          id="image-upload"
        />
        <p class="text-xs text-gray-500 mt-1">
          Accepts JPG, PNG, HEIC (max 10MB)
        </p>
      </div>
      
      {#if uploadingImage}
        <div class="text-center py-4">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p class="text-blue-600">Processing image and grading...</p>
        </div>
      {/if}
    </div>
  </div>

  <!-- Grading Results -->
  {#if gradingResult}
    <div class="card mb-8">
      <h2 class="text-xl font-semibold mb-4">Latest Grading Result</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 class="font-medium text-gray-900 mb-2">Extracted Code:</h3>
          <pre class="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
            <code>{gradingResult.extractedCode}</code>
          </pre>
        </div>
        
        <div>
          <h3 class="font-medium text-gray-900 mb-3">Scores & Feedback:</h3>
          
          <div class="space-y-3">
            <div class="flex justify-between items-center p-3 bg-blue-50 rounded">
              <span class="font-medium">Overall Score:</span>
              <span class="text-xl font-bold text-blue-600">
                {gradingResult.overallScore}/4.0
              </span>
            </div>
            
            {#each Object.entries(gradingResult.scores) as [category, score]}
              <div class="border-l-4 border-gray-300 pl-3">
                <div class="flex justify-between items-center mb-1">
                  <span class="font-medium capitalize">{category}:</span>
                  <span class="font-bold">{score}/4</span>
                </div>
                <p class="text-sm text-gray-600">
                  {gradingResult.feedback[category]}
                </p>
              </div>
            {/each}
            
            {#if gradingResult.generalComments}
              <div class="bg-yellow-50 p-3 rounded">
                <h4 class="font-medium text-yellow-800 mb-1">General Comments:</h4>
                <p class="text-sm text-yellow-700">{gradingResult.generalComments}</p>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Generated Questions List -->
  <div class="card mb-8">
    <h2 class="text-xl font-semibold mb-4">Generated Questions ({questions.length})</h2>
    
    {#if questions.length === 0}
      <p class="text-gray-500 text-center py-8">
        No questions generated yet. Create your first question above!
      </p>
    {:else}
      <div class="space-y-4">
        {#each questions as question}
          <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 relative group">
            <!-- Action buttons -->
            <div class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onclick={() => startModifyQuestion(question)}
                class="w-6 h-6 rounded-full bg-blue-500 text-white text-xs hover:bg-blue-600 flex items-center justify-center"
                title="Modify question"
              >
                ✏
              </button>
              <button 
                onclick={() => deleteQuestion(question.id)}
                class="w-6 h-6 rounded-full bg-red-500 text-white text-xs hover:bg-red-600 flex items-center justify-center"
                title="Delete question"
              >
                ×
              </button>
            </div>
            
            <div class="font-medium text-gray-900 mb-2 pr-16">
              <Markdown content={question.question_text} />
            </div>
            <div class="flex items-center justify-between text-sm text-gray-600">
              <span>Concepts: {question.java_concepts?.join(', ') || 'N/A'}</span>
              <span>Created: {new Date(question.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Question Modification Modal -->
  {#if modifyingQuestion}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-semibold text-gray-900">Modify Question</h3>
            <button 
              onclick={cancelModifyQuestion}
              class="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <div class="mb-4">
            <h4 class="font-medium text-gray-700 mb-2">Original Question:</h4>
            <div class="bg-gray-50 p-3 rounded border text-sm">
              <Markdown content={modifyingQuestion.question_text} />
            </div>
          </div>
          
          <div class="mb-6">
            <label for="modification-prompt" class="block text-sm font-medium text-gray-700 mb-2">
              Modification Request:
            </label>
            <textarea
              id="modification-prompt"
              bind:value={modificationPrompt}
              placeholder="Describe how you'd like to modify this question. For example: 'for full marks use 1 line boolean' or 'make it focus more on loops' or 'simplify for beginners'"
              class="w-full h-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              disabled={isModifying}
            ></textarea>
            <p class="text-xs text-gray-500 mt-1">
              Be specific about what changes you want to see in the question.
            </p>
          </div>
          
          <div class="flex gap-3 justify-end">
            <button
              onclick={cancelModifyQuestion}
              disabled={isModifying}
              class="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onclick={submitModifyQuestion}
              disabled={isModifying || !modificationPrompt.trim()}
              class="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md disabled:opacity-50 flex items-center gap-2"
            >
              {#if isModifying}
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Generating...
              {:else}
                Generate Modified Question
              {/if}
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Recent Submissions -->
  <div class="card">
    <h2 class="text-xl font-semibold mb-4">Recent Submissions ({recentSubmissions.length})</h2>
    
    {#if recentSubmissions.length === 0}
      <p class="text-gray-500 text-center py-8">
        No submissions yet. Grade your first submission above!
      </p>
    {:else}
      <div class="space-y-4">
        {#each recentSubmissions as submission}
          <div class="border border-gray-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="font-medium text-gray-900">
                Student: {submission.profiles?.full_name || 'Demo Student'}
              </span>
              <span class="text-sm text-gray-600">
                {new Date(submission.created_at).toLocaleDateString()}
              </span>
            </div>
            <p class="text-sm text-gray-600 mb-2">
              Question: {submission.java_questions?.question_text?.slice(0, 100)}...
            </p>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-600">
                Status: <span class="capitalize">{submission.status}</span>
              </span>
              {#if submission.overall_score}
                <span class="font-bold text-blue-600">
                  Score: {submission.overall_score}/4.0
                </span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>