/**
 * E2E Tests for Snapshot Import Workflow
 * Location: frontend/e2e/snapshot-import.test.ts
 * 
 * Tests the complete snapshot import flow:
 * Upload → Validate → Preview → Import → Success
 */

import { test, expect } from '@playwright/test';
import { MockApiHandler } from './fixtures/mock-api';
import { createAuthHelper } from './utils/auth-helpers';
import { createMockFile, createInvalidSnapshotData } from './fixtures/test-data';

test.describe('Snapshot Import Flow', () => {
  let mockApi: MockApiHandler;
  let authHelper: any;

  test.beforeEach(async ({ page }) => {
    mockApi = new MockApiHandler({ page });
    authHelper = createAuthHelper(page);
    
    // Setup authentication as teacher
    await authHelper.loginAsTeacher();
    
    // Setup API mocks for successful flow
    await mockApi.mockSnapshotValidation(true);
    await mockApi.mockSnapshotImport();
    await mockApi.mockSnapshotDiff(false); // First import
    await mockApi.mockImportHistory();
  });

  test.afterEach(async () => {
    await mockApi.clearAllMocks();
  });

  test('should complete successful snapshot import flow', async ({ page }) => {
    // Navigate to snapshot import page
    await page.goto('/teacher/data-import/snapshot');
    
    // Check initial state - should be on upload step
    await expect(page.locator('h1')).toContainText('Import JSON Snapshot');
    await expect(page.locator('[data-testid="current-step"]')).toHaveText('upload');
    
    // Step 1: Upload file
    const validFile = createMockFile('valid', 'classroom-snapshot.json');
    
    // Create file input and upload
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([{
      name: validFile.name,
      mimeType: validFile.type,
      buffer: Buffer.from(await validFile.text())
    }]);
    
    // Wait for validation to complete
    await expect(page.locator('[data-testid="validation-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="current-step"]')).toHaveText('preview');
    
    // Step 2: Preview snapshot data
    await expect(page.locator('[data-testid="snapshot-preview"]')).toBeVisible();
    
    // Check preview statistics
    await expect(page.locator('[data-testid="stats-classrooms"]')).toContainText('1');
    await expect(page.locator('[data-testid="stats-students"]')).toContainText('5');
    await expect(page.locator('[data-testid="stats-assignments"]')).toContainText('2');
    
    // Check classroom preview cards
    await expect(page.locator('[data-testid="classroom-preview-card"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="classroom-preview-card"]').first())
      .toContainText('Computer Science 101');
    
    // Confirm import
    await page.locator('[data-testid="confirm-import-btn"]').click();
    
    // Step 3: Import processing
    await expect(page.locator('[data-testid="current-step"]')).toHaveText('import');
    await expect(page.locator('[data-testid="import-progress"]')).toBeVisible();
    
    // Wait for import completion
    await expect(page.locator('[data-testid="current-step"]')).toHaveText('complete');
    
    // Step 4: Success state
    await expect(page.locator('[data-testid="import-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="import-summary"]')).toContainText('Successfully imported');
    
    // Check import statistics
    await expect(page.locator('[data-testid="import-stats"]')).toContainText('2 classrooms');
    await expect(page.locator('[data-testid="import-stats"]')).toContainText('8 assignments');
    await expect(page.locator('[data-testid="import-stats"]')).toContainText('45 submissions');
    
    // Navigate to dashboard
    await page.locator('[data-testid="go-to-dashboard-btn"]').click();
    await expect(page).toHaveURL('/dashboard/teacher');
  });

  test('should handle file validation errors', async ({ page }) => {
    // Mock validation failure
    await mockApi.mockSnapshotValidation(false);
    
    await page.goto('/teacher/data-import/snapshot');
    
    // Upload invalid file
    const invalidFile = createMockFile('invalid', 'invalid-snapshot.json');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([{
      name: invalidFile.name,
      mimeType: invalidFile.type,
      buffer: Buffer.from(await invalidFile.text())
    }]);
    
    // Should show validation error
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="validation-error"]'))
      .toContainText('Schema validation failed');
    
    // Should remain on upload step
    await expect(page.locator('[data-testid="current-step"]')).toHaveText('upload');
    
    // Error should be dismissible
    await page.locator('[data-testid="dismiss-error"]').click();
    await expect(page.locator('[data-testid="validation-error"]')).not.toBeVisible();
  });

  test('should handle import failures', async ({ page }) => {
    // Mock successful validation but failed import
    await mockApi.mockApiError('snapshots/import', 500, 'Import processing failed');
    
    await page.goto('/teacher/data-import/snapshot');
    
    // Upload valid file
    const validFile = createMockFile('valid');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([{
      name: validFile.name,
      mimeType: validFile.type,
      buffer: Buffer.from(await validFile.text())
    }]);
    
    // Wait for preview step
    await expect(page.locator('[data-testid="current-step"]')).toHaveText('preview');
    
    // Attempt import
    await page.locator('[data-testid="confirm-import-btn"]').click();
    
    // Should show import processing
    await expect(page.locator('[data-testid="current-step"]')).toHaveText('import');
    
    // Should return to preview step with error
    await expect(page.locator('[data-testid="current-step"]')).toHaveText('preview');
    await expect(page.locator('[data-testid="import-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="import-error"]'))
      .toContainText('Import processing failed');
    
    // Should allow retry
    await expect(page.locator('[data-testid="confirm-import-btn"]')).toBeVisible();
  });

  test('should handle network failures', async ({ page }) => {
    // Mock network failure
    await mockApi.mockNetworkFailure('snapshots/validate');
    
    await page.goto('/teacher/data-import/snapshot');
    
    const validFile = createMockFile('valid');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([{
      name: validFile.name,
      mimeType: validFile.type,
      buffer: Buffer.from(await validFile.text())
    }]);
    
    // Should show network error
    await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="network-error"]'))
      .toContainText('Failed to validate file');
    
    // Should have retry button
    await expect(page.locator('[data-testid="retry-validation-btn"]')).toBeVisible();
  });

  test('should show diff when importing over existing data', async ({ page }) => {
    // Mock diff with existing data
    await mockApi.mockSnapshotDiff(true);
    
    await page.goto('/teacher/data-import/snapshot');
    
    const validFile = createMockFile('valid');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([{
      name: validFile.name,
      mimeType: validFile.type,
      buffer: Buffer.from(await validFile.text())
    }]);
    
    await expect(page.locator('[data-testid="current-step"]')).toHaveText('preview');
    
    // Should show diff viewer
    await expect(page.locator('[data-testid="diff-viewer"]')).toBeVisible();
    await expect(page.locator('[data-testid="existing-data-warning"]')).toBeVisible();
    await expect(page.locator('[data-testid="existing-data-warning"]'))
      .toContainText('This will update your existing classroom data');
    
    // Should show change summary
    await expect(page.locator('[data-testid="change-summary"]')).toContainText('1 new classroom');
  });

  test('should support drag and drop file upload', async ({ page }) => {
    await page.goto('/teacher/data-import/snapshot');
    
    // Check for drag and drop zone
    const dropZone = page.locator('[data-testid="file-drop-zone"]');
    await expect(dropZone).toBeVisible();
    
    // Simulate drag over
    await dropZone.hover();
    await page.locator('[data-testid="drag-overlay"]').waitFor({ state: 'visible' });
    
    // Create file and simulate drop
    const validFile = createMockFile('valid');
    
    // Simulate file drop
    await page.evaluate(async (fileData) => {
      const dropZone = document.querySelector('[data-testid="file-drop-zone"]');
      const dataTransfer = new DataTransfer();
      const file = new File([fileData.content], fileData.name, { type: fileData.type });
      dataTransfer.items.add(file);
      
      const dropEvent = new DragEvent('drop', { 
        dataTransfer,
        bubbles: true 
      });
      
      dropZone?.dispatchEvent(dropEvent);
    }, {
      content: await validFile.text(),
      name: validFile.name,
      type: validFile.type
    });
    
    // Should proceed to validation
    await expect(page.locator('[data-testid="validation-success"]')).toBeVisible();
  });

  test('should allow starting over from any step', async ({ page }) => {
    await page.goto('/teacher/data-import/snapshot');
    
    // Complete upload step
    const validFile = createMockFile('valid');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([{
      name: validFile.name,
      mimeType: validFile.type,
      buffer: Buffer.from(await validFile.text())
    }]);
    
    await expect(page.locator('[data-testid="current-step"]')).toHaveText('preview');
    
    // Click "Choose Different File" button
    await page.locator('[data-testid="start-over-btn"]').click();
    
    // Should return to upload step
    await expect(page.locator('[data-testid="current-step"]')).toHaveText('upload');
    await expect(page.locator('input[type="file"]')).toBeVisible();
    
    // Previous file should be cleared
    const fileInputValue = await page.locator('input[type="file"]').inputValue();
    expect(fileInputValue).toBe('');
  });

  test('should show loading states during processing', async ({ page }) => {
    await page.goto('/teacher/data-import/snapshot');
    
    const validFile = createMockFile('valid');
    const fileInput = page.locator('input[type="file"]');
    
    // Upload file - should show validation loading
    await fileInput.setInputFiles([{
      name: validFile.name,
      mimeType: validFile.type,
      buffer: Buffer.from(await validFile.text())
    }]);
    
    // Check for validation loading state (might be quick)
    await expect(page.locator('[data-testid="validating-spinner"]')).toBeVisible({ timeout: 1000 });
    
    // Wait for preview step
    await expect(page.locator('[data-testid="current-step"]')).toHaveText('preview');
    
    // Start import - should show import loading
    await page.locator('[data-testid="confirm-import-btn"]').click();
    
    // Check import loading state
    await expect(page.locator('[data-testid="import-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="importing-spinner"]')).toBeVisible();
    
    // Should show progress message
    await expect(page.locator('[data-testid="import-status"]'))
      .toContainText('Processing your classroom data');
  });
});

