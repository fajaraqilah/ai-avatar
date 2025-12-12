const fs = require('fs');
const path = require('path');

// Simple script to check what files exist and their sizes
console.log('Checking animation files...');

const modelDir = path.join(__dirname, 'avatar-frontend', 'public', 'models');
const files = fs.readdirSync(modelDir);

files.forEach(file => {
  if (file.endsWith('.glb')) {
    const filePath = path.join(modelDir, file);
    const stats = fs.statSync(filePath);
    console.log(`${file}: ${stats.size} bytes`);
  }
});

console.log('\nChecking for specific animation files...');
const animationFiles = ['untitled.glb', 'Explain.glb'];
animationFiles.forEach(file => {
  const filePath = path.join(modelDir, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`✓ ${file}: ${stats.size} bytes`);
  } else {
    console.log(`✗ ${file}: NOT FOUND`);
  }
});