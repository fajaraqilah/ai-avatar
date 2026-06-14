/**
 * Gesture Manager for Mixamo-based Animation System
 * Handles animation queue processing, loop calculations, and sequence handling
 */

class GestureManager {
  constructor() {
    // Define which animations must loop
    this.loopingAnimations = new Set([
      'normal',
      'terbuka',
      'Talking_0',
      'Talking_1',
      'Talking_2',
      'Talking_3',
      'Talking_4',
      'Talking_5',
      'Talking_6',
      'Talking_7',
      'TALKING_EXPLAINING',
      'TALKING_OPEN_HAND',
      'TALKING_ARGUMEN',
      'TALKING_COMPARING',
      'TALKING_PRESENTING',
      'POINTING',
      'LOOKING',
      'COUNTING',
      'HAND_RAISING',
      'HEAD_NOD_YES',
      'SHAKING_HEAD_NO',
      'CLAPPING',
      'THANKFUL',
      'THINKING',
      'BASHFUL',
      'PATTING',
      'STANDING_GREETING'
    ]);

    // Define which animations must play only once
    this.singlePlayAnimations = new Set([
      'Greeting',
      'Waving',
      'Terrified',
      'Crying',
      'Laughing',
      'Sitting',
      'Walk_left',
      'Idle'
    ]);
  }

  /**
   * Calculate how many times an animation should loop based on audio duration
   * @param {string} animationName - Name of the animation
   * @param {number} audioDuration - Duration of the audio in seconds
   * @returns {number} - Number of loops (1 or 2)
   */
  calculateLoopCount(animationName, audioDuration) {
    // If it's not a looping animation, play only once
    if (!this.loopingAnimations.has(animationName)) {
      return 1;
    }

    // If audio duration is less than 20 seconds, play only 1 loop
    if (audioDuration < 20) {
      return 1;
    }

    // If audio duration is 20 seconds or more, play 2 loops
    return 2;
  }

  /**
   * Process gesture queue and determine loop counts for each animation
   * @param {Array<string>} gestureQueue - Array of gesture names
   * @param {number} audioDuration - Duration of the audio in seconds
   * @returns {Array<Object>} - Array of gesture objects with name and loopCount
   */
  processGestureQueue(gestureQueue, audioDuration) {
    if (!Array.isArray(gestureQueue) || gestureQueue.length === 0) {
      return [{ name: 'Idle', loopCount: 1 }];
    }

    return gestureQueue.map(gestureName => ({
      name: gestureName,
      loopCount: this.calculateLoopCount(gestureName, audioDuration)
    }));
  }

  /**
   * Check if an animation should loop
   * @param {string} animationName - Name of the animation
   * @returns {boolean} - True if animation should loop
   */
  shouldLoop(animationName) {
    return this.loopingAnimations.has(animationName);
  }

  /**
   * Check if an animation should play only once
   * @param {string} animationName - Name of the animation
   * @returns {boolean} - True if animation should play only once
   */
  isSinglePlay(animationName) {
    return this.singlePlayAnimations.has(animationName);
  }
}

export default GestureManager;