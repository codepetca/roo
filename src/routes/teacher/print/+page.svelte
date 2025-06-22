<script lang="ts">
  import { onMount } from 'svelte'
  import { authStore } from '$lib/stores/auth.svelte.js'
  import { goto } from '$app/navigation'
  import Markdown from '$lib/components/Markdown.svelte'
  import type { Question } from '$lib/types/index.js'
  
  let questions = $state<Question[]>([])
  let selectedQuestions = $state<Question[]>([])
  let showQuestionSheet = $state<boolean>(false)
  let showAnswerSheet = $state<boolean>(false)
  
  // Redirect if not a teacher
  $effect(() => {
    if (authStore.profile && authStore.profile.role !== 'teacher') {
      goto('/student')
    }
  })

  async function loadQuestions(): Promise<void> {
    try {
      const response = await fetch('/api/questions')
      const data = await response.json()
      questions = data.questions || []
    } catch (error: unknown) {
      // Failed to load questions
    }
  }

  function toggleQuestion(question: Question): void {
    if (selectedQuestions.find(q => q.id === question.id)) {
      selectedQuestions = selectedQuestions.filter(q => q.id !== question.id)
    } else if (selectedQuestions.length < 2) {
      selectedQuestions = [...selectedQuestions, question]
    }
  }

  function printQuestionSheet(): void {
    showQuestionSheet = true
    setTimeout(() => window.print(), 100)
  }

  function printAnswerSheet(): void {
    showAnswerSheet = true
    setTimeout(() => window.print(), 100)
  }

  function closePrintView(): void {
    showQuestionSheet = false
    showAnswerSheet = false
  }

  function extractMethodSignature(questionText: string): string {
    // Look for method signature patterns like `public type methodName(params)`
    const signatureMatch = questionText.match(/`([^`]*public[^`]*\([^)]*\))`/)
    if (signatureMatch) {
      return signatureMatch[1]
    }
    
    // Fallback: look for any text between backticks that looks like a method
    const methodMatch = questionText.match(/`([^`]*\([^)]*\))`/)
    if (methodMatch) {
      return methodMatch[1]
    }
    
    // Last resort: return empty string
    return ''
  }

  onMount(() => {
    loadQuestions()
  })
</script>

<svelte:head>
  <style>
    @media print {
      body * {
        visibility: hidden;
      }
      .print-content, .print-content * {
        visibility: visible;
      }
      .print-content {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
      }
      .no-print {
        display: none !important;
      }
      @page {
        margin: 0.5in;
        size: letter;
      }
    }
  </style>
</svelte:head>

{#if !showQuestionSheet && !showAnswerSheet}
  <div class="max-w-4xl mx-auto p-6">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900">Print Question & Answer Sheets</h1>
      <p class="text-gray-600 mt-2">Generate printable materials for classroom use</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Question Selection -->
      <div class="card">
        <h2 class="text-xl font-semibold mb-4">Select Questions (Max 2)</h2>
        
        {#if questions.length === 0}
          <p class="text-gray-500 text-center py-8">
            No questions available. <a href="/teacher" class="text-blue-600">Generate some questions first</a>.
          </p>
        {:else}
          <div class="space-y-3 mb-6 max-h-96 overflow-y-auto">
            {#each questions as question}
              <label class="flex items-start space-x-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={!!selectedQuestions.find(q => q.id === question.id)}
                  onchange={() => toggleQuestion(question)}
                  disabled={selectedQuestions.length >= 2 && !selectedQuestions.find(q => q.id === question.id)}
                  class="mt-1"
                />
                <div class="flex-1">
                  <p class="text-sm font-medium text-gray-900">
                    {question.question_text.slice(0, 100)}...
                  </p>
                  <p class="text-xs text-gray-500">
                    Concepts: {question.concepts?.join(', ') || 'N/A'}
                  </p>
                </div>
              </label>
            {/each}
          </div>
        {/if}

        <div class="text-sm text-gray-600">
          Selected: {selectedQuestions.length}/2 questions
        </div>
      </div>

      <!-- Print Options -->
      <div class="card">
        <h2 class="text-xl font-semibold mb-4">Print Options</h2>
        
        <div class="space-y-4">
          <button 
            onclick={printQuestionSheet}
            disabled={selectedQuestions.length === 0}
            class="w-full btn btn-primary disabled:opacity-50"
          >
            📄 Print Question Sheet
          </button>
          
          <button 
            onclick={printAnswerSheet}
            disabled={selectedQuestions.length === 0}
            class="w-full btn btn-secondary disabled:opacity-50"
          >
            📝 Print Answer Sheet
          </button>
        </div>

        <div class="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 class="font-medium text-blue-900 mb-2">Answer Sheet Features:</h3>
          <ul class="text-sm text-blue-800 space-y-1">
            <li>• Ruled lines for neat handwriting</li>
            <li>• Clear section boundaries</li>
            <li>• Optimized for photo capture</li>
            <li>• Student name & date fields</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="mt-8">
      <a href="/teacher" class="btn btn-secondary">← Back to Dashboard</a>
    </div>
  </div>
{/if}

<!-- Question Sheet Print View -->
{#if showQuestionSheet}
  <div class="print-content">
    <div class="max-w-none p-8 bg-white">
      <!-- Header -->
      <div class="text-center mb-8 border-b-2 border-gray-800 pb-4">
        <h1 class="text-2xl font-bold">Java Programming Assignment</h1>
        <div class="mt-4 flex justify-between text-sm">
          <div>Name: ________________________</div>
          <div>Date: ________________________</div>
          <div>Class: ________________________</div>
        </div>
      </div>

      <!-- Instructions -->
      <div class="mb-6 p-4 border border-gray-400">
        <h2 class="font-semibold mb-2">Instructions:</h2>
        <ul class="text-sm space-y-1">
          <li>• Write your Java code clearly and neatly</li>
          <li>• Use proper indentation and formatting</li>
          <li>• Include comments where appropriate</li>
          <li>• Check your syntax before submitting</li>
        </ul>
      </div>

      <!-- Questions -->
      {#each selectedQuestions as question, index}
        <div class="mb-8 {index < selectedQuestions.length - 1 ? 'border-b border-gray-300 pb-8' : ''}">
          <h2 class="text-lg font-semibold mb-4">Question {index + 1}:</h2>
          <div class="mb-4 p-4 border border-gray-300 bg-gray-50">
            <Markdown content={question.question_text} />
          </div>
          
          {#if question.concepts}
            <div class="text-sm text-gray-600">
              <strong>Concepts:</strong> {question.concepts.join(', ')}
            </div>
          {/if}
        </div>
      {/each}

      <!-- Footer -->
      <div class="text-center text-sm text-gray-600 mt-8 border-t border-gray-300 pt-4">
        Generated by Java Code Grader • Submit your answer sheet for AI-powered feedback
      </div>
    </div>
    
    <div class="no-print mt-4 text-center">
      <button onclick={closePrintView} class="btn btn-secondary">Close Print View</button>
    </div>
  </div>
{/if}

<!-- Answer Sheet Print View -->
{#if showAnswerSheet}
  <div class="print-content">
    <div class="max-w-none p-6 bg-white" style="font-family: Arial, sans-serif;">
      <!-- Header -->
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-xl font-bold">Answer Sheet</h1>
        <div class="flex space-x-8 text-sm font-medium">
          <div>Name: ____________________</div>
          <div>Student ID: ____________________</div>
        </div>
      </div>

      <!-- Answer sections for each question -->
      {#each selectedQuestions as question, index}
        <div class="mb-4">
          <!-- Question header -->
          <div class="bg-gray-100 border-2 border-black p-2 mb-2">
            <div class="flex justify-between items-center">
              <div class="text-sm font-mono text-gray-700 flex-1">
                {extractMethodSignature(question.question_text)}
              </div>
              <h2 class="text-lg font-bold text-right">QUESTION {index + 1}</h2>
            </div>
          </div>

          <!-- Ruled writing area -->
          <div class="border-2 border-black">
            <!-- Generate ruled lines -->
            {#each Array(13) as _, lineIndex}
              <div class="flex border-b border-gray-300" style="height: 32px;">
                <div class="w-8 bg-gray-50 border-r border-gray-400 text-xs text-gray-500 text-center" style="line-height: 32px;">
                  {lineIndex + 1}
                </div>
                <div class="flex-1 relative">
                  <!-- Light grid dots for alignment -->
                  <div class="absolute inset-0 opacity-20">
                    {#each Array(50) as _, dotIndex}
                      <span class="absolute text-gray-400" style="left: {(dotIndex * 12) + 24}px; top: 50%; transform: translateY(-50%);">·</span>
                    {/each}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/each}

    </div>
    
    <div class="no-print mt-4 text-center">
      <button onclick={closePrintView} class="btn btn-secondary">Close Print View</button>
    </div>
  </div>
{/if}