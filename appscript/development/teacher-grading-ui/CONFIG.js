/**
 * Configuration File for Roo Teacher Grading Portal
 * Centralized configuration for API keys and settings
 */

/**
 * API Key Management using PropertiesService
 * 
 * API keys are stored securely using Google Apps Script's PropertiesService
 * This keeps sensitive data out of the codebase and allows per-deployment configuration
 */

// Property keys for storing configuration
function getPropertyKeys() {
  return {
    GEMINI_API_KEY: 'GEMINI_API_KEY',
    AI_GRADING_ENABLED: 'AI_GRADING_ENABLED',
    DEBUG_ENABLED: 'DEBUG_ENABLED',
    USE_MOCK_DATA: 'USE_MOCK_DATA'
  };
}

/**
 * Get Gemini API key from PropertiesService
 */
function getGeminiApiKey() {
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty(getPropertyKeys().GEMINI_API_KEY);
    return apiKey || null;
  } catch (error) {
    console.error('Error reading Gemini API key from properties:', error);
    return null;
  }
}

/**
 * Set Gemini API key in PropertiesService
 * @param {string} apiKey - The Gemini API key
 */
function setGeminiApiKey(apiKey) {
  try {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('Invalid API key provided');
    }
    
    if (apiKey.length < 20) {
      throw new Error('API key appears to be invalid (too short)');
    }
    
    PropertiesService.getScriptProperties().setProperty(getPropertyKeys().GEMINI_API_KEY, apiKey);
    console.log('✅ Gemini API key set successfully');
    return true;
  } catch (error) {
    console.error('❌ Error setting Gemini API key:', error.toString());
    return false;
  }
}

/**
 * Clear Gemini API key from PropertiesService
 */
function clearGeminiApiKey() {
  try {
    PropertiesService.getScriptProperties().deleteProperty(getPropertyKeys().GEMINI_API_KEY);
    console.log('✅ Gemini API key cleared');
    return true;
  } catch (error) {
    console.error('❌ Error clearing Gemini API key:', error.toString());
    return false;
  }
}

/**
 * Get configuration setting from PropertiesService
 */
function getConfigProperty(key, defaultValue = null) {
  try {
    const value = PropertiesService.getScriptProperties().getProperty(key);
    if (value === null) return defaultValue;
    
    // Handle boolean values
    if (value === 'true') return true;
    if (value === 'false') return false;
    
    return value;
  } catch (error) {
    console.error(`Error reading property ${key}:`, error);
    return defaultValue;
  }
}

/**
 * Set configuration setting in PropertiesService
 */
function setConfigProperty(key, value) {
  try {
    PropertiesService.getScriptProperties().setProperty(key, String(value));
    return true;
  } catch (error) {
    console.error(`Error setting property ${key}:`, error);
    return false;
  }
}

/**
 * Configuration Constants
 */
/**
 * Get dynamic configuration using PropertiesService
 */
function getAppConfig() {
  return {
    // AI Grading Configuration
    GEMINI: {
      API_KEY: getGeminiApiKey(),
      MODEL: 'gemini-1.5-flash',
      API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/',
      MAX_RETRIES: 3,
      RETRY_DELAY: 1000,
      DEFAULT_TEMPERATURE: 0.3,
      DEFAULT_MAX_TOKENS: 2000
    },
    
    // App Behavior (from PropertiesService with defaults)
    USE_MOCK_DATA: getConfigProperty(getPropertyKeys().USE_MOCK_DATA, false),
    DEBUG_ENABLED: getConfigProperty(getPropertyKeys().DEBUG_ENABLED, true),
    
    // Cache Configuration
    CACHE_EXPIRATION_MINUTES: 30,
    
    // Future Firebase Functions Configuration
    FIREBASE: {
      FUNCTIONS_URL: 'https://your-project.cloudfunctions.net/api/v2',
      API_KEY: 'your-firebase-api-key'
    }
  };
}

/**
 * Validation Functions
 */
function validateGeminiApiKey() {
  const apiKey = getGeminiApiKey();
  
  if (!apiKey) {
    return false;
  }
  
  if (apiKey.length < 20) {
    return false;
  }
  
  return true;
}

/**
 * Get Gemini configuration with validation
 */
function getGeminiConfig() {
  const apiKey = getGeminiApiKey();
  const isValid = validateGeminiApiKey();
  
  return {
    API_KEY: apiKey,
    MODEL: 'gemini-1.5-flash',
    API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/',
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    DEFAULT_TEMPERATURE: 0.3,
    DEFAULT_MAX_TOKENS: 2000,
    isConfigured: isValid,
    validationMessage: isValid ? 'API key configured' : 'API key not configured or invalid'
  };
}

/**
 * Check if AI grading is properly configured
 */
function isAIGradingConfigured() {
  return validateGeminiApiKey();
}

/**
 * Get configuration status for debugging
 */
