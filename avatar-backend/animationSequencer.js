/**
 * Animation Sequencer for Mixamo-based Gesture System
 * Handles loading and sequencing of animation clips with smooth transitions
 */

class AnimationSequencer {
  constructor() {
    this.animations = new Map(); // Store loaded animations
    this.currentActions = []; // Track currently playing actions
    this.mixer = null; // Animation mixer
    this.model = null; // Reference to the 3D model
  }

  /**
   * Initialize the sequencer with a 3D model and mixer
   * @param {THREE.Object3D} model - The 3D model with animations
   * @param {THREE.AnimationMixer} mixer - The animation mixer
   */
  init(model, mixer) {
    this.model = model;
    this.mixer = mixer;
  }

  /**
   * Load animations from GLB files
   * @param {Object} gltfData - GLTF data containing animations
   * @param {string} sourceName - Name of the source (e.g., 'untitled' or 'animasi_mengajar')
   */
  loadAnimations(gltfData, sourceName) {
    if (!gltfData.animations || !Array.isArray(gltfData.animations)) {
      console.warn(`No animations found in ${sourceName}`);
      return;
    }

    gltfData.animations.forEach((clip) => {
      const animationName = `${sourceName}:${clip.name}`;
      this.animations.set(animationName, clip);
      console.log(`Loaded animation: ${animationName}`);
    });
  }

  /**
   * Play a sequence of gesture animations with smooth transitions
   * @param {Array<string>} gestureLabels - Array of gesture labels to play
   * @param {Function} onComplete - Callback when sequence is complete
   */
  playGestureSequence(gestureLabels, onComplete) {
    if (!this.mixer || !this.model) {
      console.error('AnimationSequencer not initialized with model and mixer');
      return;
    }

    if (!gestureLabels || gestureLabels.length === 0) {
      console.warn('No gesture labels provided');
      if (onComplete) onComplete();
      return;
    }

    // Clear any existing actions
    this.stopAllActions();

    // Play the sequence
    this._playSequenceRecursive(gestureLabels, 0, onComplete);
  }

  /**
   * Recursively play gesture sequence
   * @private
   */
  _playSequenceRecursive(gestureLabels, index, onComplete) {
    if (index >= gestureLabels.length) {
      // Sequence complete, return to Idle
      this._playAnimationWithTransition('Idle', () => {
        if (onComplete) onComplete();
      });
      return;
    }

    const label = gestureLabels[index];
    this._playAnimationWithTransition(label, () => {
      // When current animation completes, play the next one
      this._playSequenceRecursive(gestureLabels, index + 1, onComplete);
    });
  }

  /**
   * Play a single animation with smooth transition
   * @private
   */
  _playAnimationWithTransition(animationLabel, onFinish) {
    // First, fade out current actions
    this.currentActions.forEach((action) => {
      action.fadeOut(0.4);
    });

    // Find the animation clip
    let clip = this.animations.get(animationLabel);
    
    // If exact match not found, try to find a partial match
    if (!clip) {
      for (let [name, animClip] of this.animations) {
        if (name.includes(animationLabel)) {
          clip = animClip;
          break;
        }
      }
    }

    // If still not found, use Idle as fallback
    if (!clip) {
      clip = this.animations.get('Idle') || this.animations.get('untitled:Idle');
      if (!clip) {
        console.warn(`Animation '${animationLabel}' not found, and no Idle animation available`);
        if (onFinish) onFinish();
        return;
      }
      console.warn(`Animation '${animationLabel}' not found, using Idle as fallback`);
    }

    // Create new action
    const action = this.mixer.clipAction(clip);
    action.reset();
    action.fadeIn(0.4);
    action.play();

    // Track this action
    this.currentActions = [action];

    // Set up completion callback
    action.setLoop(THREE.LoopOnce);
    action.clampWhenFinished = true;
    action.onFinished = () => {
      if (onFinish) onFinish();
    };

    return action;
  }

  /**
   * Stop all currently playing actions
   */
  stopAllActions() {
    this.currentActions.forEach((action) => {
      action.stop();
    });
    this.currentActions = [];
  }

  /**
   * Update the animation mixer
   * @param {number} delta - Time delta
   */
  update(delta) {
    if (this.mixer) {
      this.mixer.update(delta);
    }
  }

  /**
   * Get available animation names
   * @returns {Array<string>} - List of available animation names
   */
  getAvailableAnimations() {
    return Array.from(this.animations.keys());
  }
}

module.exports = AnimationSequencer;