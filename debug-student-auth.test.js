const { test, expect } = require('@playwright/test');

test('Debug student auth form', async ({ page }) => {
  // Navigate to login page
  await page.goto('http://localhost:5173/login');
  
  // Select student role
  await page.click('[data-testid="select-student-button"]');
  
  // Click "Create student account" to go to signup (this uses SignupForm.svelte)
  await page.click('text=Create student account');
  
  // Wait for the signup form to load
  await page.waitForSelector('text=Create Student Account');
  
  // Take a screenshot to see current state
  await page.screenshot({ path: 'debug-student-signup-initial.png' });
  
  // Test manual typing in SignupForm
  await page.fill('input[type="email"]', 'test.student@school.edu');
  await page.fill('input[id="password"]', 'testpassword123');  
  await page.fill('input[id="confirmPassword"]', 'testpassword123');
  
  // Wait a moment for reactivity
  await page.waitForTimeout(1000);
  
  // Take screenshot after typing
  await page.screenshot({ path: 'debug-signup-after-typing.png' });
  
  // Check if create button is enabled
  const createButton = page.locator('button:has-text("Create Account")');
  const isDisabled = await createButton.getAttribute('disabled');
  console.log('SignupForm Create Account button disabled:', isDisabled !== null);
  
  // Test the actual StudentAuth component (login mode with signup toggle)
  await page.goBack();
  await page.goBack(); // Back to student login form
  
  // Look for StudentAuth sign up mode
  await page.click('text=Create account'); // Switch to signup mode in StudentAuth
  
  await page.waitForTimeout(500);
  
  // Take screenshot of StudentAuth signup mode
  await page.screenshot({ path: 'debug-studentauth-signup-mode.png' });
  
  // Test StudentAuth signup form
  await page.fill('[id="email"]:not([type="password"])', 'test2.student@school.edu');
  await page.fill('[id="password"]', 'testpass456');
  
  await page.waitForTimeout(1000);
  
  // Take final screenshot
  await page.screenshot({ path: 'debug-studentauth-after-typing.png' });
  
  // Check StudentAuth create button
  const studentAuthButton = page.locator('button:has-text("Create Account")').last();
  const studentAuthDisabled = await studentAuthButton.getAttribute('disabled');
  console.log('StudentAuth Create Account button disabled:', studentAuthDisabled !== null);
});