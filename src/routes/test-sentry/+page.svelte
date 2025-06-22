<script lang="ts">
  import * as Sentry from '@sentry/sveltekit';
  
  function testClientError() {
    console.log('Testing client error...');
    try {
      throw new Error('Manual Sentry Test - Client Error');
    } catch (error: unknown) {
      Sentry.captureException(error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log('Error sent to Sentry:', errorMsg);
    }
  }
  
  async function testServerError() {
    console.log('Testing server error...');
    try {
      const response = await fetch('/test-sentry/api');
      if (!response.ok) {
        throw new Error('Server error response received');
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log('Server error occurred:', errorMsg);
    }
  }
</script>

<div class="p-8">
  <h1 class="text-2xl font-bold mb-4">Sentry Integration Test</h1>
  
  <div class="space-y-4">
    <button 
      onclick={testClientError}
      class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
    >
      Test Client Error
    </button>
    
    <button 
      onclick={testServerError}
      class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
    >
      Test Server Error
    </button>
  </div>
  
  <div class="mt-4 text-sm text-gray-600">
    <p>Click the buttons above to test Sentry error reporting.</p>
    <p>Check your browser console for logs and your Sentry dashboard for captured errors.</p>
  </div>
</div>