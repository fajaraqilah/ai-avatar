import { useState, useEffect, useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useControls, button } from "leva";
import { useChat } from "../hooks/useChat";
import GestureManager from "./gestureManager";

// Define facial expressions with morph target values
const facialExpressions = {
  default: {}, // Default neutral expression
  smile: { // Smiling expression
    browInnerUp: 0.17,
    eyeSquintLeft: 0.4,
    eyeSquintRight: 0.44,
    noseSneerLeft: 0.1700000727403593,
    noseSneerRight: 0.14000002836874015,
    mouthPressLeft: 0.61,
    mouthPressRight: 0.41000000000000003,
  },
  funnyFace: { // Funny/crazy expression
    jawLeft: 0.63,
    mouthPucker: 0.53,
    noseSneerLeft: 1,
    noseSneerRight: 0.39,
    mouthLeft: 1,
    eyeLookUpLeft: 1,
    eyeLookUpRight: 1,
    cheekPuff: 0.9999924982764238,
    mouthDimpleLeft: 0.414743888682652,
    mouthRollLower: 0.32,
    mouthSmileLeft: 0.35499733688813034,
    mouthSmileRight: 0.35499733688813034,
  },
  sad: { // Sad expression
    mouthFrownLeft: 1,
    mouthFrownRight: 1,
    mouthShrugLower: 0.78341,
    browInnerUp: 0.452,
    eyeSquintLeft: 0.72,
    eyeSquintRight: 0.75,
    eyeLookDownLeft: 0.5,
    eyeLookDownRight: 0.5,
    jawForward: 1,
  },
  surprised: { // Surprised expression
    eyeWideLeft: 0.5,
    eyeWideRight: 0.5,
    jawOpen: 0.351,
    mouthFunnel: 1,
    browInnerUp: 1,
  },
  angry: { // Angry expression
    browDownLeft: 1,
    browDownRight: 1,
    eyeSquintLeft: 1,
    eyeSquintRight: 1,
    jawForward: 1,
    jawLeft: 1,
    mouthShrugLower: 1,
    noseSneerLeft: 1,
    noseSneerRight: 0.42,
    eyeLookDownLeft: 0.16,
    eyeLookDownRight: 0.16,
    cheekSquintLeft: 1,
    cheekSquintRight: 1,
    mouthClose: 0.23,
    mouthFunnel: 0.63,
    mouthDimpleRight: 1,
  },
  crazy: { // Crazy expression
    browInnerUp: 0.9,
    jawForward: 1,
    noseSneerLeft: 0.5700000000000001,
    noseSneerRight: 0.51,
    eyeLookDownLeft: 0.39435766259644545,
    eyeLookUpRight: 0.4039761421719682,
    eyeLookInLeft: 0.9618479575523053,
    eyeLookInRight: 0.9618479575523053,
    jawOpen: 0.9618479575523053,
    mouthDimpleLeft: 0.9618479575523053,
    mouthDimpleRight: 0.9618479575523053,
    mouthStretchLeft: 0.27893590769016857,
    mouthStretchRight: 0.2885543872656917,
    mouthSmileLeft: 0.5578718153803371,
    mouthSmileRight: 0.38473918302092225,
    tongueOut: 0.9618479575523053,
  },
};

// Mapping of phonemes to viseme morph targets for lip sync
const corresponding = {
  A: "viseme_PP",
  B: "viseme_kk",
  C: "viseme_I",
  D: "viseme_AA",
  E: "viseme_O",
  F: "viseme_U",
  G: "viseme_FF",
  H: "viseme_TH",
  X: "viseme_PP",
};

