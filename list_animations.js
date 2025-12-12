// Simple script to list animation names from GLB files
const fs = require('fs');
const path = require('path');

// Function to extract animation names from GLB file (simplified approach)
function listAnimationNames(buffer) {
  // Convert buffer to string and search for animation names
  const content = buffer.toString('binary');
  const animationNames = [];
  
  // Simple regex to find animation names (this is a simplified approach)
  const animRegex = /"name"\s*:\s*"([^"]*Animation[^"]*|[^"]*Talk[^"]*|[^"]*Idle[^"]*|[^"]*Greeting[^"]*|[^"]*gesture[^"]*)"/gi;
  let match;
  while ((match = animRegex.exec(content)) !== null) {
    animationNames.push(match[1]);
  }

  
  // Remove duplicates and sort
  return [...new Set(animationNames)].sort();
}

// Main function
async function main() {
  const modelDir = path.join(__dirname, 'avatar-frontend', 'public', 'models');
  const animationFiles = ['untitled.glb', 'Explain.glb'];
  
  console.log('=== Animation Names in GLB Files ===\n');
  
  for (const file of animationFiles) {
    const filePath = path.join(modelDir, file);
    if (fs.existsSync(filePath)) {
      try {
        const buffer = fs.readFileSync(filePath);
        const animNames = listAnimationNames(buffer);
        console.log(`${file}:`);
        if (animNames.length > 0) {
          animNames.forEach(name => console.log(`  - ${name}`));
        } else {
          console.log('  No animation names found (may be embedded differently)');
        }
        console.log();
      } catch (error) {
        console.error(`Error reading ${file}:`, error.message);
      }
    } else {
      console.log(`${file}: NOT FOUND\n`);
    }
  }
  
  // Also check the main avatar model
  const mainAvatarFiles = ['67a47721736ce9f3e126d847.glb', '64f1a714fe61576b46f27ca2.glb'];
  for (const file of mainAvatarFiles) {
    const filePath = path.join(modelDir, file);
    if (fs.existsSync(filePath)) {
      try {
        const buffer = fs.readFileSync(filePath);
        const animNames = listAnimationNames(buffer);
        console.log(`${file} (main avatar model):`);
        if (animNames.length > 0) {
          animNames.forEach(name => console.log(`  - ${name}`));
        } else {
          console.log('  No animation names found');
        }
        console.log();
      } catch (error) {
        console.error(`Error reading ${file}:`, error.message);
      }
    }
  }
}

main().catch(console.error);