function getConfigurationStatus() {
  const apiKey = getGeminiApiKey();
  const appConfig = getAppConfig();
  
  return {
    geminiApiKey: {
      configured: validateGeminiApiKey(),
      keyLength: apiKey ? apiKey.length : 0,
      isStored: !!apiKey,
      isPlaceholder: false // No longer using placeholder
    },
    useMockData: appConfig.USE_MOCK_DATA,
    debugEnabled: appConfig.DEBUG_ENABLED,
    model: appConfig.GEMINI.MODEL,
    cacheExpiration: appConfig.CACHE_EXPIRATION_MINUTES,
    storageMethod: 'PropertiesService'
  };
}

/**
 * Setup and Management Functions
 */

/**
 * Easy setup function for API key configuration
 * Run this function in the Apps Script editor with your API key
 * 
 * @param {string} apiKey - Your Gemini API key from https://makersuite.google.com/app/apikey
 * 
 * Example usage:
 * setupGeminiAI('AIzaSyC9hdOuNO2fzqr5gW0bW4n_GfW9d9wFqA4')
 */
function setupGeminiAI(apiKey) {
  console.log('🚀 Setting up Gemini AI for Roo Teacher Grading Portal...');
  
  if (!apiKey) {
    console.error('❌ No API key provided');
    console.log('\n📝 To get a Gemini API key:');
    console.log('1. Go to https://makersuite.google.com/app/apikey');
    console.log('2. Create a new API key');
    console.log('3. Run: setupGeminiAI("YOUR_API_KEY_HERE")');
    return false;
  }
  
  console.log('🔑 Setting Gemini API key...');
  const success = setGeminiApiKey(apiKey);
  
  if (success) {
    console.log('✅ Gemini AI setup complete!');
    console.log('\n🧪 Test your configuration:');
    console.log('- Run: testConfiguration()');
    console.log('- Run: testRealAIGrading()');
    
    // Enable AI grading by default
    setConfigProperty(getPropertyKeys().AI_GRADING_ENABLED, true);
    
    return true;
  } else {
    console.log('❌ Setup failed. Please check your API key and try again.');
    return false;
  }
}

/**
 * Show current configuration
 */
function showConfiguration() {
  console.log('\n🔧 === ROO AI GRADING CONFIGURATION ===');
  
  const status = getConfigurationStatus();
  const apiKey = getGeminiApiKey();
  
  console.log('\n🤖 AI Grading Status:');
  console.log('  Configured:', status.geminiApiKey.configured ? '✅ Yes' : '❌ No');
  console.log('  API Key Stored:', status.geminiApiKey.isStored ? '✅ Yes' : '❌ No');
  console.log('  Key Length:', status.geminiApiKey.keyLength);
  console.log('  Storage Method:', status.storageMethod);
  
  console.log('\n⚙️ App Settings:');
  console.log('  Use Mock Data:', status.useMockData ? '🎭 Yes' : '🌐 No');
  console.log('  Debug Enabled:', status.debugEnabled ? '🔍 Yes' : '🔇 No');
  console.log('  AI Model:', status.model);
  console.log('  Cache Expiration:', status.cacheExpiration + ' minutes');
  
  if (!status.geminiApiKey.configured) {
    console.log('\n⚠️ Setup Required:');
    console.log('Run: setupGeminiAI("YOUR_API_KEY")');
    console.log('Get key: https://makersuite.google.com/app/apikey');
  } else {
    console.log('\n✅ Ready for AI grading!');
    console.log('Test with: testRealAIGrading()');
  }
  
  return status;
}

/**
 * Reset all configuration
 */
function resetConfiguration() {
  console.log('🔄 Resetting Roo configuration...');
  
  try {
    clearGeminiApiKey();
    PropertiesService.getScriptProperties().deleteProperty(getPropertyKeys().AI_GRADING_ENABLED);
    PropertiesService.getScriptProperties().deleteProperty(getPropertyKeys().DEBUG_ENABLED);
    PropertiesService.getScriptProperties().deleteProperty(getPropertyKeys().USE_MOCK_DATA);
    
    console.log('✅ Configuration reset complete');
    console.log('Run setupGeminiAI("your-key") to reconfigure');
    return true;
  } catch (error) {
    console.error('❌ Error resetting configuration:', error);
    return false;
  }
}

/**
 * Quick configuration helper
 */
function quickSetup() {
  console.log('\n🚀 === QUICK SETUP GUIDE ===');
  console.log('\n1️⃣ Get your Gemini API key:');
  console.log('   https://makersuite.google.com/app/apikey');
  console.log('\n2️⃣ Set up AI grading:');
  console.log('   setupGeminiAI("YOUR_API_KEY_HERE")');
  console.log('\n3️⃣ Test configuration:');
  console.log('   testConfiguration()');
  console.log('\n4️⃣ Test AI grading:');
  console.log('   testRealAIGrading()');
  console.log('\n📋 View current status:');
  console.log('   showConfiguration()');
}