// Main Avatar component that renders and animates the 3D teacher model
export function Avatar(props) {
  console.log("Loading GLB files...");
  const { nodes, materials, scene } = useGLTF("/models/67a47721736ce9f3e126d847.glb"); // Load main avatar model
  const { animations: untitledAnimations } = useGLTF("/models/untitled.glb"); // Load Mixamo animations
  const { animations: explainAnimations } = useGLTF("/models/Explain.glb"); // Load Explain animations
  console.log("GLB files loaded:", { 
    mainModel: !!scene, 
    untitledAnimations: untitledAnimations?.length, 
    explainAnimations: explainAnimations?.length
  });
  
  // Log animations from GLB files
  console.log("Animations from GLB:", untitledAnimations, explainAnimations);
  
  // Log when component mounts
  console.log("Avatar component mounted");
  const { message, onMessagePlayed } = useChat(); // Get current message and callback from chat context
  
  // Initialize gesture manager
  const gestureManager = useMemo(() => new GestureManager(), []);
  const gestureMapRef = useRef(null);

  // Load gestureToClip mapping from public folder
  useEffect(() => {
    let cancelled = false;
    fetch('/gestureToClip.json')
      .then(r => r.json())
      .then(j => { if (!cancelled) gestureMapRef.current = j; })
      .catch(e => console.warn('Could not load gestureToClip.json', e));
    return () => { cancelled = true; };
  }, []);
  
  // Ref for the avatar group
  const group = useRef();
  
  // Combine all animations using useMemo
  const allAnimations = useMemo(() => {
    return [...(untitledAnimations || []), ...(explainAnimations || [])];
  }, [untitledAnimations, explainAnimations]);
  
  // Create animation mixer using useRef instead of useMemo
  const mixerRef = useRef();
  
  // Store animation actions dictionary
  const actionsRef = useRef({});
  
  // Create mixer in useEffect after group.current is available
  useEffect(() => {
    if (group.current && !mixerRef.current) {
      console.log("Creating AnimationMixer");
      mixerRef.current = new THREE.AnimationMixer(group.current);
    }
  }, [group]);
  
  // Store current action reference
  const currentActionRef = useRef();
  
  // Initialize animation actions when animations are loaded
  useEffect(() => {
    console.log("Avatar animations useEffect triggered", { 
      animationsCount: allAnimations.length,
      mixerAvailable: !!mixerRef.current
    });
    
    if (allAnimations.length > 0 && mixerRef.current) {
      // Create actions for all animations
      const actions = {};
      allAnimations.forEach((clip) => {
        actions[clip.name] = mixerRef.current.clipAction(clip);
      });
      actionsRef.current = actions;
      
      // Play default Idle (no fade) to initialize current action
      const idleAction = actions['Idle'] || actions['idle'] || Object.values(actions)[0];
      if (idleAction) {
        try {
          idleAction.reset();
          idleAction.play();
          currentActionRef.current = idleAction;
          console.log('Default Idle played without fade');
        } catch (e) {
          console.warn('Failed to play default Idle', e);
        }
      }
    }
  }, [allAnimations]);


  const audioStartTimeRef = useRef(0);
  const [debugMode, setDebugMode] = useState(false); // State for debug mode

  const [lipsync, setLipsync] = useState(); // State for lip sync data
  const [currentMessage, setCurrentMessage] = useState(null); // State for current message being processed
  const [audio, setAudio] = useState(null); // State for audio element
  const [facialExpression, setFacialExpression] = useState(""); // State for facial expression
  const [setupMode, setSetupMode] = useState(false); // State for setup mode

  // Track the last message ID to prevent rapid re-triggering
  const lastMessageIdRef = useRef(null);
  
  // Effect to update current message when chat message changes
  // Local fallback classifier (simple keyword-based) for frontend-only handling
  const classifyTextClient = (text) => {
    if (!text || typeof text !== 'string') return ['Talking_0'];
    const t = text.toLowerCase();
    // Simple keyword mapping - fallback when backend gestureLabels not present
    if (/\b(hello|hi|halo|hai|selamat)\b/.test(t)) return ['Greeting'];
    if (/\b(explain|jelaskan|mengapa|why|how)\b/.test(t)) return [' '];
    if (/\b(santai|lucu|bahagia|happy)\b/.test(t)) return ['Laughing'];
    if (/\b(ask|tanya|question|pertanyaan)\b/.test(t)) return ['Talking_2'];
    if (/\b(thanks|terima kasih)\b/.test(t)) return ['Greeting'];
    // Default talking gesture
    return ['Talking_1'];
  };

  // Map incoming gesture labels to available actions (fallback to Talking_0)
  const mapLabelsToAvailableActions = (labels) => {
    const available = Object.keys(actionsRef.current || {});
    if (!available || available.length === 0) return ['Talking_1'];
    const mapped = labels.map((lbl) => {
      if (!lbl) return null;
      // consult mapping file if available
      try {
        const map = gestureMapRef.current || {};
        const candidates = map[lbl];
        if (candidates && Array.isArray(candidates)) {
          for (const c of candidates) {
            if (actionsRef.current[c]) return c;
            // try partial match
            const partial = available.find((a) => a.toLowerCase().includes(c.toLowerCase()));
            if (partial) return partial;
          }
        }
      } catch (e) {
        // ignore mapping errors and continue to fuzzy matching
      }
      // Exact match
      if (actionsRef.current[lbl]) return lbl;
      // Partial match
      const partial = available.find((a) => a.toLowerCase().includes(lbl.toLowerCase()));
      if (partial) return partial;
      // Try normalized forms
      const norm = available.find((a) => a.toLowerCase() === lbl.toLowerCase());
      if (norm) return norm;
      return null;
    }).filter(Boolean);
    return mapped.length > 0 ? mapped : ['Talking_1'];
  };

  // Central handler for incoming messages -> decide gesture labels and start animation
  const processIncomingMessage = (msg) => {
    console.log('Processing incoming message for animation:', msg && msg.text ? msg.text.slice(0,120) : msg);
    if (!msg) {
      lastMessageIdRef.current = null;
      playGestureSequence(['Idle'], 0);
      return;
    }

    // Prevent duplicate processing
    const id = msg.text || JSON.stringify(msg);
    if (lastMessageIdRef.current === id) {
      console.log('Duplicate message, ignoring');
      return;
    }
    lastMessageIdRef.current = id;

    // Ensure audio/lipsync handling runs by storing the current message
    try {
      setCurrentMessage(msg);
    } catch (e) {
      console.warn('Could not set currentMessage', e);
    }

    // Use backend-provided gestureLabels if present
    let labels = Array.isArray(msg.gestureLabels) && msg.gestureLabels.length ? msg.gestureLabels : null;
    if (!labels) {
      // Fallback to client-side classifier when backend labels missing
      labels = classifyTextClient(msg.text || msg);
      console.log('Client-classified gesture labels:', labels);
    } else {
      console.log('Using backend gesture labels:', labels);
    }

    // Map to available actions
    const mapped = mapLabelsToAvailableActions(labels);
    console.log('Mapped gesture labels to actions:', mapped);

    // Trigger the gesture sequence with audioDuration if available
    playGestureSequence(mapped, msg.audioDuration || 0);
  };

  // Animation Transition Handler: watch for new messages and process them
  useEffect(() => {
    console.log('Animation Transition Handler triggered', { message });
    processIncomingMessage(message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  // Function to play a sequence of gesture animations with smooth transitions
  const playGestureSequence = (gestureLabels, audioDuration) => {
    console.log("playGestureSequence called with:", gestureLabels, "audioDuration:", audioDuration);
    console.log("Animation system state:", { 
      actionsCount: Object.keys(actionsRef.current).length,
      currentAction: currentActionRef.current?._clip?.name || "none"
    });
    
    if (Object.keys(actionsRef.current).length === 0) {
      console.warn("Animation system not initialized, cannot play gestures");
      return;
    }
    
    if (!gestureLabels || gestureLabels.length === 0) {
      console.log("No gesture labels provided, playing Idle");
      playGesture('Idle');
      return;
    }
    
    // Process gesture queue with loop counts
    let processedGestures = gestureManager.processGestureQueue(gestureLabels, audioDuration);
    // Adjust loop counts based on actual clip durations so teaching animations cover the audio length
    processedGestures = processedGestures.map((g) => {
      const name = g.name;
      if (gestureManager.shouldLoop(name) && audioDuration > 0) {
        // Try to find the action and its clip duration
        let action = actionsRef.current[name];
        if (!action) {
          // try partial match
          for (const [k, a] of Object.entries(actionsRef.current)) {
            if (k.toLowerCase().includes(name.toLowerCase())) {
              action = a;
              break;
            }
          }
        }
        const clipDuration = action && action._clip && action._clip.duration ? action._clip.duration : null;
        if (clipDuration && clipDuration > 0) {
          // Calculate number of loops to roughly cover audio duration
          const loops = Math.max(1, Math.ceil(audioDuration / clipDuration));
          return { ...g, loopCount: loops };
        }
        // Fallback: large loop count to effectively keep playing until audio end
        return { ...g, loopCount: Math.max(g.loopCount || 1, 9999) };
      }
      return g;
    });
    console.log("Processed gestures:", processedGestures);
    
    // Play the gesture sequence
    if (processedGestures.length > 0) {
      // Play the first gesture in the sequence
      playNextGesture(processedGestures, 0);
    } else {
      console.log("Processed gestures is empty, playing Idle");
      playGesture('Idle');
    }
  };

  // Helper function to play gestures in sequence
  const playNextGesture = (gestures, index) => {
    console.log(`playNextGesture called with index: ${index}, total gestures: ${gestures.length}`);
    
    if (index >= gestures.length) {
      // Sequence complete, return to idle
      console.log("Gesture sequence complete, returning to Idle");
      // Play Idle with a dummy callback to prevent double-trigger from finished event
      playGesture('Idle', 1, () => {
        console.log("Idle animation started after gesture sequence complete");
      });
      return;
    }
    
    const gesture = gestures[index];
    console.log(`Playing gesture ${index + 1}/${gestures.length}:`, gesture.name, `loopCount: ${gesture.loopCount}`);
    
    // Play the gesture with callback to play next gesture
    playGesture(gesture.name, gesture.loopCount, () => {
      console.log(`Gesture '${gesture.name}' completed, moving to next gesture`);
      // When this gesture finishes, play the next one
      playNextGesture(gestures, index + 1);
    });
  };

  // Store callbacks for animation finished events
  const animationCallbacksRef = useRef({});
  
  // Set up mixer event listener for animation finished events
  useEffect(() => {
    if (mixerRef.current) {
      const handleAnimationFinished = (event) => {
        const action = event.action;
        const clipName = action._clip.name;
        const callback = animationCallbacksRef.current[clipName];
        
        console.log(`Animation '${clipName}' finished, callback exists: ${!!callback}`);
        
        if (callback) {
          // Execute the callback for this animation
          console.log(`Executing callback for animation '${clipName}'`);
          callback();
          // Remove the callback after execution
          delete animationCallbacksRef.current[clipName];
        } else {
          // FIX: Only log if no callback, don't auto-return to Idle
          // This prevents double-triggering when playGesture is explicitly called
          console.log(`Animation '${clipName}' finished with no callback registered`);
        }
      };
      
      mixerRef.current.addEventListener('finished', handleAnimationFinished);
      
      // Clean up event listener
      return () => {
        if (mixerRef.current) {
          mixerRef.current.removeEventListener('finished', handleAnimationFinished);
        }
      };
    }
  }, []);
  
  // Helper function to play a single gesture
  function playGesture(gestureLabel, loopCount = 1, onFinishCallback) {
    console.log("Trying to play gesture:", gestureLabel, "loopCount:", loopCount);
    
    // Try to find exact match first
    let action = actionsRef.current[gestureLabel];
    console.log("Exact match found:", !!action);
    
    // If not found, try to find partial match
    if (!action) {
      for (let [name, act] of Object.entries(actionsRef.current)) {
        if (name.includes(gestureLabel)) {
          action = act;
          console.log("Partial match found:", name);
          break;
        }
      }
    }
    
    // If still not found, use Idle as fallback
    if (!action) {
      console.log("Looking for Idle animation, available actions:", Object.keys(actionsRef.current));
      action = actionsRef.current['Idle'] || actionsRef.current['idle'];
      if (!action) {
        // Try to find any idle-like animation
        for (let [name, act] of Object.entries(actionsRef.current)) {
          if (name.toLowerCase().includes('idle')) {
            action = act;
            console.log("Found idle-like animation:", name);
            break;
          }
        }
        
        // If still not found, use the first available animation
        if (!action) {
          action = Object.values(actionsRef.current)[0];
          console.warn(`No animation found for '${gestureLabel}' and no Idle animation available, using first animation`);
        } else {
          console.warn(`Animation '${gestureLabel}' not found, using idle-like animation as fallback`);
        }
      } else {
        console.warn(`Animation '${gestureLabel}' not found, using Idle as fallback`);
      }
    }
    
    // previous fadeOut removed; we'll handle transitions after loop configuration
    
    // Configure looping based on animation type and loop count
    if (loopCount > 1 && gestureManager.shouldLoop(gestureLabel)) {
      // For looping animations, set loop repeat
      action.setLoop(THREE.LoopRepeat, loopCount);
      console.log(`Setting animation to loop ${loopCount} times`);
    } else {
      // For single play animations or when loopCount is 1
      action.setLoop(THREE.LoopOnce);
      action.clampWhenFinished = true;
      console.log("Setting animation to play once");
    }

    // Transition handling: crossfade when previous action exists, otherwise conditional fadeIn
    const previous = currentActionRef.current;
    const hasPrevious = previous && previous !== action;
    if (hasPrevious) {
      console.log("Stopping previous action", previous._clip.name, "and playing", action._clip.name);
      try {
        previous.stop();
      } catch (e) {
        console.warn('Error stopping previous action', e);
      }
      action.reset();
      action.play();
    } else {
      // No previous action: just reset and play immediately
      action.reset();
      action.play();
      console.log("No previous action, playing immediately");
    }

    // FIX: Store the callback using animation clip name as key, not gestureLabel
    if (onFinishCallback) {
      const animationName = action._clip.name;
      animationCallbacksRef.current[animationName] = onFinishCallback;
      console.log(`Stored callback for animation '${animationName}'`);
    }
    // Update current action reference
    currentActionRef.current = action;
  }

  // Effect to handle message playback (audio)
  useEffect(() => {
    if (!currentMessage || !currentMessage.audio) return; // Return if no message or audio

    setFacialExpression(currentMessage.facialExpression || "smile"); // Set facial expression
    setLipsync(currentMessage.lipsync || { mouthCues: [] }); // Set lip sync data

    // Handle both base64 string and file path for audio
    const audioSrc = currentMessage.audio.startsWith('data:') ? 
      currentMessage.audio : // Use base64 data directly
      "data:audio/mp3;base64," + currentMessage.audio; // Prepend base64 header
    const audio = new Audio(audioSrc); // Create new audio element
  
    // Set up audio event listeners
    audio.addEventListener('canplay', () => { // Add event listener for when audio can play
      // Audio is ready to play
      audio.play().catch(e => console.error("Audio play error:", e)); // Play audio and catch errors
      audioStartTimeRef.current = performance.now() / 1000; // Record start time
    });
  
    setAudio(audio); // Set audio state

    // Add event listener for when audio ends
    audio.addEventListener('ended', () => {
      setFacialExpression("neutral"); // Reset facial expression
      // Trigger backend-provided onMessagePlayed
      try { onMessagePlayed(); } catch (e) { console.warn('onMessagePlayed error', e); }

      // Also trigger the current animation callback (if any) so sequences waiting on audio end advance
      try {
        const currentClipName = currentActionRef.current?._clip?.name;
        if (currentClipName) {
          const cb = animationCallbacksRef.current[currentClipName];
          if (cb) {
            console.log('Audio ended - executing animation callback for', currentClipName);
            delete animationCallbacksRef.current[currentClipName];
            cb();
          }
        }
      } catch (e) {
        console.warn('Error invoking animation callback on audio end', e);
      }
    });

    // Clean up audio on unmount
    return () => {
      if (audio) { // Check if audio exists
        audio.pause(); // Pause audio
        audio.removeAttribute('src'); // Remove source attribute
        audio.load(); // Reset audio
      }
    };
  }, [currentMessage]); // Run effect when currentMessage changes

  // Function to smoothly transition morph target values
  const lerpMorphTarget = (target, value, speed = 0.1) => {
    scene?.traverse((child) => { // Traverse all children in the scene
      if (child.isSkinnedMesh && child.morphTargetDictionary) { // Check if child is a skinned mesh with morph targets
        const index = child.morphTargetDictionary[target]; // Get morph target index
        if (index === undefined || child.morphTargetInfluences[index] === undefined) { // Check if target exists
          return; // Return if target doesn't exist
        }
        // Linear interpolation to smoothly transition to target value
        child.morphTargetInfluences[index] = THREE.MathUtils.lerp(
          child.morphTargetInfluences[index], // Current value
          value, // Target value
          speed // Interpolation speed
        );
      }
    });
  };

  const [blink, setBlink] = useState(false); // State for eye blinking
  const [winkLeft, setWinkLeft] = useState(false); // State for left eye wink
  const [winkRight, setWinkRight] = useState(false); // State for right eye wink

  // Frame update function for real-time animations
  useFrame((state, delta) => {
    // Update animation mixer
    if (mixerRef.current) {
      // console.log("Updating mixer with delta:", delta);
      mixerRef.current.update(delta);
      // Log mixer update for debugging
      // console.log("Mixer updated, time:", mixerRef.current.time);
    } else {
      // console.log("Mixer not ready yet");
    }

    // Handle facial expressions and lipsync
    !setupMode && // Only run if not in setup mode
      scene && scene.traverse && scene.traverse((child) => {
        if (child.isSkinnedMesh && child.morphTargetDictionary) { // Check if child is a skinned mesh with morph targets
          Object.keys(child.morphTargetDictionary).forEach((key) => { // Iterate through morph targets
            const mapping = facialExpressions[facialExpression]; // Get facial expression mapping
            if (key === "eyeBlinkLeft" || key === "eyeBlinkRight") { // Skip eye blink targets (handled separately)
              return; // Continue to next iteration
            }
            if (mapping && mapping[key]) { // Check if expression has value for this target
              lerpMorphTarget(key, mapping[key], 0.1); // Apply expression value
            } else {
              lerpMorphTarget(key, 0, 0.1); // Reset to neutral
            }
          });
        }
      });

    // Handle eye blinking and winking
    scene && scene.traverse && scene.traverse((child) => {
      if (child.isSkinnedMesh && child.morphTargetDictionary) {
        lerpMorphTarget("eyeBlinkLeft", blink || winkLeft ? 1 : 0, 0.5); // Left eye blink/wink
        lerpMorphTarget("eyeBlinkRight", blink || winkRight ? 1 : 0, 0.5); // Right eye blink/wink
      }
    });

    // LIPSYNC
    if (setupMode) { // Check if in setup mode
      return; // Skip lip sync in setup mode
    }
    const appliedMorphTargets = []; // Array to track applied morph targets
    // Check if all required objects exist and audio is ready
    if (currentMessage && lipsync && audio && audio.readyState >= 2) { // Check if all required data exists
      // Check if lipsync and lipsync.mouthCues exist and are arrays
      const mouthCues = lipsync.mouthCues || []; // Get mouth cues or empty array
      if (Array.isArray(mouthCues)) { // Check if mouth cues is an array
        const currentAudioTime = audio.currentTime || 0; // Get current audio time
        for (let i = 0; i < mouthCues.length; i++) { // Iterate through mouth cues
          const mouthCue = mouthCues[i]; // Get current mouth cue
          if (mouthCue && 
              typeof mouthCue.start === 'number' && 
              typeof mouthCue.end === 'number' &&
              currentAudioTime >= mouthCue.start && // Check if current time is within cue
              currentAudioTime <= mouthCue.end) {
            if (corresponding[mouthCue.value]) { // Check if phoneme has corresponding viseme
              appliedMorphTargets.push(corresponding[mouthCue.value]); // Add to applied targets
              scene && scene.traverse && scene.traverse((child) => {
                if (child.isSkinnedMesh && child.morphTargetDictionary) {
                  lerpMorphTarget(corresponding[mouthCue.value], 1, 0.2); // Apply viseme
                }
              });
            }
            break; // Exit loop after finding matching cue
          }
        }
      }
    }

    // Reset morph targets that weren't applied
    Object.values(corresponding).forEach((value) => { // Iterate through all visemes
      if (appliedMorphTargets.includes(value)) { // Check if viseme was applied
        return; // Skip if applied
      }
      scene && scene.traverse && scene.traverse((child) => {
        if (child.isSkinnedMesh && child.morphTargetDictionary) {
          lerpMorphTarget(value, 0, 0.1); // Reset to neutral
        }
      });
    });
  });

  // Leva GUI controls for facial expressions
  useControls("FacialExpressions", {
    chat: button(() => chat()), // Button to trigger chat
    winkLeft: button(() => { // Button to trigger left wink
      setWinkLeft(true); // Set left wink state
      setTimeout(() => setWinkLeft(false), 300); // Reset after 300ms
    }),
    winkRight: button(() => { // Button to trigger right wink
      setWinkRight(true); // Set right wink state
      setTimeout(() => setWinkRight(false), 300); // Reset after 300ms
    }),
    testGesture: button(() => { // Button to test gesture system
      console.log("Test gesture button clicked");
      // Test with a simple gesture sequence
      playGestureSequence(['Talking_0'], 0);
      console.log("Test gesture played");
    }),
    testHeadGesture: button(() => { // Button to test head rotation only
      console.log("Test head gesture button clicked");
      // Test with head gesture
      playGestureSequence(['Talking_3'], 0);
      console.log("Head test gesture played");
    }),
    toggleDebugMode: button(() => { // Button to toggle debug mode
      const newDebugMode = !debugMode;
      setDebugMode(newDebugMode);
      console.log(`Debug mode ${newDebugMode ? 'enabled' : 'disabled'}`);
    }),
    facialExpression: { // Dropdown for facial expression selection
      options: Object.keys(facialExpressions), // Available expression options
      onChange: (value) => setFacialExpression(value), // Update expression on change
    },
    enableSetupMode: button(() => { // Button to enable setup mode
      setSetupMode(true); // Set setup mode flag
    }),
    disableSetupMode: button(() => { // Button to disable setup mode
      setSetupMode(false); // Clear setup mode flag
    }),
    logMorphTargetValues: button(() => { // Button to log current morph target values
      const emotionValues = {}; // Object to store emotion values
      scene && scene.traverse && scene.traverse((child) => {
        if (child.isSkinnedMesh && child.morphTargetDictionary) {
          Object.keys(child.morphTargetDictionary).forEach((key) => { // Iterate through morph targets
            if (key === "eyeBlinkLeft" || key === "eyeBlinkRight") { // Skip eye blink targets
              return; // Continue to next iteration
            }
            const value =
              child.morphTargetInfluences[ // Get current morph target influence
                child.morphTargetDictionary[key] // Get target index
              ];
            if (value > 0.01) { // Check if value is significant
              emotionValues[key] = value; // Add to emotion values
            }
          });
        }
      });
      console.log(JSON.stringify(emotionValues, null, 2)); // Log emotion values
    }),
  });

  // Main render function for the avatar
  return (
    <group {...props} dispose={null} ref={group}> {/* Avatar group container */}
      {/* Only render avatar if scene is loaded */}
      {scene && nodes.Hips && (
        <>
          <primitive object={nodes.Hips} /> {/* Hips bone as primitive */}
          {/* Render all skinned meshes with their morph targets */}
          <skinnedMesh
            name="EyeLeft"
            geometry={nodes.EyeLeft.geometry}
            material={materials.Wolf3D_Eye}
            skeleton={nodes.EyeLeft.skeleton}
            morphTargetDictionary={nodes.EyeLeft.morphTargetDictionary}
            morphTargetInfluences={nodes.EyeLeft.morphTargetInfluences}
          />
          <skinnedMesh
            name="EyeRight"
            geometry={nodes.EyeRight.geometry}
            material={materials.Wolf3D_Eye}
            skeleton={nodes.EyeRight.skeleton}
            morphTargetDictionary={nodes.EyeRight.morphTargetDictionary}
            morphTargetInfluences={nodes.EyeRight.morphTargetInfluences}
          />
          <skinnedMesh
            name="Wolf3D_Head"
            geometry={nodes.Wolf3D_Head.geometry}
            material={materials.Wolf3D_Skin}
            skeleton={nodes.Wolf3D_Head.skeleton}
            morphTargetDictionary={nodes.Wolf3D_Head.morphTargetDictionary}
            morphTargetInfluences={nodes.Wolf3D_Head.morphTargetInfluences}
          />
          <skinnedMesh
            name="Wolf3D_Teeth"
            geometry={nodes.Wolf3D_Teeth.geometry}
            material={materials.Wolf3D_Teeth}
            skeleton={nodes.Wolf3D_Teeth.skeleton}
            morphTargetDictionary={nodes.Wolf3D_Teeth.morphTargetDictionary}
            morphTargetInfluences={nodes.Wolf3D_Teeth.morphTargetInfluences}
          />
          <skinnedMesh
            geometry={nodes.Wolf3D_Glasses.geometry}
            material={materials.Wolf3D_Glasses}
            skeleton={nodes.Wolf3D_Glasses.skeleton}
          />
          <skinnedMesh
            geometry={nodes.Wolf3D_Headwear.geometry}
            material={materials.Wolf3D_Headwear}
            skeleton={nodes.Wolf3D_Headwear.skeleton}
          />
          <skinnedMesh
            geometry={nodes.Wolf3D_Body.geometry}
            material={materials.Wolf3D_Body}
            skeleton={nodes.Wolf3D_Body.skeleton}
          />
          <skinnedMesh
            geometry={nodes.Wolf3D_Outfit_Bottom.geometry}
            material={materials.Wolf3D_Outfit_Bottom}
            skeleton={nodes.Wolf3D_Outfit_Bottom.skeleton}
          />
          <skinnedMesh
            geometry={nodes.Wolf3D_Outfit_Footwear.geometry}
            material={materials.Wolf3D_Outfit_Footwear}
            skeleton={nodes.Wolf3D_Outfit_Footwear.skeleton}
          />
          <skinnedMesh
            geometry={nodes.Wolf3D_Outfit_Top.geometry}
            material={materials.Wolf3D_Outfit_Top}
            skeleton={nodes.Wolf3D_Outfit_Top.skeleton}
          />
        </>
      )}
    </group>
  );
}

// Preload GLTF models for better performance
useGLTF.preload("/models/67a47721736ce9f3e126d847.glb");
useGLTF.preload("/models/untitled.glb");
useGLTF.preload("/models/Explain.glb");