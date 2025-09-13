#!/usr/bin/env node

/**
 * Environment Variable Deployment Script for CodeHS Quiz Generator
 * 
 * This script reads the .env file and syncs environment variables 
 * to Google Apps Script Script Properties for secure access.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes for console output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

console.log(`${colors.blue}${colors.bold}🔧 CodeHS Quiz Generator - Environment Deployment${colors.reset}\n`);

/**
 * Parse .env file into key-value pairs
 * @param {string} envPath - Path to .env file
 * @returns {Object} Parsed environment variables
 */
function parseEnvFile(envPath) {
  if (!fs.existsSync(envPath)) {
    console.log(`${colors.yellow}⚠️  .env file not found at: ${envPath}${colors.reset}`);
    console.log(`${colors.blue}💡 Create .env file from template:${colors.reset}`);
    console.log(`   cp .env.example .env`);
    console.log(`   # Then edit .env with your actual API keys\n`);
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    line = line.trim();
    
    // Skip empty lines and comments
    if (!line || line.startsWith('#')) return;
    
    // Parse KEY=value format
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').replace(/^["']|["']$/g, ''); // Remove quotes
      envVars[key] = value;
    }
  });
  
  return envVars;
}

/**
 * Generate Apps Script code to set Script Properties
 * @param {Object} envVars - Environment variables to set
 * @returns {string} Apps Script code
 */
function generateScriptPropertiesCode(envVars) {
  const entries = Object.entries(envVars)
    .map(([key, value]) => `    '${key}': '${value.replace(/'/g, "\\'")}'`)
    .join(',\n');
    
  return `
/**
 * AUTO-GENERATED: Environment Variables Setup
 * Run this function once to configure Script Properties
 */
function deployEnvironmentVariables() {
  console.log('🔧 Setting up environment variables...');
  
  const properties = {
${entries}
  };
  
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperties(properties);
  
  console.log('✅ Environment variables configured successfully!');
  console.log('   - ${Object.keys(envVars).join('\\n   - ')}');
  
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
`.trim();
}

/**
 * Main deployment function
 */
async function deployEnvironment() {
  try {
    console.log(`${colors.blue}📖 Reading environment variables...${colors.reset}`);
    
    // Parse .env file
    const envPath = path.join(__dirname, '.env');
    const envVars = parseEnvFile(envPath);
    
    // Validate required variables
    const requiredVars = ['GEMINI_API_KEY'];
    const missingVars = requiredVars.filter(key => !envVars[key] || envVars[key] === 'your-gemini-api-key-here');
    
    if (missingVars.length > 0) {
      console.log(`${colors.red}❌ Missing required environment variables:${colors.reset}`);
      missingVars.forEach(key => console.log(`   - ${key}`));
      console.log(`${colors.yellow}💡 Update your .env file with actual values${colors.reset}\n`);
      process.exit(1);
    }
    
    console.log(`${colors.green}✅ Found ${Object.keys(envVars).length} environment variables${colors.reset}`);
    Object.keys(envVars).forEach(key => {
      const value = envVars[key];
      const displayValue = value.length > 20 ? value.substring(0, 20) + '...' : value;
      console.log(`   - ${key}: ${displayValue}`);
    });
    
    console.log(`\n${colors.blue}🔧 Generating deployment function...${colors.reset}`);
    
    // Generate the Apps Script function
    const scriptCode = generateScriptPropertiesCode(envVars);
    const deployFunctionPath = path.join(__dirname, 'deploy-env-function.gs');
    fs.writeFileSync(deployFunctionPath, scriptCode);
    
    console.log(`${colors.green}✅ Created deployment function: deploy-env-function.gs${colors.reset}`);
    console.log(`${colors.yellow}📋 Next steps:${colors.reset}`);
    console.log(`   1. Push files: ${colors.bold}clasp push --force${colors.reset}`);
    console.log(`   2. Open Apps Script editor: ${colors.bold}clasp open${colors.reset}`);
    console.log(`   3. Run function: ${colors.bold}deployEnvironmentVariables${colors.reset}`);
    console.log(`   4. Verify setup: ${colors.bold}verifyEnvironmentSetup${colors.reset}`);
    console.log(`   5. Test quiz generation in webapp\n`);
    
  } catch (error) {
    console.error(`${colors.red}❌ Environment deployment failed:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// Run the deployment
deployEnvironment();