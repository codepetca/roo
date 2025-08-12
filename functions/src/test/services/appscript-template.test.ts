/**
 * Test for AppScript template functionality
 * Location: functions/src/test/services/appscript-template.test.ts
 */

import { describe, it, expect } from 'vitest';

// Use CommonJS require since ES module import is not working in this test context
const { APPSCRIPT_TEMPLATE } = require('../../integration/appscript-code.ts');

describe('AppScript Template', () => {
  it('should export a valid template string', () => {
    expect(APPSCRIPT_TEMPLATE).toBeDefined();
    expect(typeof APPSCRIPT_TEMPLATE).toBe('string');
    expect(APPSCRIPT_TEMPLATE.length).toBeGreaterThan(100);
  });

  it('should contain required configuration placeholders', () => {
    expect(APPSCRIPT_TEMPLATE).toContain('{{SPREADSHEET_ID}}');
    expect(APPSCRIPT_TEMPLATE).toContain('CONFIG');
    expect(APPSCRIPT_TEMPLATE).toContain('PERSONAL_SPREADSHEET_ID');
  });

  it('should contain required functions', () => {
    expect(APPSCRIPT_TEMPLATE).toContain('processAllSubmissions');
    expect(APPSCRIPT_TEMPLATE).toContain('setupTriggers');
  });

  it('should be a valid template that can be processed', () => {
    const testSpreadsheetId = 'test-sheet-123';
    const processedTemplate = APPSCRIPT_TEMPLATE.replace(/\{\{SPREADSHEET_ID\}\}/g, testSpreadsheetId);
    
    expect(processedTemplate).toContain(testSpreadsheetId);
    expect(processedTemplate).not.toContain('{{SPREADSHEET_ID}}'); // All placeholders should be replaced
  });
});