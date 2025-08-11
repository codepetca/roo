/**
 * Simplified E2E Test Helpers
 * Location: frontend/e2e/test-helpers.ts
 * 
 * Consolidated utilities for core E2E testing flows
 */

import { Page, expect } from '@playwright/test';

/**
 * Test data and credentials
 */
export const TEST_TEACHER = {
  email: 'teacher@test.com',
  password: 'test123',
  displayName: 'E2E Test Teacher'
};

export const CLASSROOM_SNAPSHOT_PATH = './e2e/fixtures/classroom-snapshot-mock.json';

export const TEST_TEACHER_PROFILE = {
  email: 'teacher@test.com',
  password: 'test123',
  displayName: 'Test Teacher',
  schoolEmail: 'test.codepet@gmail.com'
};

/**
 * Setup teacher profile in Firestore after account creation
 * This creates the user document needed for API authentication
 */
export async function setupTestTeacherProfile(page: Page): Promise<boolean> {
  try {
    console.log('Setting up teacher profile in Firestore...');
    
    // Wait for any auth state to settle
    await page.waitForTimeout(2000);
    
    // Go to a page that ensures Firebase is loaded and authenticated
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    
    // Try to get the auth token from the page
    const response = await page.evaluate(async () => {
      try {
        // Access Firebase through the properly initialized instances
        // These are set up in the SvelteKit app during initialization
        
        // Wait a bit for Firebase to be fully loaded
        await new Promise((resolve) => setTimeout(resolve, 2000));
        
        // Try to get the Firebase instances from the global window object
        // Look for the Firebase services that are exported from lib/firebase.ts
        let firebaseAuth = null;
        let firebaseFunctions = null;
        
        // Method 1: Check if Firebase is available via import in the context
        if (typeof (window as any).firebaseAuth !== 'undefined') {
          firebaseAuth = (window as any).firebaseAuth;
          firebaseFunctions = (window as any).firebaseFunctions;
        }
        
        // Method 2: Try to access through global Firebase namespace
        if (!firebaseAuth && (window as any).firebase?.auth) {
          firebaseAuth = (window as any).firebase.auth();
          firebaseFunctions = (window as any).firebase.functions();
        }
        
        // Method 3: Direct access attempt
        if (!firebaseAuth) {
          // Try to access the auth instance directly
          const authElements = document.querySelectorAll('script');
          for (const script of authElements) {
            if (script.textContent && script.textContent.includes('firebase')) {
              console.log('Found Firebase script, attempting to access auth...');
              break;
            }
          }
          
          // Try to get auth from any available source
          firebaseAuth = (window as any).auth || (window as any).__firebase_auth;
          firebaseFunctions = (window as any).functions || (window as any).__firebase_functions;
        }
        
        if (!firebaseAuth) {
          throw new Error('Firebase Auth not available in browser context. Available window properties: ' + Object.keys(window).filter(k => k.toLowerCase().includes('fire')).join(', '));
        }
        
        const user = firebaseAuth.currentUser;
        if (!user) {
          throw new Error('No authenticated user found. Firebase auth state: ' + (firebaseAuth.currentUser ? 'has user' : 'no user'));
        }
        
        console.log('Found authenticated user:', user.email);
        const token = await user.getIdToken(true); // Force refresh
        console.log('Got Firebase auth token, calling profile creation...');
        
        // Use the Firebase callable function to create profile
        if (!firebaseFunctions) {
          throw new Error('Firebase Functions not available');
        }
        
        const createProfileFunction = firebaseFunctions.httpsCallable('createProfileForExistingUser');
        const result = await createProfileFunction({
          uid: user.uid,
          email: 'teacher@test.com',
          displayName: 'Test Teacher',
          role: 'teacher',
          schoolEmail: 'teacher@school.edu'
        });
        
        console.log('Profile creation result:', result);
        
        return {
          ok: true,
          status: 200,
          data: result.data
        };
      } catch (error) {
        console.error('Error in profile setup:', error);
        return {
          ok: false,
          status: 500,
          error: error.message
        };
      }
    });
    
    if (response.ok) {
      console.log('✅ Teacher profile created successfully:', response.data);
      return true;
    } else {
      console.log(`❌ Failed to create teacher profile: ${response.status} - ${JSON.stringify(response.data || response.error)}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Error setting up teacher profile:', error.message);
    return false;
  }
}

/**
 * Create a test teacher account through the signup flow
 * This tests the complete account creation process and creates the account we need
 */
export async function createTestTeacherAccount(page: Page): Promise<boolean> {
  console.log('Creating test teacher account...');
  
  try {
    // Navigate to login page
    await page.goto('/login');
    await page.waitForTimeout(1000);
    
    // Select teacher role
    console.log('Selecting teacher role...');
    await page.getByRole('button', { name: /teacher/i }).click();
    await page.waitForTimeout(1000);
    
    // Select email authentication
    console.log('Selecting email auth...');
    await page.getByRole('button', { name: /email/i }).click();
    await page.waitForTimeout(1000);
    
    // Switch to signup mode
    console.log('Switching to signup mode...');
    const toggleBtn = page.getByTestId('toggle-auth-mode-button');
    await toggleBtn.waitFor({ timeout: 5000 });
    await toggleBtn.click();
    await page.waitForTimeout(1000);
    
    // Fill signup form
    console.log('Filling signup form...');
    const emailInput = page.getByTestId('email-input');
    const displayInput = page.getByTestId('display-name-input');
    const schoolInput = page.getByTestId('school-email-input');
    const passwordInput = page.getByTestId('password-input');
    const confirmInput = page.getByTestId('confirm-password-input');
    
    await emailInput.waitFor({ timeout: 5000 });
    await emailInput.fill(TEST_TEACHER_PROFILE.email);
    
    await displayInput.fill(TEST_TEACHER_PROFILE.displayName);
    await schoolInput.fill(TEST_TEACHER_PROFILE.schoolEmail);
    await passwordInput.fill(TEST_TEACHER_PROFILE.password);
    await confirmInput.fill(TEST_TEACHER_PROFILE.password);
    
    // Wait for form to be ready
    await page.waitForTimeout(1000);
    
    // Submit signup form
    console.log('Submitting signup form...');
    
    // Use the working button selector from debug test
    const submitBtn = page.getByRole('button', { name: /create account|sign up/i });
    
    // Scroll the submit button into view
    console.log('Scrolling submit button into view...');
    await submitBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    // Now check if it's visible and enabled
    const isVisible = await submitBtn.isVisible();
    const isEnabled = await submitBtn.isEnabled();
    console.log('Submit button state:', { visible: isVisible, enabled: isEnabled });
    
    if (!isVisible) {
      await page.screenshot({ path: 'debug-submit-not-visible.png' });
      throw new Error('Submit button is not visible after scrolling');
    }
    
    if (!isEnabled) {
      await page.screenshot({ path: 'debug-submit-disabled.png' });
      throw new Error('Submit button is disabled');
    }
    
    // Click and wait for the submission to process
    await submitBtn.click();
    console.log('Submit button clicked, waiting for response...');
    
    // Wait for either success (redirect) or error message
    await page.waitForTimeout(5000);
    
    // Check for error messages first
    const errorElement = page.getByTestId('auth-error-message');
    if (await errorElement.isVisible({ timeout: 2000 }).catch(() => false)) {
      const errorText = await errorElement.textContent();
      console.log('Account creation error:', errorText);
      
      // If account already exists, that's fine - just return success
      // The profile setup will be handled separately
      if (errorText?.includes('already exists') || errorText?.includes('email-already-in-use')) {
        console.log('✅ Account already exists - this is expected for tests');
        return true;
      } else {
        throw new Error(`Account creation failed: ${errorText}`);
      }
    }
    
    // Check if we see "already exists" error (different selector)
    const existsError = page.locator('text=/account.*already.*exists/i');
    if (await existsError.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('✅ Account already exists - this is expected for tests');
      return true;
    }
    
    // Wait for account creation and redirect
    console.log('Waiting for account creation...');
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    
    console.log('✅ Test teacher account created successfully!');
    return true;
    
  } catch (error) {
    console.log('❌ Failed to create test teacher account:', error.message);
    await page.screenshot({ path: 'debug-account-creation-failure.png' });
    return false;
  }
}

/**
 * Try to create test account if it doesn't exist
 */
export async function createTestAccountIfNeeded(page: Page): Promise<boolean> {
  try {
    console.log('Checking if test account needs to be created...');
    
    // Navigate to login and try signup mode
    await page.goto('/login');
    await page.getByRole('button', { name: /teacher/i }).click();
    await page.getByRole('button', { name: /email/i }).click();
    
    // Look for the toggle to signup mode
    const toggleBtn = page.getByText("Don't have an account? Create one");
    if (await toggleBtn.isVisible({ timeout: 2000 })) {
      await toggleBtn.click();
      await page.waitForTimeout(1000);
      
      // Fill signup form
      await page.getByTestId('email-input').fill(TEST_TEACHER.email);
      await page.getByTestId('display-name-input').fill(TEST_TEACHER.displayName);
      await page.getByTestId('school-email-input').fill('teacher@school.edu');
      await page.getByTestId('password-input').fill(TEST_TEACHER.password);
      await page.getByTestId('confirm-password-input').fill(TEST_TEACHER.password);
      
      // Submit signup
      await page.getByTestId('submit-auth-button').click();
      await page.waitForTimeout(5000);
      
      // Check if successful (either redirect or error)
      const currentUrl = page.url();
      if (currentUrl.includes('/dashboard')) {
        console.log('✓ Test account created successfully');
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.log('Account creation failed or not needed:', error.message);
    return false;
  }
}

/**
 * Update school email for authenticated user
 * This ensures the user profile matches the imported classroom data
 */
export async function updateSchoolEmailForTestUser(page: Page): Promise<boolean> {
  try {
    console.log('Updating school email for test user...');
    
    // Wait for Firebase to be available
    await page.waitForTimeout(3000);
    
    const response = await page.evaluate(async () => {
      try {
        // Wait for Firebase modules to load
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Try different ways to access Firebase auth
        let user = null;
        
        // Method 1: Check for Firebase auth in window
        if ((window as any).firebaseAuth?.currentUser) {
          user = (window as any).firebaseAuth.currentUser;
          console.log('Found user via window.firebaseAuth');
        }
        
        // Method 2: Check for Firebase compat auth
        else if ((window as any).firebase?.auth()?.currentUser) {
          user = (window as any).firebase.auth().currentUser;
          console.log('Found user via window.firebase.auth()');
        }
        
        // Method 3: Try to access via module import (if available)
        else if (typeof (window as any).getAuth === 'function') {
          const auth = (window as any).getAuth();
          user = auth.currentUser;
          console.log('Found user via getAuth()');
        }
        
        // Method 4: Look for auth in global scope
        else {
          const authKeys = Object.keys(window).filter(key => key.toLowerCase().includes('auth'));
          console.log('Available auth-related keys:', authKeys);
          
          for (const key of authKeys) {
            const authObj = (window as any)[key];
            if (authObj && authObj.currentUser) {
              user = authObj.currentUser;
              console.log(`Found user via window.${key}`);
              break;
            }
          }
        }
        
        if (!user) {
          const availableKeys = Object.keys(window).filter(k => k.toLowerCase().includes('fire') || k.toLowerCase().includes('auth'));
          throw new Error(`No authenticated user found. Available Firebase keys: ${availableKeys.join(', ')}`);
        }
        
        const token = await user.getIdToken(true);
        console.log('Got auth token, calling school email update...');
        
        // Call the school email update endpoint
        const response = await fetch('https://us-central1-roo-app-3d24e.cloudfunctions.net/api/users/profile/school-email', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            schoolEmail: 'test.codepet@gmail.com'
          })
        });
        
        const result = await response.json();
        
        return {
          ok: response.ok,
          status: response.status,
          data: result
        };
      } catch (error) {
        console.error('Error updating school email:', error);
        return {
          ok: false,
          status: 500,
          error: error.message
        };
      }
    });
    
    if (response.ok) {
      console.log('✅ School email updated successfully:', response.data);
      return true;
    } else {
      console.log(`❌ Failed to update school email: ${response.status} - ${JSON.stringify(response.data || response.error)}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Error updating school email:', error.message);
    return false;
  }
}

/**
 * Core authentication helper
 * Handles the complete teacher sign-in flow
 */
export async function signInAsTeacher(page: Page) {
  console.log('Starting teacher sign-in flow...');
  
  // Start from login page
  await page.goto('/login');
  await page.waitForTimeout(1000);
  
  try {
    // Select teacher role
    console.log('Selecting teacher role...');
    const teacherBtn = page.getByRole('button', { name: /teacher/i });
    await teacherBtn.waitFor({ timeout: 5000 });
    await teacherBtn.click();
    await page.waitForTimeout(1000);
    
    // Select email authentication method  
    console.log('Selecting email auth...');
    const emailBtn = page.getByRole('button', { name: /email/i });
    await emailBtn.waitFor({ timeout: 5000 });
    await emailBtn.click();
    await page.waitForTimeout(1000);
    
    // Fill in credentials
    console.log('Filling credentials...');
    
    // Try using the demo credentials button first
    const demoBtn = page.getByText('Fill Demo Teacher Credentials');
    if (await demoBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Using demo credentials button...');
      await demoBtn.click();
      await page.waitForTimeout(1000);
    } else {
      // Manual form filling
      const emailInput = page.getByPlaceholder(/teacher@school\.com|email address/i);
      const passwordInput = page.getByPlaceholder(/enter your password|password/i);
      
      await emailInput.waitFor({ timeout: 5000 });
      await passwordInput.waitFor({ timeout: 5000 });
      
      await emailInput.fill(TEST_TEACHER.email);
      await passwordInput.fill(TEST_TEACHER.password);
    }
    
    // Submit form
    console.log('Submitting form...');
    const submitBtn = page.getByRole('button', { name: /sign in|login|submit/i });
    await submitBtn.waitFor({ timeout: 5000 });
    await submitBtn.click();
    
    // Wait for response - either success or error
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      console.log('✓ Sign-in successful');
      return;
    }
    
    // Check for auth error - if user doesn't exist, try creating account
    const errorMsg = page.locator('text=/user.*not.*found|auth.*invalid/i');
    const hasError = await errorMsg.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (hasError) {
      console.log('User not found, attempting to create account...');
      const accountCreated = await createTestAccountIfNeeded(page);
      if (accountCreated) {
        console.log('✓ Account created and signed in');
        return;
      }
    }
    
    // Final redirect wait
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    console.log('✓ Sign-in successful');
    
    // Update school email to match imported classroom data
    console.log('Setting school email for data consistency...');
    const schoolEmailUpdated = await updateSchoolEmailForTestUser(page);
    if (schoolEmailUpdated) {
      console.log('✓ School email set to test.codepet@gmail.com');
    } else {
      console.log('⚠️ School email update failed - dashboard may show empty state');
    }
    
  } catch (error) {
    console.log('❌ Sign-in failed:', error.message);
    // Take debug screenshot
    await page.screenshot({ path: 'debug-signin-failure.png' });
    throw new Error(`Sign-in failed: ${error.message}`);
  }
}

/**
 * Navigate to snapshot import page (may require authentication)
 */
export async function gotoSnapshotImport(page: Page) {
  await page.goto('/teacher/data-import/snapshot');
  
  // Wait for page to load, may redirect to login if not authenticated
  await page.waitForTimeout(2000);
  
  const currentUrl = page.url();
  if (currentUrl.includes('/login')) {
    console.log('⚠️ Redirected to login - auth required for import');
    throw new Error('Authentication required for import page');
  }
  
  // Check if we're on the import page
  const hasImportContent = await page.locator('h1, h2').first().textContent();
  if (hasImportContent && hasImportContent.toLowerCase().includes('import')) {
    console.log('✓ On import page');
  } else {
    console.log('⚠️ May not be on import page');
  }
}

/**
 * Upload a classroom snapshot file
 */
export async function uploadSnapshotFile(page: Page, filePath: string = CLASSROOM_SNAPSHOT_PATH) {
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(filePath);
  
  // Wait for file validation
  await page.waitForTimeout(2000);
}

/**
 * Wait for and verify REAL successful import (not just UI feedback)
 */
export async function waitForImportSuccess(page: Page) {
  console.log('Checking for real import success...');
  
  // First, check for import failure indicators
  const failureSelectors = [
    'text=/import.*error|validation.*failed|server.*error/i',
    'text=/403.*network.*error/i', 
    '[data-testid="import-error"]',
    'text=/validation.*failed/i'
  ];
  
  for (const selector of failureSelectors) {
    if (await page.locator(selector).isVisible({ timeout: 2000 }).catch(() => false)) {
      const errorText = await page.locator(selector).textContent();
      console.log(`❌ Import failed: ${errorText}`);
      return false;
    }
  }
  
  // Then check for specific success indicators (not just "complete" text)
  const successSelectors = [
    '[data-testid="import-success"]', // Specific success component
    'button:has-text("Go to Dashboard")', // Navigate to dashboard button
    'text=/import.*complete.*[0-9]+.*classrooms?/i', // Success with actual counts
    'text=/successfully.*imported.*[0-9]+.*students?/i' // Success with data counts
  ];
  
  let foundSuccess = false;
  for (const selector of successSelectors) {
    if (await page.locator(selector).isVisible({ timeout: 5000 }).catch(() => false)) {
      const successText = await page.locator(selector).textContent();
      console.log(`✓ Import success indicator: ${successText}`);
      foundSuccess = true;
      break;
    }
  }
  
  // Additional verification: check that we're no longer on step 1 of import wizard
  const stillOnUploadStep = await page.locator('text=/upload.*classroom.*snapshot/i').isVisible({ timeout: 1000 }).catch(() => false);
  if (stillOnUploadStep) {
    console.log('❌ Still on upload step - import did not progress');
    return false;
  }
  
  return foundSuccess;
}

/**
 * Navigate to teacher dashboard and verify REAL data is loaded (not just UI text)
 */
export async function verifyDashboardData(page: Page) {
  await page.goto('/dashboard/teacher');
  
  // Wait for data to load
  await page.waitForTimeout(3000);
  
  // First check: ensure we're NOT seeing the empty state
  const emptyStateIndicators = [
    'text=/no.*data.*available/i',
    'text=/import.*your.*classroom.*data/i',
    'text=/error.*loading.*dashboard/i'
  ];
  
  for (const emptyIndicator of emptyStateIndicators) {
    if (await page.locator(emptyIndicator).isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log(`❌ Found empty state indicator: ${emptyIndicator}`);
      return false;
    }
  }
  
  // Second check: look for SPECIFIC data elements that only appear with real data
  const realDataIndicators = [
    // Specific classroom data with numbers/counts
    'text=/CS.*10[1-9]|Programming.*CS/i', // Actual classroom names
    'text=/student.*count.*:.*[1-9]/i', // Student counts with numbers
    'text=/assignment.*count.*:.*[1-9]/i', // Assignment counts with numbers  
    'text=/classroom.*count.*:.*[1-9]/i', // Classroom counts with numbers
    '[data-testid="classroom-card"]', // Specific classroom cards
    '[data-testid="assignment-list-item"]', // Specific assignment items
    '[data-testid="student-count-display"]', // Specific student counts
    'text=/[0-9]+.*students?.*enrolled/i', // Enrolled student counts
    'text=/[0-9]+.*assignments?.*active/i' // Active assignment counts
  ];
  
  let foundRealData = false;
  for (const indicator of realDataIndicators) {
    if (await page.locator(indicator).isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log(`✓ Found real data indicator: ${indicator}`);
      foundRealData = true;
      break;
    }
  }
  
  return foundRealData;
}

/**
 * Common page elements for assertions
 */
export const PageElements = {
  loginHeading: 'h2:has-text("Welcome to Roo")',
  teacherButton: 'button:has-text("Teacher")',
  studentButton: 'button:has-text("Student")', 
  emailButton: 'button:has-text("Email")',
  googleButton: 'button:has-text("Google")',
  dashboardHeading: 'h1, h2',
  importButton: 'button:has-text("Import")',
  fileUpload: 'input[type="file"]'
};

/**
 * Wait for page to be ready (no loading states)
 */
export async function waitForPageReady(page: Page) {
  // Wait for common loading indicators to disappear
  await page.waitForFunction(() => {
    // Check for animation-based loading indicators
    const animationLoaders = document.querySelectorAll('.animate-spin, .animate-pulse');
    
    // Check for text-based loading indicators (case-insensitive)
    const textLoaders = Array.from(document.querySelectorAll('*')).filter(el => {
      const text = el.textContent?.trim().toLowerCase();
      return text && (
        text.includes('loading') ||
        text.includes('checking authentication') ||
        text.includes('redirecting') ||
        text.includes('fetching') ||
        text.includes('processing')
      );
    });
    
    // Check for disabled loading buttons (buttons with loading spinners)
    const loadingButtons = document.querySelectorAll('button[disabled] svg.animate-spin');
    
    // Check for data-testid loading indicators
    const testIdLoaders = document.querySelectorAll('[data-testid*="loading"]');
    
    const totalLoaders = animationLoaders.length + textLoaders.length + loadingButtons.length + testIdLoaders.length;
    
    console.log('Loading indicators found:', {
      animations: animationLoaders.length,
      textBased: textLoaders.length,
      buttonLoaders: loadingButtons.length,
      testIds: testIdLoaders.length,
      total: totalLoaders
    });
    
    return totalLoaders === 0;
  }, { timeout: 15000 }).catch((error) => {
    console.warn('waitForPageReady timeout - continuing anyway:', error.message);
    // Continue if no loading indicators found or timeout occurs
  });
}

/**
 * Debug helper - take screenshot and log page info
 */
export async function debugPage(page: Page, name: string) {
  await page.screenshot({ path: `debug-${name}.png` });
  const title = await page.title();
  const url = page.url();
  console.log(`Debug ${name}: ${title} at ${url}`);
}