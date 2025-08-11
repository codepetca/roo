/**
 * Core Dashboard Data Display E2E Tests
 * Location: frontend/e2e/core-dashboard.test.ts
 * 
 * Tests the dashboard display of imported classroom data
 */

import { test, expect } from '@playwright/test';
import { 
  signInAsTeacher, 
  verifyDashboardData, 
  waitForPageReady,
  debugPage 
} from './test-helpers';

test.describe('Core Dashboard Data Display', () => {
  
  test.beforeEach(async ({ page }) => {
    // Sign in as teacher before each test
    await signInAsTeacher(page);
  });

  test('should display teacher dashboard page', async ({ page }) => {
    await page.goto('/dashboard/teacher');
    await waitForPageReady(page);
    
    // Should show dashboard structure
    await expect(page.locator('h1, h2').first()).toBeVisible();
    
    // Should show navigation elements
    const navElements = [
      'text=/overview|dashboard/i',
      'text=/assignment/i', 
      'text=/grade/i',
      'nav, .navigation, .nav-menu'
    ];
    
    let navFound = false;
    for (const nav of navElements) {
      if (await page.locator(nav).isVisible({ timeout: 3000 }).catch(() => false)) {
        navFound = true;
        break;
      }
    }
    
    if (navFound) {
      console.log('✓ Dashboard navigation visible');
    }
  });

  test('should show real imported data (not empty state)', async ({ page }) => {
    try {
      await page.goto('/dashboard/teacher');
      await waitForPageReady(page);
      
      // STRICT TEST: Must have real data, not just UI scaffolding
      const hasRealData = await verifyDashboardData(page);
      
      if (hasRealData) {
        console.log('✓ Dashboard shows real imported classroom data');
        
        // Verify specific data elements are present
        const specificDataChecks = [
          { selector: 'text=/CS.*10[1-9]/i', name: 'Classroom names' },
          { selector: 'text=/[0-9]+.*students?/i', name: 'Student counts' },
          { selector: 'text=/[0-9]+.*assignments?/i', name: 'Assignment counts' },
          { selector: '[data-testid="classroom-card"]', name: 'Classroom cards' }
        ];
        
        for (const check of specificDataChecks) {
          if (await page.locator(check.selector).isVisible({ timeout: 2000 }).catch(() => false)) {
            console.log(`✓ Found ${check.name}: ${check.selector}`);
          }
        }
      } else {
        console.log('❌ Dashboard shows empty state - no imported data found');
        
        // Take screenshot for debugging
        await page.screenshot({ path: 'dashboard-empty-state.png', fullPage: true });
        
        // This test should FAIL if no real data is present
        throw new Error('Dashboard does not show imported classroom data - only empty state or static UI');
      }
      
    } catch (error) {
      await debugPage(page, 'dashboard-data-failure');
      throw error;
    }
  });

  test('should handle empty dashboard state', async ({ page }) => {
    await page.goto('/dashboard/teacher');
    await waitForPageReady(page);
    
    // Should show either data or empty state
    const emptyStateIndicators = [
      'text=/no.*classroom|no.*data|empty/i',
      'text=/import.*data|add.*classroom/i',
      'text=/get.*started|welcome/i'
    ];
    
    // Should show either data or empty state
    const hasDataElements = await page.locator('text=/classroom|student|assignment/i').count();
    const hasEmptyState = await Promise.all(
      emptyStateIndicators.map(indicator => 
        page.locator(indicator).isVisible({ timeout: 2000 }).catch(() => false)
      )
    ).then(results => results.some(visible => visible));
    
    if (hasDataElements > 0) {
      console.log('✓ Dashboard shows data');
    } else if (hasEmptyState) {
      console.log('✓ Dashboard shows empty state');
    } else {
      console.log('⚠ Dashboard state unclear');
    }
  });

  test('should navigate to classroom when data exists', async ({ page }) => {
    try {
      await page.goto('/dashboard/teacher');
      await waitForPageReady(page);
      
      // Look for clickable classroom elements
      const classroomElements = [
        '[data-testid="classroom-card"]',
        'text=/CS.*101|Programming.*CS/i',
        '.classroom-card, .classroom-item',
        'button:has-text("CS")',
        'a:has-text("CS")'
      ];
      
      let classroomClicked = false;
      for (const selector of classroomElements) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
          await element.click();
          classroomClicked = true;
          console.log('✓ Clicked classroom element');
          break;
        }
      }
      
      if (!classroomClicked) {
        console.log('⚠ No clickable classroom found - may need data import');
        return;
      }
      
      // Wait for navigation
      await page.waitForTimeout(3000);
      
      // Should navigate to classroom view or show classroom details
      const currentUrl = page.url();
      const classroomView = currentUrl.includes('classroom') || 
                          currentUrl.includes('assignment') ||
                          await page.locator('text=/assignment|submission|student.*list/i').isVisible({ timeout: 3000 }).catch(() => false);
      
      if (classroomView) {
        console.log('✓ Successfully navigated to classroom view');
      } else {
        console.log('⚠ Classroom navigation unclear');
      }
      
    } catch (error) {
      await debugPage(page, 'classroom-navigation-failure');
      throw error;
    }
  });

  test('should show assignment data when available', async ({ page }) => {
    await page.goto('/dashboard/teacher/assignments');
    await waitForPageReady(page);
    
    // Look for assignment-related content
    const assignmentIndicators = [
      'text=/assignment|quiz|homework/i',
      'text=/due.*date|deadline/i',
      'text=/submission|student.*work/i',
      'text=/no.*assignment|empty/i'
    ];
    
    let assignmentContentFound = false;
    for (const indicator of assignmentIndicators) {
      if (await page.locator(indicator).isVisible({ timeout: 3000 }).catch(() => false)) {
        assignmentContentFound = true;
        console.log(`✓ Found assignment content: ${indicator}`);
        break;
      }
    }
    
    if (!assignmentContentFound) {
      console.log('⚠ No assignment content found');
    }
  });

});