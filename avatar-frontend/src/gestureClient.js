/**
 * Gesture Client for AI Avatar
 * 
 * This module provides functions to interact with the gesture generation API
 * and apply gestures to the 3D avatar.
 */

// API endpoint for gesture generation
const GESTURE_API_URL = 'http://localhost:5001/generate-gesture';
const MIXAMO_GESTURE_API_URL = 'http://localhost:5001/generate-gesture-mixamo';
const HEALTH_API_URL = 'http://localhost:5001/health';

/**
 * Check if the gesture API is available
 * @returns {Promise<boolean>} True if API is available, false otherwise
 */
export async function isGestureApiAvailable() {
  try {
    const response = await fetch(HEALTH_API_URL);
    const data = await response.json();
    return data.status === 'healthy';
  } catch (error) {
    console.error('Gesture API health check failed:', error);
    return false;
  }
}

/**
 * Generate gesture data from text (legacy format)
 * @param {string} text - The text to convert to gestures
 * @param {string} format - Output format ('json' or 'bvh')
 * @returns {Promise<Object|null>} Gesture data or null if failed
 */
export async function generateGesture(text, format = 'json') {
  try {
    const response = await fetch(GESTURE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        format: format
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success) {
      return format === 'json' ? data.gesture_data : { filePath: data.file_path };
    } else {
      console.error('Failed to generate gesture:', data.error);
      return null;
    }
  } catch (error) {
    console.error('Error generating gesture:', error);
    return null;
  }
}

/**
 * Generate Mixamo-compatible gesture data from text
 * @param {string} text - The text to convert to gestures
 * @param {string} format - Output format ('json' or 'fbx')
 * @returns {Promise<Object|null>} Gesture data or null if failed
 */
export async function generateMixamoGesture(text, format = 'json') {
  try {
    const response = await fetch(MIXAMO_GESTURE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        format: format
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success) {
      return format === 'json' ? data.data : { filePath: data.file_path };
    } else {
      console.error('Failed to generate Mixamo gesture:', data.error);
      return null;
    }
  } catch (error) {
    console.error('Error generating Mixamo gesture:', error);
    return null;
  }
}

/**
 * Map gesture names to Mixamo animation names
 */
const gestureToMixamoAnimation = {
  'wave': 'ArmWave',
  'nod': 'HeadNod',
  'shake': 'HeadShake',
  'point': 'Pointing',
  'hands_up': 'Jump',
  'bow': 'Salute',
  'head_tilt': 'HeadTilt',
  'emphatic': 'Punch',
  'idle': 'Idle'
};

/**
 * Apply gesture data to avatar (legacy format)
 * @param {Object} gestureData - The gesture data from the API
 * @param {Function} setAvatarAnimation - Function to set avatar animation
 */
export function applyGestureToAvatar(gestureData, setAvatarAnimation) {
  if (!gestureData || !gestureData.compressed) {
    console.warn('Invalid gesture data provided');
    return;
  }

  const { frames } = gestureData.compressed;
  
  // Process each frame
  frames.forEach(frame => {
    const { gesture, time } = frame;
    const animationState = gestureToMixamoAnimation[gesture] || 'Idle';
    
    // Schedule the animation at the specified time
    setTimeout(() => {
      setAvatarAnimation(animationState);
    }, time * 1000); // Convert seconds to milliseconds
  });
}

/**
 * Apply Mixamo-compatible gesture data to avatar
 * @param {Object} gestureData - The Mixamo-compatible gesture data from the API
 * @param {Function} setBoneRotation - Function to set bone rotation (boneName, x, y, z)
 */
export function applyMixamoGestureToAvatar(gestureData, setBoneRotation) {
  if (!gestureData || !gestureData.frames || !gestureData.bones) {
    console.warn('Invalid Mixamo gesture data provided');
    return;
  }

  const { frames } = gestureData;
  
  // Process each frame
  frames.forEach(frame => {
    const { time, bones } = frame;
    
    // Schedule the bone rotations at the specified time
    setTimeout(() => {
      // Apply rotation for each bone
      for (const [boneName, rotation] of Object.entries(bones)) {
        setBoneRotation(boneName, rotation.x, rotation.y, rotation.z);
      }
    }, time * 1000); // Convert seconds to milliseconds
  });
}

/**
 * Generate gesture and apply to avatar (legacy format)
 * @param {string} text - The text to convert to gestures
 * @param {Function} setAvatarAnimation - Function to set avatar animation
 */
export async function generateAndApplyGesture(text, setAvatarAnimation) {
  // Check if API is available
  const isAvailable = await isGestureApiAvailable();
  if (!isAvailable) {
    console.warn('Gesture API is not available, using fallback animation');
    // Fallback to default animation
    setAvatarAnimation('Idle');
    return;
  }

  // Generate gesture data
  const gestureData = await generateGesture(text);
  
  if (gestureData) {
    // Apply the gesture data to the avatar
    applyGestureToAvatar(gestureData, setAvatarAnimation);
  } else {
    // Fallback to default animation
    console.warn('Failed to generate gesture, using fallback animation');
    setAvatarAnimation('Idle');
  }
}

/**
 * Generate Mixamo-compatible gesture and apply to avatar
 * @param {string} text - The text to convert to gestures
 * @param {Function} setBoneRotation - Function to set bone rotation (boneName, x, y, z)
 */
export async function generateAndApplyMixamoGesture(text, setBoneRotation) {
  // Check if API is available
  const isAvailable = await isGestureApiAvailable();
  if (!isAvailable) {
    console.warn('Gesture API is not available, using fallback animation');
    return;
  }

  // Generate Mixamo-compatible gesture data
  const gestureData = await generateMixamoGesture(text);
  
  if (gestureData) {
    // Apply the gesture data to the avatar
    applyMixamoGestureToAvatar(gestureData, setBoneRotation);
  } else {
    // Fallback to default pose
    console.warn('Failed to generate Mixamo gesture, using fallback pose');
  }
}

// Example usage:
/*
// In your React component or frontend code:
import { generateAndApplyMixamoGesture } from './gestureClient';

// When you receive a response from the backend
const responseText = "Hello everyone! How are you doing today?";

// Function to set bone rotation in your 3D avatar system
function setBoneRotation(boneName, x, y, z) {
  // This function would interface with your 3D avatar system
  // to set the rotation of a specific bone
  console.log(`Setting ${boneName} rotation to X:${x}, Y:${y}, Z:${z}`);
  
  // Example: If using Three.js with a skeleton
  // const bone = findBoneByName(boneName);
  // if (bone) {
  //   bone.rotation.set(
  //     THREE.MathUtils.degToRad(x),
  //     THREE.MathUtils.degToRad(y),
  //     THREE.MathUtils.degToRad(z)
  //   );
  // }
}

generateAndApplyMixamoGesture(responseText, setBoneRotation);
*/