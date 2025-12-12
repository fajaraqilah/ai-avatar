// Simple script to test if animations are working
const fs = require('fs');
const path = require('path');

console.log("Testing animation files...");

// Check if animation files exist
const animationFiles = [
  '/models/untitled.glb',
  '/models/Explain.glb'
];

animationFiles.forEach(file => {
  const fullPath = path.join(__dirname, 'avatar-frontend/public', file);
  if (fs.existsSync(fullPath)) {
    const stats = fs.statSync(fullPath);
    console.log(`${file}: FOUND (${stats.size} bytes)`);
  } else {
    console.log(`${file}: NOT FOUND`);
  }
});

console.log("Test completed.");