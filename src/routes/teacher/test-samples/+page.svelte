<script lang="ts">
  import { onMount } from 'svelte'
  import { 
    generateTestSamples, 
    downloadSample, 
    sampleToFile, 
    HANDWRITING_STYLES,
    type HandwritingSample 
  } from '$lib/utils/handwriting-generator.js'

  let samples = $state<HandwritingSample[]>([])
  let generating = $state(false)
  let selectedSample = $state<HandwritingSample | null>(null)
  let testingGrading = $state(false)
  let gradingResults = $state<any[]>([])

  function generateSamples(): void {
    generating = true
    try {
      samples = generateTestSamples()
    } catch (error) {
      // Error generating samples
      alert('Error generating samples. Check console for details.')
    } finally {
      generating = false
    }
  }

  function downloadAll(): void {
    samples.forEach((sample, index) => {
      const filename = `handwriting-sample-${index + 1}.png`
      setTimeout(() => downloadSample(sample, filename), index * 100)
    })
  }

  async function testGradingSample(sample: HandwritingSample): Promise<void> {
    testingGrading = true
    try {
      // Convert sample to file
      const file = sampleToFile(sample, 'test-handwriting.png')
      
      // Create form data
      const formData = new FormData()
      formData.append('image', file)
      formData.append('questionId', 'test-question-id') // You'll need a real question ID
      formData.append('studentId', 'test-student-id')
      formData.append('teacherId', 'test-teacher-id')

      const response = await fetch('/api/grade', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Grading failed: ${response.statusText}`)
      }

      const result = await response.json()
      gradingResults = [...gradingResults, {
        originalCode: sample.code,
        extractedCode: result.submission?.gradingResult?.extractedCode,
        scores: result.submission?.gradingResult?.scores,
        expectedGrade: sample.expectedGrade,
        accuracy: calculateAccuracy(result.submission?.gradingResult?.scores, sample.expectedGrade)
      }]

      alert('Grading test completed! Check results below.')
    } catch (error) {
      // Grading test error
      alert('Grading test failed: ' + (error as Error).message)
    } finally {
      testingGrading = false
    }
  }

  function calculateAccuracy(actual: any, expected: any): number {
    if (!actual || !expected) return 0
    
    const categories = ['communication', 'correctness', 'logic']
    let totalDiff = 0
    
    categories.forEach(cat => {
      const diff = Math.abs((actual[cat] || 0) - (expected[cat] || 0))
      totalDiff += diff
    })
    
    // Convert to percentage accuracy (4 is max diff per category)
    return Math.max(0, 100 - (totalDiff / (categories.length * 4)) * 100)
  }

  onMount(() => {
    // Auto-generate samples on page load
    generateSamples()
  })
</script>

<div class="max-w-6xl mx-auto p-6">
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-gray-900 mb-2">Handwriting Test Samples</h1>
    <p class="text-gray-600">Generate synthetic handwritten Java code for testing the grading system</p>
  </div>

  <!-- Controls -->
  <div class="bg-white rounded-lg shadow p-6 mb-8">
    <h2 class="text-xl font-semibold mb-4">Controls</h2>
    <div class="flex flex-wrap gap-4">
      <button 
        onclick={generateSamples}
        disabled={generating}
        class="btn btn-primary"
      >
        {generating ? 'Generating...' : 'Generate New Samples'}
      </button>
      
      <button 
        onclick={downloadAll}
        disabled={samples.length === 0}
        class="btn btn-secondary"
      >
        Download All Samples ({samples.length})
      </button>
      
      <div class="text-sm text-gray-600 flex items-center">
        <span>✨ Generated {samples.length} samples with {Object.keys(HANDWRITING_STYLES).length} different handwriting styles</span>
      </div>
    </div>
  </div>

  <!-- Sample Gallery -->
  <div class="bg-white rounded-lg shadow p-6 mb-8">
    <h2 class="text-xl font-semibold mb-4">Generated Samples</h2>
    
    {#if samples.length === 0}
      <p class="text-gray-500 text-center py-8">No samples generated yet. Click "Generate New Samples" above.</p>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each samples.slice(0, 12) as sample, index}
          <div class="border border-gray-200 rounded-lg p-4">
            <div class="mb-3">
              <h3 class="font-medium text-sm text-gray-700 mb-1">Sample {index + 1}</h3>
              <div class="text-xs text-gray-500 mb-1">
                Font: {sample.style.fontFamily.split(',')[0]}
              </div>
              <div class="text-xs text-gray-500">
                Expected: C:{sample.expectedGrade?.communication} | Cr:{sample.expectedGrade?.correctness} | L:{sample.expectedGrade?.logic}
              </div>
            </div>
            
            <!-- Handwritten Image -->
            <div class="mb-3 border rounded overflow-hidden">
              <img 
                src={sample.imageData} 
                alt="Handwritten code sample {index + 1}"
                class="w-full h-32 object-cover cursor-pointer hover:opacity-80"
                onclick={() => selectedSample = sample}
              />
            </div>
            
            <!-- Actions -->
            <div class="flex gap-2">
              <button 
                onclick={() => downloadSample(sample, `sample-${index + 1}.png`)}
                class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
              >
                Download
              </button>
              <button 
                onclick={() => testGradingSample(sample)}
                disabled={testingGrading}
                class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 disabled:opacity-50"
              >
                Test Grade
              </button>
            </div>
          </div>
        {/each}
      </div>
      
      {#if samples.length > 12}
        <p class="text-center text-gray-500 mt-4">
          Showing first 12 of {samples.length} samples. Download all to see complete set.
        </p>
      {/if}
    {/if}
  </div>

  <!-- Grading Test Results -->
  {#if gradingResults.length > 0}
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-semibold mb-4">Grading Test Results</h2>
      
      <div class="space-y-4">
        {#each gradingResults as result, index}
          <div class="border border-gray-200 rounded p-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Original Code -->
              <div>
                <h4 class="font-medium text-sm text-gray-700 mb-2">Original Code:</h4>
                <pre class="bg-gray-50 p-2 rounded text-xs font-mono">{result.originalCode}</pre>
              </div>
              
              <!-- Extracted Code -->
              <div>
                <h4 class="font-medium text-sm text-gray-700 mb-2">AI Extracted:</h4>
                <pre class="bg-gray-50 p-2 rounded text-xs font-mono">{result.extractedCode || 'Not extracted'}</pre>
              </div>
            </div>
            
            <!-- Scores Comparison -->
            <div class="mt-4">
              <h4 class="font-medium text-sm text-gray-700 mb-2">Score Comparison:</h4>
              <div class="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <span class="font-medium">Communication:</span>
                  <span class="ml-1">Expected: {result.expectedGrade?.communication}</span>
                  <span class="ml-1">Actual: {result.scores?.communication || 'N/A'}</span>
                </div>
                <div>
                  <span class="font-medium">Correctness:</span>
                  <span class="ml-1">Expected: {result.expectedGrade?.correctness}</span>
                  <span class="ml-1">Actual: {result.scores?.correctness || 'N/A'}</span>
                </div>
                <div>
                  <span class="font-medium">Logic:</span>
                  <span class="ml-1">Expected: {result.expectedGrade?.logic}</span>
                  <span class="ml-1">Actual: {result.scores?.logic || 'N/A'}</span>
                </div>
              </div>
              <div class="mt-2">
                <span class="text-sm font-medium">Accuracy: {result.accuracy.toFixed(1)}%</span>
                <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    class="bg-blue-600 h-2 rounded-full" 
                    style="width: {result.accuracy}%"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Sample Detail Modal -->
  {#if selectedSample}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-semibold">Handwriting Sample Detail</h3>
            <button 
              onclick={() => selectedSample = null}
              class="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
          
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Image -->
            <div>
              <h4 class="font-medium mb-2">Handwritten Code:</h4>
              <img 
                src={selectedSample.imageData} 
                alt="Handwritten code sample"
                class="w-full border rounded"
              />
            </div>
            
            <!-- Code and Details -->
            <div>
              <h4 class="font-medium mb-2">Original Code:</h4>
              <pre class="bg-gray-50 p-3 rounded text-sm font-mono mb-4">{selectedSample.code}</pre>
              
              <h4 class="font-medium mb-2">Expected Grades:</h4>
              <div class="bg-gray-50 p-3 rounded text-sm">
                <div>Communication: {selectedSample.expectedGrade?.communication}/4</div>
                <div>Correctness: {selectedSample.expectedGrade?.correctness}/4</div>
                <div>Logic: {selectedSample.expectedGrade?.logic}/4</div>
              </div>
              
              <div class="mt-4 flex gap-2">
                <button 
                  onclick={() => downloadSample(selectedSample!, 'sample-detail.png')}
                  class="btn btn-secondary"
                >
                  Download Image
                </button>
                <button 
                  onclick={() => testGradingSample(selectedSample!)}
                  disabled={testingGrading}
                  class="btn btn-primary"
                >
                  {testingGrading ? 'Testing...' : 'Test Grading'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .btn {
    @apply px-4 py-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed;
  }
  
  .btn-primary {
    @apply bg-blue-500 text-white hover:bg-blue-600;
  }
  
  .btn-secondary {
    @apply bg-gray-500 text-white hover:bg-gray-600;
  }
</style>