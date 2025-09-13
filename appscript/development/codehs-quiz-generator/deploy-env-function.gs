/**
 * AUTO-GENERATED: Environment Variables Setup
 * Run this function once to configure Script Properties
 */
function deployEnvironmentVariables() {
  console.log('🔧 Setting up environment variables...');
  
  const properties = {
    'GEMINI_API_KEY': 'AIzaSyAe4fXH5N2Je7YkjI7QfYme1DjzZih43dI'
  };
  
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperties(properties);
  
  console.log('✅ Environment variables configured successfully!');
  console.log('   - GEMINI_API_KEY');
  
  return {
    success: true,
    message: 'Environment variables deployed',
    variables: Object.keys(properties)
  };
}

/**
 * Verify that all required environment variables are set
 */
function verifyEnvironmentSetup() {
  const required = ['GEMINI_API_KEY'];
  const missing = [];
  
  const scriptProperties = PropertiesService.getScriptProperties();
  
  required.forEach(key => {
    const value = scriptProperties.getProperty(key);
    if (!value || value === 'your-gemini-api-key-here') {
      missing.push(key);
    }
  });
  
  if (missing.length > 0) {
    console.error('❌ Missing or invalid environment variables:', missing);
    return { success: false, missing: missing };
  }
  
  console.log('✅ All environment variables configured correctly');
  return { success: true, message: 'Environment setup verified' };
}