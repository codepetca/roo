// Quick debug script to test dashboard API and see console logs
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen for console messages
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('validation failed') || msg.text().includes('Dashboard') || msg.text().includes('API')) {
      console.log(`🔍 ${msg.type()}: ${msg.text()}`);
    }
  });

  // Listen for failed requests
  page.on('response', response => {
    if (!response.ok()) {
      console.log(`❌ HTTP ${response.status()}: ${response.url()}`);
    }
  });

  try {
    // Go to login page first
    await page.goto('http://localhost:5173/login');
    
    // Sign in as teacher
    await page.waitForSelector('text=I am a:', { timeout: 5000 });
    await page.click('text=Teacher');
    await page.click('text=Sign in with Email');
    
    // Wait for login form
    await page.waitForSelector('button:has-text("Demo Credentials")');
    await page.click('button:has-text("Demo Credentials")');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForSelector('text=Teacher Dashboard', { timeout: 10000 });
    
    // Wait a bit for API calls to complete
    await page.waitForTimeout(5000);
    
    // Check for empty state
    const emptyState = await page.locator('text=No classrooms found').count();
    const classrooms = await page.locator('[class*="classroom"]').count();
    
    console.log(`\n📊 Dashboard State:`);
    console.log(`Empty state shown: ${emptyState > 0}`);
    console.log(`Classrooms found: ${classrooms}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
})();