test.describe('Snapshot Import - Edge Cases', () => {
  let mockApi: MockApiHandler;
  let authHelper: any;

  test.beforeEach(async ({ page }) => {
    mockApi = new MockApiHandler({ page });
    authHelper = createAuthHelper(page);
    await authHelper.loginAsTeacher();
  });

  test('should handle empty snapshot files', async ({ page }) => {
    await mockApi.mockSnapshotValidation(true);
    
    await page.goto('/teacher/data-import/snapshot');
    
    const emptyFile = createMockFile('empty');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([{
      name: emptyFile.name,
      mimeType: emptyFile.type,
      buffer: Buffer.from(await emptyFile.text())
    }]);
    
    await expect(page.locator('[data-testid="current-step"]')).toHaveText('preview');
    
    // Should show empty state warning
    await expect(page.locator('[data-testid="empty-snapshot-warning"]')).toBeVisible();
    await expect(page.locator('[data-testid="empty-snapshot-warning"]'))
      .toContainText('This snapshot contains no classroom data');
    
    // Should still allow import
    await expect(page.locator('[data-testid="confirm-import-btn"]')).toBeEnabled();
  });

  test('should handle unsupported file types', async ({ page }) => {
    await page.goto('/teacher/data-import/snapshot');
    
    // Try to upload a text file instead of JSON
    const textFile = new File(['Some text content'], 'data.txt', { type: 'text/plain' });
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([{
      name: textFile.name,
      mimeType: textFile.type,
      buffer: Buffer.from('Some text content')
    }]);
    
    // Should show file type error
    await expect(page.locator('[data-testid="file-type-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="file-type-error"]'))
      .toContainText('Please select a JSON file');
  });

  test('should handle large file warnings', async ({ page }) => {
    await page.goto('/teacher/data-import/snapshot');
    
    // Create a large mock file (simulate by creating large content)
    const largeContent = JSON.stringify(createInvalidSnapshotData().missingTeacher).repeat(1000);
    const largeFile = new File([largeContent], 'large-snapshot.json', { type: 'application/json' });
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([{
      name: largeFile.name,
      mimeType: largeFile.type,
      buffer: Buffer.from(largeContent)
    }]);
    
    // Should show large file warning
    await expect(page.locator('[data-testid="large-file-warning"]')).toBeVisible();
    await expect(page.locator('[data-testid="large-file-warning"]'))
      .toContainText('Large file detected');
  });
});