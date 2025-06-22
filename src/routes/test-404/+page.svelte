<script lang="ts">
  import { goto } from '$app/navigation'
  import * as Sentry from '@sentry/sveltekit'

  function testClientSide404() {
    // This will trigger a client-side navigation to a non-existent route
    goto('/this-route-does-not-exist')
  }

  function testServerSide404() {
    // This will trigger a server request to a non-existent API endpoint
    fetch('/api/this-endpoint-does-not-exist')
      .then(response => {
        if (!response.ok) {
          // Manually report the 404 to Sentry if needed
          Sentry.captureException(new Error(`API 404: ${response.url}`), {
            tags: {
              error_type: 'api_404',
              status_code: response.status.toString()
            },
            extra: {
              url: response.url,
              status: response.status
            }
          })
        }
      })
      .catch(error => {
        Sentry.captureException(error)
      })
  }

  function testJavaScriptError() {
    // This will trigger a JavaScript error that should be caught by Sentry
    throw new Error('Test JavaScript Error for Sentry')
  }
</script>

<div class="max-w-2xl mx-auto p-6">
  <h1 class="text-2xl font-bold mb-6">Sentry 404 Testing</h1>
  
  <div class="space-y-4">
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h2 class="font-semibold text-blue-900 mb-2">Client-Side 404 Test</h2>
      <p class="text-blue-700 text-sm mb-3">
        This will navigate to a non-existent route, which should trigger a 404 error that Sentry captures.
      </p>
      <button
        onclick={testClientSide404}
        class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Test Client 404
      </button>
    </div>

    <div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
      <h2 class="font-semibold text-orange-900 mb-2">Server-Side 404 Test</h2>
      <p class="text-orange-700 text-sm mb-3">
        This will make a request to a non-existent API endpoint.
      </p>
      <button
        onclick={testServerSide404}
        class="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
      >
        Test API 404
      </button>
    </div>

    <div class="bg-red-50 border border-red-200 rounded-lg p-4">
      <h2 class="font-semibold text-red-900 mb-2">JavaScript Error Test</h2>
      <p class="text-red-700 text-sm mb-3">
        This will throw a JavaScript error for comparison.
      </p>
      <button
        onclick={testJavaScriptError}
        class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
      >
        Test JS Error
      </button>
    </div>
  </div>

  <div class="mt-8 p-4 bg-gray-50 rounded-lg">
    <h3 class="font-semibold text-gray-900 mb-2">Instructions:</h3>
    <ol class="list-decimal list-inside text-sm text-gray-700 space-y-1">
      <li>Click each test button to trigger different types of errors</li>
      <li>Check your browser console for logged errors</li>
      <li>Check your Sentry dashboard to see if the errors are captured</li>
      <li>Look for issues tagged with "navigation_error", "api_404", etc.</li>
    </ol>
  </div>

  <div class="mt-4">
    <a href="/" class="text-blue-600 hover:text-blue-800 underline">
      ← Back to Home
    </a>
  </div>
</div>