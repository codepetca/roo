const fs = require('fs');
const path = require('path');

function fixImportsInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Count existing @shared imports for debugging
  const sharedMatches = content.match(/require\("@shared\/[^"]+"\)/g);
  if (sharedMatches) {
    console.log(`Found ${sharedMatches.length} @shared imports in ${filePath}`);
  }
  
  // Determine relative path depth based on file location
  const relativePath = path.relative(path.dirname(filePath), path.join(__dirname, '..', 'lib', 'shared'));
  const normalizedPath = relativePath.replace(/\\/g, '/'); // Convert backslashes to forward slashes for require
  
  // Replace all @shared imports with calculated relative paths
  let fixedContent = content.replace(
    /require\("@shared\/([^"]+)"\)/g,
    `require("${normalizedPath}/$1")`
  );
  
  if (content !== fixedContent) {
    fs.writeFileSync(filePath, fixedContent, 'utf8');
    console.log(`Fixed imports in ${filePath} using path: ${normalizedPath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (file.endsWith('.js')) {
      fixImportsInFile(fullPath);
    }
  }
}

// Fix imports in the compiled lib directory
const libDir = path.join(__dirname, '..', 'lib');
if (fs.existsSync(libDir)) {
  console.log('Fixing @shared imports in compiled JavaScript files...');
  walkDir(libDir);
  console.log('Import fixing complete');
  
  // Copy integration files
  const integrationSrc = path.join(__dirname, '..', 'src', 'integration');
  const integrationDest = path.join(libDir, 'src', 'integration');
  
  if (fs.existsSync(integrationSrc)) {
    if (!fs.existsSync(integrationDest)) {
      fs.mkdirSync(integrationDest, { recursive: true });
    }
    
    const integrationFiles = fs.readdirSync(integrationSrc);
    for (const file of integrationFiles) {
      const srcFile = path.join(integrationSrc, file);
      const destFile = path.join(integrationDest, file);
      fs.copyFileSync(srcFile, destFile);
    }
    console.log('Integration files copied');
  }
} else {
  console.log('lib directory not found, skipping import fixes');
}