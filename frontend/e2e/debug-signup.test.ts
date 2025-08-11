/**
 * Debug signup form step by step
 */
import { test, expect } from '@playwright/test';
import { TEST_TEACHER_PROFILE } from './test-helpers';

test('debug signup form step by step', async ({ page }) => {
  console.log('=== STARTING SIGNUP FORM DEBUG ===');
  
  // Step 1: Navigate to login
  console.log('1. Navigating to login...');
  await page.goto('/login');
  await page.screenshot({ path: 'debug-01-login.png' });
  
  // Step 2: Select teacher
  console.log('2. Selecting teacher role...');
  const teacherBtn = page.getByRole('button', { name: /teacher/i });
  await teacherBtn.waitFor({ timeout: 5000 });
  await teacherBtn.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'debug-02-teacher-selected.png' });
  
  // Step 3: Select email auth
  console.log('3. Selecting email auth...');
  const emailBtn = page.getByRole('button', { name: /email/i });
  await emailBtn.waitFor({ timeout: 5000 });
  await emailBtn.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'debug-03-email-selected.png' });
  
  // Step 4: Switch to signup
  console.log('4. Switching to signup mode...');
  const toggleBtn = page.getByTestId('toggle-auth-mode-button');
  await toggleBtn.waitFor({ timeout: 5000 });
  const toggleText = await toggleBtn.textContent();
  console.log('Toggle button text:', toggleText);
  await toggleBtn.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'debug-04-signup-mode.png' });
  
  // Step 5: Check form elements
  console.log('5. Checking form elements...');
  const formTitle = await page.getByTestId('teacher-email-form-title').textContent();
  console.log('Form title:', formTitle);
  
  const emailInput = page.getByTestId('email-input');
  const displayInput = page.getByTestId('display-name-input');
  const schoolInput = page.getByTestId('school-email-input');
  const passwordInput = page.getByTestId('password-input');
  const confirmInput = page.getByTestId('confirm-password-input');
  // Try multiple ways to find the submit button
  const submitBtn1 = page.getByTestId('submit-auth-button');
  const submitBtn2 = page.getByRole('button', { name: /create account|sign up/i });
  const submitBtn3 = page.locator('button[type="submit"]');
  const submitBtn4 = page.locator('form button').last();
  
  // Check visibility of all elements
  const elementsVisible = {
    email: await emailInput.isVisible(),
    display: await displayInput.isVisible(), 
    school: await schoolInput.isVisible(),
    password: await passwordInput.isVisible(),
    confirm: await confirmInput.isVisible(),
    submitBtn1: await submitBtn1.isVisible().catch(() => false),
    submitBtn2: await submitBtn2.isVisible().catch(() => false),
    submitBtn3: await submitBtn3.isVisible().catch(() => false),
    submitBtn4: await submitBtn4.isVisible().catch(() => false)
  };
  console.log('Elements visible:', elementsVisible);
  
  // Try to find a working submit button
  let submitBtn = submitBtn3; // Default to button[type="submit"]
  if (await submitBtn1.isVisible().catch(() => false)) submitBtn = submitBtn1;
  else if (await submitBtn2.isVisible().catch(() => false)) submitBtn = submitBtn2;
  else if (await submitBtn4.isVisible().catch(() => false)) submitBtn = submitBtn4;
  
  console.log('Using submit button:', submitBtn);
  
  // Check submit button state before filling
  if (await submitBtn.isVisible().catch(() => false)) {
    const submitEnabledBefore = await submitBtn.isEnabled();
    const submitTextBefore = await submitBtn.textContent();
    console.log('Submit button before filling:', { enabled: submitEnabledBefore, text: submitTextBefore });
  } else {
    console.log('No submit button found that is visible');
  }
  
  // Step 6: Fill form
  console.log('6. Filling form...');
  await emailInput.fill(TEST_TEACHER_PROFILE.email);
  console.log('Filled email');
  
  await displayInput.fill(TEST_TEACHER_PROFILE.displayName);  
  console.log('Filled display name');
  
  await schoolInput.fill(TEST_TEACHER_PROFILE.schoolEmail);
  console.log('Filled school email');
  
  await passwordInput.fill(TEST_TEACHER_PROFILE.password);
  console.log('Filled password');
  
  await confirmInput.fill(TEST_TEACHER_PROFILE.password);
  console.log('Filled confirm password');
  
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'debug-05-form-filled.png' });
  
  // Step 7: Check submit button state after filling
  console.log('7. Checking submit button state after filling...');
  const submitEnabledAfter = await submitBtn.isEnabled();
  const submitTextAfter = await submitBtn.textContent();
  console.log('Submit button after filling:', { enabled: submitEnabledAfter, text: submitTextAfter });
  
  // Get form values to verify
  const formValues = {
    email: await emailInput.inputValue(),
    display: await displayInput.inputValue(),
    school: await schoolInput.inputValue(),
    password: await passwordInput.inputValue(),
    confirm: await confirmInput.inputValue()
  };
  console.log('Form values:', formValues);
  
  // Step 8: Try to submit
  if (submitEnabledAfter) {
    console.log('8. Attempting to submit form...');
    await submitBtn.click();
    console.log('Submit button clicked');
    
    // Wait and see what happens
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'debug-06-after-submit.png' });
    
    const currentUrl = page.url();
    console.log('URL after submit:', currentUrl);
    
    // Check for any error messages
    const errorElement = page.getByTestId('auth-error-message');
    if (await errorElement.isVisible({ timeout: 1000 }).catch(() => false)) {
      const errorText = await errorElement.textContent();
      console.log('Error message:', errorText);
    }
    
  } else {
    console.log('8. Submit button is disabled - cannot submit');
    
    // Check why it might be disabled
    const formElement = page.getByTestId('teacher-email-form');
    const formHTML = await formElement.innerHTML();
    console.log('Form HTML snippet:', formHTML.substring(0, 500));
  }
  
  console.log('=== SIGNUP FORM DEBUG COMPLETE ===');
});