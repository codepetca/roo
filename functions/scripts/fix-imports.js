#!/usr/bin/env node

/**
 * Fix TypeScript path mappings in compiled JavaScript files
 * 
 * This script transforms @shared/* imports to relative paths in the compiled lib directory
 * since Node.js doesn't understand TypeScript path mappings at runtime.
 */

const fs = require('fs');
const path = require('path');

const libDir = path.join(__dirname, '../lib');

function fixImportsInFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Transform @shared/* imports to relative paths
  // From: require("@shared/schemas/core")
  // To:   require("../../shared/schemas/core")
  
  // Calculate relative path from current file to shared directory
  const relativePath = path.relative(path.dirname(filePath), path.join(libDir, 'shared'));
  const normalizedPath = relativePath.split(path.sep).join('/');

  const sharedImportRegex = /require\(["']@shared\/(.*?)["']\)/g;
  content = content.replace(sharedImportRegex, (match, subPath) => {
    modified = true;
    return `require("${normalizedPath}/${subPath}")`;
  });

  // Also handle dynamic imports
  const dynamicImportRegex = /import\(["']@shared\/(.*?)["']\)/g;
  content = content.replace(dynamicImportRegex, (match, subPath) => {
    modified = true;
    return `import("${normalizedPath}/${subPath}")`;
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed imports in: ${path.relative(libDir, filePath)}`);
  }
}

function walkDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDirectory(filePath);
    } else if (file.endsWith('.js')) {
      fixImportsInFile(filePath);
    }
  }
}

console.log('🔧 Fixing TypeScript path mappings in compiled JavaScript files...');

if (fs.existsSync(libDir)) {
  walkDirectory(libDir);
  console.log('✅ Import fixing completed');
} else {
  console.log('⚠️  lib directory not found - run tsc first');
}