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
  const { animations: menjelaskanNormalAnimations } = useGLTF("/models/menjelaskan_normal.glb"); // Load Menjelaskan Normal animations
  const { animations: pointingGLBAnimations } = useGLTF("/animations/gesture_pedagogik/Pointing.glb");
  const { animations: handRaisingGLBAnimations } = useGLTF("/animations/gesture_pedagogik/HandRaising.glb");
  const { animations: headNoddingGLBAnimations } = useGLTF("/animations/gesture_pedagogik/HeadNodding.glb");
  const { animations: headNoGLBAnimations } = useGLTF("/animations/gesture_pedagogik/HeadNo.glb");
  const { animations: lookingGLBAnimations } = useGLTF("/animations/gesture_pedagogik/Looking.glb");
  const { animations: thinkingGLBAnimations } = useGLTF("/animations/gesture_pedagogik/Thinking.glb");
  const { animations: bashfulGLBAnimations } = useGLTF("/animations/gesture_pedagogik/Bashful.glb");
  const { animations: clappingGLBAnimations } = useGLTF("/animations/gesture_pedagogik/Clapping.glb");
  const { animations: countingGLBAnimations } = useGLTF("/animations/gesture_pedagogik/Counting.glb");
  const { animations: pattingGLBAnimations } = useGLTF("/animations/gesture_pedagogik/Patting.glb");
  const { animations: standingGreetingGLBAnimations } = useGLTF("/animations/gesture_pedagogik/StandingGreeting.glb");
  const { animations: talkingArgumenGLBAnimations } = useGLTF("/animations/gesture_pedagogik/Talking_Argumen.glb");
  const { animations: talkingComparingGLBAnimations } = useGLTF("/animations/gesture_pedagogik/Talking_Comparing.glb");
  const { animations: talkingExplainingGLBAnimations } = useGLTF("/animations/gesture_pedagogik/Talking_Explaining.glb");
  const { animations: talkingOpenHandGLBAnimations } = useGLTF("/animations/gesture_pedagogik/Talking_OpenHand.glb");
  const { animations: talkingPresentingGLBAnimations } = useGLTF("/animations/gesture_pedagogik/Talking_Presenting.glb");
  const { animations: thankfulGLBAnimations } = useGLTF("/animations/gesture_pedagogik/Thankful.glb");

  const pedagogicGlbAnimationCounts = {
    POINTING: pointingGLBAnimations?.length,
    HAND_RAISING: handRaisingGLBAnimations?.length,
    HEAD_NOD_YES: headNoddingGLBAnimations?.length,
    SHAKING_HEAD_NO: headNoGLBAnimations?.length,
    LOOKING: lookingGLBAnimations?.length,
    THINKING: thinkingGLBAnimations?.length,
    BASHFUL: bashfulGLBAnimations?.length,
    CLAPPING: clappingGLBAnimations?.length,
    COUNTING: countingGLBAnimations?.length,
    PATTING: pattingGLBAnimations?.length,
    STANDING_GREETING: standingGreetingGLBAnimations?.length,
    TALKING_ARGUMEN: talkingArgumenGLBAnimations?.length,
    TALKING_COMPARING: talkingComparingGLBAnimations?.length,
    TALKING_EXPLAINING: talkingExplainingGLBAnimations?.length,
    TALKING_OPEN_HAND: talkingOpenHandGLBAnimations?.length,
    TALKING_PRESENTING: talkingPresentingGLBAnimations?.length,
    THANKFUL: thankfulGLBAnimations?.length
  };

  console.log("GLB files loaded:", {
    mainModel: !!scene,
    untitledAnimations: untitledAnimations?.length,
    explainAnimations: explainAnimations?.length,
    menjelaskanNormalAnimations: menjelaskanNormalAnimations?.length,
    ...pedagogicGlbAnimationCounts
  });

  console.log("Pedagogic GLB animation counts:", pedagogicGlbAnimationCounts);

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

  // Combine all animations using useMemo.
  // POINTING sekarang dimuat dari Pointing.glb hasil retarget Blender.
  // FBX tetap tidak dimuat langsung karena sebelumnya membuat Canvas blank di browser.
  const normalizeGestureClips = (animations, primaryName) => {
    return (animations || []).map((clip, index) => {
      const cloned = clip.clone();
      cloned.name = index === 0 ? primaryName : `${primaryName}_${index}`;
      return cloned;
    });
  };

  const normalizedPedagogicGLBAnimations = useMemo(() => {
    return [
      ...normalizeGestureClips(pointingGLBAnimations, "POINTING"),
      ...normalizeGestureClips(handRaisingGLBAnimations, "HAND_RAISING"),
      ...normalizeGestureClips(headNoddingGLBAnimations, "HEAD_NOD_YES"),
      ...normalizeGestureClips(headNoGLBAnimations, "SHAKING_HEAD_NO"),
      ...normalizeGestureClips(lookingGLBAnimations, "LOOKING"),
      ...normalizeGestureClips(thinkingGLBAnimations, "THINKING"),
      ...normalizeGestureClips(bashfulGLBAnimations, "BASHFUL"),
      ...normalizeGestureClips(clappingGLBAnimations, "CLAPPING"),
      ...normalizeGestureClips(countingGLBAnimations, "COUNTING"),
      ...normalizeGestureClips(pattingGLBAnimations, "PATTING"),
      ...normalizeGestureClips(standingGreetingGLBAnimations, "STANDING_GREETING"),
      ...normalizeGestureClips(talkingArgumenGLBAnimations, "TALKING_ARGUMEN"),
      ...normalizeGestureClips(talkingComparingGLBAnimations, "TALKING_COMPARING"),
      ...normalizeGestureClips(talkingExplainingGLBAnimations, "TALKING_EXPLAINING"),
      ...normalizeGestureClips(talkingOpenHandGLBAnimations, "TALKING_OPEN_HAND"),
      ...normalizeGestureClips(talkingPresentingGLBAnimations, "TALKING_PRESENTING"),
      ...normalizeGestureClips(thankfulGLBAnimations, "THANKFUL")
    ];
  }, [
    pointingGLBAnimations,
    handRaisingGLBAnimations,
    headNoddingGLBAnimations,
    headNoGLBAnimations,
    lookingGLBAnimations,
    thinkingGLBAnimations,
    bashfulGLBAnimations,
    clappingGLBAnimations,
    countingGLBAnimations,
    pattingGLBAnimations,
    standingGreetingGLBAnimations,
    talkingArgumenGLBAnimations,
    talkingComparingGLBAnimations,
    talkingExplainingGLBAnimations,
    talkingOpenHandGLBAnimations,
    talkingPresentingGLBAnimations,
    thankfulGLBAnimations
  ]);

  const allAnimations = useMemo(() => {
    return [
      ...(untitledAnimations || []),
      ...(explainAnimations || []),
      ...(menjelaskanNormalAnimations || []),
      ...normalizedPedagogicGLBAnimations
    ];
  }, [
    untitledAnimations,
    explainAnimations,
    menjelaskanNormalAnimations,
    normalizedPedagogicGLBAnimations
  ]);

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
  const mainPedagogicLabelRef = useRef("TALKING");

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

  // Ref khusus untuk overlay gesture pedagogik berbasis dataset ML.
  // Overlay ini berjalan di atas animasi/lipsync agar gesture seperti POINTING,
  // HEAD_NOD_YES, SHAKING_HEAD_NO, WRITING, THINKING, dan CLAPPING tetap terlihat
  // walaupun file FBX Rokoko/Mixamo belum sepenuhnya retarget ke skeleton avatar GLB.
  const pedagogicGestureRef = useRef({
    active: false,
    label: "",
    start: 0,
    duration: 0,
    preferFbx: false
  });

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
        const rawCandidates = map[lbl];
        const candidates = Array.isArray(rawCandidates) ? rawCandidates : (rawCandidates ? [rawCandidates] : []);
        if (candidates.length) {
          for (const c of candidates) {
            if (!c) continue;
            if (actionsRef.current[c]) return c;
            // try partial match
            const partial = available.find((a) => a.toLowerCase().includes(String(c).toLowerCase()));
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
    console.log('Processing incoming message for animation:', msg && msg.text ? msg.text.slice(0, 120) : msg);
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

    // Aktifkan overlay gesture pedagogik dari hasil klasifikasi backend.
    // Backend mengirimkan mlGesture.gesture_label dan mlGesture.animation_clip.
    let normalizedPedagogicLabel = "TALKING";
    try {
      const predictedLabel =
        msg?.mlGesture?.frontend_animation_clip ||
        msg?.mlGesture?.gesture_label ||
        msg?.predictedGestureLabel ||
        msg?.mlGesture?.animation_clip ||
        msg?.predictedAnimationClip ||
        "TALKING";
      const normalizedPredictedLabel = String(predictedLabel).toUpperCase();
      normalizedPedagogicLabel = normalizedPredictedLabel;
      mainPedagogicLabelRef.current = normalizedPredictedLabel;
      pedagogicGestureRef.current = {
        active: true,
        label: normalizedPredictedLabel,
        start: performance.now() / 1000,
        duration: Math.max(6.0, msg.audioDuration || 6),
        // FBXLoader dinonaktifkan untuk Pointing.fbx agar frontend tidak blank.
        // Gesture POINTING tetap tampil melalui procedural overlay.
        preferFbx: false
      };
      console.log("Pedagogic gesture overlay activated:", pedagogicGestureRef.current);
    } catch (e) {
      console.warn("Could not activate pedagogic gesture overlay", e);
    }

    // Use backend-provided gestureLabels if present.
    // Prioritas baru: sentence-level gesture sequence dari backend.
    const sentenceLevelLabels = Array.isArray(msg.sentenceGestureSequence) && msg.sentenceGestureSequence.length
      ? msg.sentenceGestureSequence
      : (Array.isArray(msg.gestureLabels) && msg.gestureLabels.length ? msg.gestureLabels : null);

    let labels = sentenceLevelLabels;
    const shouldRespectSentenceLevelSequence = Array.isArray(sentenceLevelLabels) && sentenceLevelLabels.length > 1;

    if (!labels) {
      // Fallback to client-side classifier when backend labels missing
      labels = classifyTextClient(msg.text || msg);
      console.log('Client-classified gesture labels:', labels);
    } else if (shouldRespectSentenceLevelSequence) {
      console.log('Using backend sentence-level gesture sequence:', labels);
      const firstSentenceGesture = String(labels[0] || 'TALKING_EXPLAINING').toUpperCase();
      normalizedPedagogicLabel = firstSentenceGesture;
      mainPedagogicLabelRef.current = firstSentenceGesture;
      pedagogicGestureRef.current = {
        active: true,
        label: firstSentenceGesture,
        start: performance.now() / 1000,
        duration: Math.max(2.5, (msg.audioDuration || 6) / Math.max(labels.length, 1)),
        segmentDuration: Math.max(2.5, (msg.audioDuration || 6) / Math.max(labels.length, 1)),
        sequenceMode: true,
        preferFbx: false
      };
    } else {
      console.log('Using backend gesture labels:', labels);
    }

    if (!shouldRespectSentenceLevelSequence) {
    // Jika gesture utama hasil ML adalah POINTING, paksa sequence utama ke POINTING.
    // Alasan: jika backend sequence berisi normal/Talking terlalu cepat, gesture menunjuk
    // tertimpa oleh animasi lain sehingga tidak terlihat natural di frontend.
    if (String(normalizedPedagogicLabel).includes("POINT")) {
      console.log("POINTING detected: forcing POINTING as primary visible gesture sequence");
      labels = ["POINTING"];
    }
    if (String(normalizedPedagogicLabel).includes("HEAD_NOD_YES") || String(normalizedPedagogicLabel).includes("HEAD_NODDING") || String(normalizedPedagogicLabel).includes("NOD_YES")) {
      console.log("HEAD_NOD_YES detected: forcing head nod overlay and preventing Talking_1 override");
      labels = ["HEAD_NOD_YES", "HEAD_NOD_YES", "HEAD_NOD_YES"];
      pedagogicGestureRef.current.duration = Math.max(8.0, msg.audioDuration || 8);
    }
    if (String(normalizedPedagogicLabel).includes("SHAKING_HEAD_NO") || String(normalizedPedagogicLabel).includes("SHAKE_NO")) {
      console.log("SHAKING_HEAD_NO detected: forcing head shake overlay and preventing Talking_1 override");
      labels = ["SHAKING_HEAD_NO"];
      pedagogicGestureRef.current.duration = Math.max(8.0, msg.audioDuration || 8);
    }

    // Gesture baru dari dataset pedagogik. Dipaksa sebagai gesture utama agar tidak tertimpa Talking/Idle.
    // Animasi fisik FBX/GLB sering belum kompatibel dengan skeleton browser, jadi overlay procedural tetap aktif.
    if (String(normalizedPedagogicLabel).includes("HAND_RAISING")) {
      console.log("HAND_RAISING detected: forcing procedural hand raising overlay");
      labels = ["HAND_RAISING", "HAND_RAISING", "HAND_RAISING"];
      pedagogicGestureRef.current.duration = Math.max(8.0, msg.audioDuration || 8);
    }
    if (String(normalizedPedagogicLabel).includes("COUNTING")) {
      console.log("COUNTING detected: forcing procedural counting overlay");
      labels = ["COUNTING", "COUNTING", "COUNTING"];
      pedagogicGestureRef.current.duration = Math.max(8.0, msg.audioDuration || 8);
    }
    if (String(normalizedPedagogicLabel).includes("ACKNOWLEDGING")) {
      console.log("ACKNOWLEDGING detected: forcing procedural acknowledging overlay");
      labels = ["ACKNOWLEDGING", "ACKNOWLEDGING"];
      pedagogicGestureRef.current.duration = Math.max(6.0, msg.audioDuration || 6);
    }
    if (String(normalizedPedagogicLabel).includes("THUMBS_UP")) {
      console.log("THUMBS_UP detected: forcing procedural thumbs up overlay");
      labels = ["THUMBS_UP", "THUMBS_UP"];
      pedagogicGestureRef.current.duration = Math.max(6.0, msg.audioDuration || 6);
    }
    if (String(normalizedPedagogicLabel).includes("LOOKING")) {
      console.log("LOOKING detected: forcing procedural looking overlay");
      labels = ["LOOKING", "LOOKING"];
      pedagogicGestureRef.current.duration = Math.max(6.0, msg.audioDuration || 6);
    }

    const forcedPedagogicSequences = {
      STANDING_GREETING: ["STANDING_GREETING", "STANDING_GREETING"],
      TALKING_ARGUMEN: ["TALKING_ARGUMEN", "TALKING_ARGUMEN"],
      TALKING_COMPARING: ["TALKING_COMPARING", "TALKING_COMPARING"],
      TALKING_EXPLAINING: ["TALKING_EXPLAINING", "TALKING_EXPLAINING"],
      TALKING_OPEN_HAND: ["TALKING_OPEN_HAND", "TALKING_OPEN_HAND"],
      TALKING_PRESENTING: ["TALKING_PRESENTING", "TALKING_PRESENTING"],
      THINKING: ["THINKING", "THINKING"],
      BASHFUL: ["BASHFUL", "BASHFUL"],
      PATTING: ["PATTING", "PATTING"],
      THANKFUL: ["THANKFUL", "THANKFUL"],
      CLAPPING: ["CLAPPING", "CLAPPING"]
    };
    for (const [key, seq] of Object.entries(forcedPedagogicSequences)) {
      if (String(normalizedPedagogicLabel).includes(key)) {
        console.log(`${key} detected: forcing matching GLB sequence`);
        labels = seq;
        pedagogicGestureRef.current.duration = Math.max(6.0, msg.audioDuration || 6);
        break;
      }
    }

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
    // Divide audioDuration by the number of gestures to give each gesture a fair share of time
    const durationPerGesture = audioDuration > 0 ? (audioDuration / gestureLabels.length) : 0;
    pedagogicGestureRef.current.segmentDuration = Math.max(2.0, durationPerGesture || 3.0);
    pedagogicGestureRef.current.sequenceTotal = gestureLabels.length;

    let processedGestures = gestureManager.processGestureQueue(gestureLabels, audioDuration);

    // Adjust loop counts based on distributed durations
    processedGestures = processedGestures.map((g) => {
      const name = g.name;
      const upperName = String(name || "").toUpperCase();
      if ((upperName.includes("POINT") || gestureManager.shouldLoop(name)) && durationPerGesture > 0) {
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
          // Calculate number of loops to cover its share of the duration
          const loops = Math.max(1, Math.ceil(durationPerGesture / clipDuration));
          return { ...g, loopCount: loops };
        }
        // Fallback: ulangi POINTING beberapa kali agar terlihat selama audio.
        if (upperName.includes("POINT")) return { ...g, loopCount: Math.max(3, Math.ceil((audioDuration || 6) / 2)) };
        return { ...g, loopCount: 1 };
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

    // Sinkronkan overlay procedural dengan gesture yang sedang dimainkan.
    // Tanpa ini, overlay lama dapat tetap memakai gesture pertama sepanjang audio,
    // sehingga sentence-level sequence tidak terlihat di frontend.
    try {
      const activeLabel = String(gesture?.name || 'TALKING_EXPLAINING').toUpperCase();
      mainPedagogicLabelRef.current = activeLabel;
      pedagogicGestureRef.current = {
        ...pedagogicGestureRef.current,
        active: true,
        label: activeLabel,
        start: performance.now() / 1000,
        duration: pedagogicGestureRef.current.segmentDuration || 3.0,
        preferFbx: false,
        _headDebugPrinted: false,
        _handRaiseDebugPrinted: false,
        _countingDebugPrinted: false,
        _ackDebugPrinted: false
      };
      console.log('Active sentence-level overlay gesture:', activeLabel);
    } catch (e) {
      console.warn('Could not update sentence-level gesture overlay', e);
    }

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
        if (name.toLowerCase().includes(String(gestureLabel).toLowerCase())) {
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
    const gestureUpper = String(gestureLabel || "").toUpperCase();
    if (gestureUpper.includes("POINT")) {
      const safeLoops = Math.max(loopCount || 1, 4);
      action.setLoop(THREE.LoopRepeat, safeLoops);
      action.clampWhenFinished = false;
      action.timeScale = 0.75;
      console.log(`Setting POINTING animation to visible repeat ${safeLoops}x with slower timeScale`);
    } else if (loopCount > 1 && gestureManager.shouldLoop(gestureLabel)) {
      // For looping animations, set loop repeat
      action.setLoop(THREE.LoopRepeat, loopCount);
      action.clampWhenFinished = false;
      action.timeScale = 1;
      console.log(`Setting animation to loop ${loopCount} times`);
    } else {
      // For single play animations or when loopCount is 1
      action.setLoop(THREE.LoopOnce);
      action.clampWhenFinished = true;
      action.timeScale = 1;
      console.log("Setting animation to play once");
    }

    // Transition handling: crossfade when previous action exists for smooth transitions
    const previous = currentActionRef.current;
    const hasPrevious = previous && previous !== action;

    // Set duration for the transition (0.5 seconds is usually good for Mixamo)
    const fadeDuration = 0.5;

    if (hasPrevious) {
      console.log(`Cross-fading from ${previous._clip.name} to ${action._clip.name}`);
      try {
        action.reset();
        action.setEffectiveTimeScale(1);
        action.setEffectiveWeight(1);
        action.fadeIn(fadeDuration);
        action.play();

        // Smoothly crossfade from previous to new action
        previous.crossFadeTo(action, fadeDuration, true);
      } catch (e) {
        console.warn('Error during crossfade, falling back to immediate play', e);
        action.reset().play();
        if (previous) previous.stop();
      }
    } else {
      // No previous action or same action: just reset and play with fadeIn
      console.log("No previous action, playing with fadeIn");
      action.reset().fadeIn(fadeDuration).play();
    }

    // Update current action reference
    currentActionRef.current = action;

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

  // ==========================================================
  // Pedagogic Gesture Overlay
  // ==========================================================
  const normalizeBoneName = (name = "") =>
    name.toLowerCase().replace(/mixamorig[:_]?/g, "").replace(/[\s_\-.:|]/g, "");

  const findBoneByPatterns = (patterns = [], avoid = []) => {
    if (!scene) return null;
    let found = null;
    scene.traverse((obj) => {
      if (found || !obj.isBone) return;
      const n = normalizeBoneName(obj.name);
      const ok = patterns.some((p) => n.includes(p));
      const bad = avoid.some((p) => n.includes(p));
      if (ok && !bad) found = obj;
    });
    return found;
  };

  const getPedagogicBones = () => ({
    spine: findBoneByPatterns(["spine"], ["finger", "thumb"]),
    chest: findBoneByPatterns(["chest", "upperchest", "spine2", "spine3", "spine003"], ["finger", "thumb"]),
    neck: findBoneByPatterns(["neck"], ["finger", "thumb"]),
    head: findBoneByPatterns(["head"], ["end", "top", "hair"]),
    rUpper: findBoneByPatterns(["rightupperarm", "rightarm", "upperarmr", "rupperarm", "uparmr", "armr", "rightshoulder"], ["fore", "lower", "hand", "finger", "thumb"]),
    rLower: findBoneByPatterns(["rightforearm", "rightlowerarm", "forearmr", "lowerarmr", "rforearm", "rlowerarm", "rightelbow"], ["hand", "finger", "thumb"]),
    rHand: findBoneByPatterns(["righthand", "handr", "rhand", "rightwrist"], ["finger", "thumb", "index", "middle", "ring", "pinky"]),
    lUpper: findBoneByPatterns(["leftupperarm", "leftarm", "upperarml", "lupperarm", "uparml", "arml", "leftshoulder"], ["fore", "lower", "hand", "finger", "thumb"]),
    lLower: findBoneByPatterns(["leftforearm", "leftlowerarm", "forearml", "lowerarml", "lforearm", "llowerarm", "leftelbow"], ["hand", "finger", "thumb"]),
    lHand: findBoneByPatterns(["lefthand", "handl", "lhand", "leftwrist"], ["finger", "thumb", "index", "middle", "ring", "pinky"]),
  });

  const rot = (bone, x = 0, y = 0, z = 0, weight = 1) => {
    if (!bone) return;
    bone.rotation.x += THREE.MathUtils.degToRad(x) * weight;
    bone.rotation.y += THREE.MathUtils.degToRad(y) * weight;
    bone.rotation.z += THREE.MathUtils.degToRad(z) * weight;
  };

  const applyPedagogicGestureOverlay = (elapsed, duration) => {
    if (!scene || !pedagogicGestureRef.current.active) return;
    const label = pedagogicGestureRef.current.label || "TALKING";
    if (pedagogicGestureRef.current.preferFbx && label.includes("POINT")) {
      // POINTING dimainkan oleh clip FBX hasil retarget Blender.
      // Namun beberapa build FBX dapat gagal bind ke bone avatar di browser.
      // Karena itu overlay tetap dibiarkan aktif sebagai fallback visual ringan.
      // Jika FBX sudah benar-benar kompatibel, overlay ini hanya mempertegas arah tangan.
    }
    const t = Math.min(1, Math.max(0, elapsed / Math.max(duration, 0.1)));
    const pulse = Math.sin(t * Math.PI);
    const wave = Math.sin(t * Math.PI * 6);
    const b = getPedagogicBones();

    if (label.includes("STANDING_GREETING") || label.includes("GREETING") || label.includes("SALAM")) {
      rot(b.head, 0, 0, 6 * wave, pulse);
      rot(b.neck, 0, 0, 3 * wave, pulse);
      rot(b.rUpper, 25, -35, -55 + 16 * wave, pulse);
      rot(b.rLower, 0, -45, -25 + 14 * wave, pulse);
      rot(b.rHand, 0, 0, 14 * wave, pulse);
      rot(b.lUpper, 12, 12, 20, pulse);
      return;
    }

    if (label.includes("POINT")) {
      // Gesture POINTING dibuat lebih tegas dan ditahan lebih lama.
      // hold menjaga tangan tetap menunjuk sepanjang respons, sedangkan micro memberi gerak natural kecil.
      const hold = Math.min(1, Math.max(0, t * 4));
      const release = t > 0.88 ? Math.max(0, 1 - (t - 0.88) / 0.12) : 1;
      const w = hold * release;
      const micro = Math.sin(t * Math.PI * 8) * 4;
      rot(b.chest || b.spine, 0, 0, -10 + micro * 0.15, w);
      rot(b.neck, 0, 0, -6 + micro * 0.08, w);
      rot(b.head, 0, 0, -9 + micro * 0.12, w);
      // Nilai dibuat besar karena orientasi bone ReadyPlayerMe/GLB sering berbeda.
      rot(b.rUpper, 55, -85, -115 + micro, w);
      rot(b.rLower, 0, -55, -70 + micro * 0.5, w);
      rot(b.rHand, 0, 0, -18 + micro * 0.4, w);
      rot(b.lUpper, 10, 12, 20, w);
      return;
    }

    if (label.includes("HEAD_NOD_YES") || label.includes("NOD") || label.includes("YES")) {
      // FORCE VISIBLE HEAD NOD:
      // Dibuat lebih lambat, lebih besar, dan tidak memakai pulse agar tidak hilang pada frame tertentu.
      // Tujuan: terlihat jelas di kamera depan walaupun animasi dasar sedang Idle/Talking.
      const nod = Math.sin(elapsed * Math.PI * 2.2); // sekitar 1.1 anggukan per detik
      const nod2 = Math.sin(elapsed * Math.PI * 4.4) * 0.35;
      const w = 1.0;

      // Debug satu kali untuk memastikan bone kepala/leher terbaca.
      if (!pedagogicGestureRef.current._headDebugPrinted) {
        pedagogicGestureRef.current._headDebugPrinted = true;
        console.log("HEAD_NOD_YES bone debug", {
          head: b.head?.name,
          neck: b.neck?.name,
          chest: b.chest?.name,
          spine: b.spine?.name
        });
      }

      // Kombinasi sumbu X/Y/Z karena orientasi bone ReadyPlayerMe/GLB dapat berbeda.
      rot(b.head, 58 * nod, 10 * nod2, 18 * nod, w);
      rot(b.neck, 34 * nod, 6 * nod2, 10 * nod, w);
      rot(b.chest || b.spine, 12 * nod, 0, 4 * nod, w);

      // Tangan dibuat sedikit aktif agar tidak tampak sama seperti Idle/Talking.
      rot(b.rUpper, 16, -14, -18 + 4 * nod2, w);
      rot(b.rLower, 0, -18, -12 + 3 * nod2, w);
      rot(b.lUpper, 16, 14, 18 - 4 * nod2, w);
      rot(b.lLower, 0, 18, 12 - 3 * nod2, w);
      return;
    }

    if (label.includes("SHAKING_HEAD_NO") || label.includes("SHAKING") || label.includes("NO")) {
      const shake = Math.sin(t * Math.PI * 8);
      rot(b.head, 0, 10 * shake, 36 * shake, pulse);
      rot(b.neck, 0, 5 * shake, 18 * shake, pulse);
      rot(b.chest || b.spine, 0, 2 * shake, 6 * shake, pulse);
      rot(b.rUpper, 12, -10, -14, pulse);
      rot(b.lUpper, 12, 10, 14, pulse);
      return;
    }

    if (label.includes("WRIT")) {
      rot(b.head, 12, 0, 0, pulse);
      rot(b.neck, 5, 0, 0, pulse);
      rot(b.chest || b.spine, 8, 0, 0, pulse);
      rot(b.rUpper, 48, -25, -40, pulse);
      rot(b.rLower, 0, -70, -25 + 10 * wave, pulse);
      rot(b.rHand, 18, 0, 14 * wave, pulse);
      return;
    }

    if (label.includes("THINK")) {
      rot(b.head, 8, 0, 12, pulse);
      rot(b.neck, 4, 0, 6, pulse);
      rot(b.chest || b.spine, 3, 0, 4, pulse);
      rot(b.rUpper, 38, -35, -65, pulse);
      rot(b.rLower, 0, -82, -25, pulse);
      rot(b.rHand, 15, 0, 10, pulse);
      return;
    }

    if (label.includes("CLAP")) {
      const close = Math.sin(t * Math.PI * 8) > 0 ? 1 : 0.35;
      rot(b.rUpper, 45, -50 * close, -35, pulse);
      rot(b.rLower, 0, -80 * close, -20, pulse);
      rot(b.lUpper, 45, 50 * close, 35, pulse);
      rot(b.lLower, 0, 80 * close, 20, pulse);
      return;
    }

    if (label.includes("HAND_RAISING") || label.includes("HAND RAISING") || label.includes("RAISE_HAND")) {
      // HAND_RAISING: tangan kanan diangkat jelas seperti siswa/guru memberi kesempatan menjawab.
      const hold = Math.min(1, Math.max(0, t * 4));
      const release = t > 0.90 ? Math.max(0, 1 - (t - 0.90) / 0.10) : 1;
      const w = hold * release;
      const micro = Math.sin(t * Math.PI * 8) * 4;
      if (!pedagogicGestureRef.current._handRaiseDebugPrinted) {
        pedagogicGestureRef.current._handRaiseDebugPrinted = true;
        console.log("HAND_RAISING bone debug", {
          rUpper: b.rUpper?.name,
          rLower: b.rLower?.name,
          rHand: b.rHand?.name,
          head: b.head?.name,
          chest: b.chest?.name
        });
      }
      rot(b.chest || b.spine, 0, -5, -4, w);
      rot(b.neck, 0, -4, -2, w);
      rot(b.head, 0, -6, -3, w);
      // Sumbu dibuat kombinatif agar tetap terlihat pada variasi orientasi bone ReadyPlayerMe.
      rot(b.rUpper, -95 + micro, -28, -72 + micro, w);
      rot(b.rLower, -55, -12, -22 + micro * 0.5, w);
      rot(b.rHand, -8, 6, 18 + micro, w);
      rot(b.lUpper, 12, 12, 18, w);
      rot(b.lLower, 0, 18, 10, w);
      return;
    }

    if (label.includes("COUNTING")) {
      // COUNTING: tangan kanan di depan badan dengan gerakan enumeratif; kepala sedikit mengangguk.
      const hold = Math.min(1, Math.max(0, t * 3));
      const w = hold;
      const beat = Math.sin(t * Math.PI * 10);
      const step = Math.sign(beat) * 6;
      if (!pedagogicGestureRef.current._countingDebugPrinted) {
        pedagogicGestureRef.current._countingDebugPrinted = true;
        console.log("COUNTING bone debug", {
          rUpper: b.rUpper?.name,
          rLower: b.rLower?.name,
          rHand: b.rHand?.name,
          head: b.head?.name,
          chest: b.chest?.name
        });
      }
      rot(b.chest || b.spine, 4, 0, -3, w);
      rot(b.neck, 2, 0, -2, w);
      rot(b.head, 6 + step * 0.3, 0, -3, w);
      rot(b.rUpper, 38, -42, -50 + step, w);
      rot(b.rLower, 0, -70, -34 + step, w);
      rot(b.rHand, 10, 0, 25 + step, w);
      rot(b.lUpper, 16, 18, 22, w);
      return;
    }

    if (label.includes("ACKNOWLEDGING")) {
      // ACKNOWLEDGING: kombinasi anggukan kecil dan tangan terbuka sebagai konfirmasi/pengakuan.
      const nod = Math.sin(elapsed * Math.PI * 2.0);
      const w = Math.min(1, Math.max(0.3, pulse));
      if (!pedagogicGestureRef.current._ackDebugPrinted) {
        pedagogicGestureRef.current._ackDebugPrinted = true;
        console.log("ACKNOWLEDGING bone debug", {
          head: b.head?.name,
          neck: b.neck?.name,
          rUpper: b.rUpper?.name,
          lUpper: b.lUpper?.name
        });
      }
      rot(b.head, 18 * nod, 0, 5 * nod, w);
      rot(b.neck, 10 * nod, 0, 3 * nod, w);
      rot(b.rUpper, 24, -20, -28 + 4 * nod, w);
      rot(b.rLower, 0, -30, -18 + 3 * nod, w);
      rot(b.lUpper, 20, 18, 26 - 4 * nod, w);
      rot(b.lLower, 0, 24, 14 - 3 * nod, w);
      return;
    }

    if (label.includes("THUMBS_UP")) {
      // THUMBS_UP: tangan kanan naik ke depan dada, pose apresiasi.
      const hold = Math.min(1, Math.max(0, t * 4));
      const release = t > 0.92 ? Math.max(0, 1 - (t - 0.92) / 0.08) : 1;
      const w = hold * release;
      const micro = Math.sin(t * Math.PI * 6) * 3;
      rot(b.head, 6, 0, 4 * Math.sin(t * Math.PI * 4), w);
      rot(b.rUpper, 42, -40, -55 + micro, w);
      rot(b.rLower, -12, -75, -28 + micro, w);
      rot(b.rHand, 20, 0, 28 + micro, w);
      rot(b.lUpper, 14, 12, 18, w);
      return;
    }

    if (label.includes("LOOKING")) {
      // LOOKING: kepala dan badan sedikit mengarah ke papan/objek visual, tangan tetap natural.
      const hold = Math.min(1, Math.max(0, t * 3));
      const w = hold;
      const micro = Math.sin(t * Math.PI * 4) * 2;
      rot(b.chest || b.spine, 0, -8, -6, w);
      rot(b.neck, 0, -10, -4 + micro, w);
      rot(b.head, 0, -16, -6 + micro, w);
      rot(b.rUpper, 14, -8, -12, w);
      rot(b.lUpper, 14, 8, 12, w);
      return;
    }



    if (label.includes("THANKFUL")) {
      const bow = Math.sin(t * Math.PI);
      rot(b.head, 14 * bow, 0, 0, pulse);
      rot(b.neck, 8 * bow, 0, 0, pulse);
      rot(b.chest || b.spine, 10 * bow, 0, 0, pulse);
      rot(b.rUpper, 26, -22, -32 + 6 * wave, pulse);
      rot(b.lUpper, 26, 22, 32 - 6 * wave, pulse);
      return;
    }

    if (label.includes("BASHFUL")) {
      rot(b.head, 10, 0, 12 + 4 * wave, pulse);
      rot(b.neck, 5, 0, 6, pulse);
      rot(b.chest || b.spine, 4, 0, 4, pulse);
      rot(b.rUpper, 22, -18, -28, pulse);
      rot(b.lUpper, 22, 18, 28, pulse);
      return;
    }

    if (label.includes("PATTING")) {
      const pat = Math.sin(t * Math.PI * 8);
      rot(b.head, 4, 0, 3 * pat, pulse);
      rot(b.rUpper, 42, -36, -46 + 6 * pat, pulse);
      rot(b.rLower, 0, -58, -22 + 10 * pat, pulse);
      rot(b.rHand, 12, 0, 18 + 8 * pat, pulse);
      rot(b.lUpper, 14, 12, 18, pulse);
      return;
    }

    if (label.includes("TALKING_ARGUMEN")) {
      rot(b.head, 0, 0, 4 * wave, pulse);
      rot(b.rUpper, 28, -24, -36 + 10 * wave, pulse);
      rot(b.rLower, 0, -36, -18 + 8 * wave, pulse);
      rot(b.lUpper, 18, 14, 22 - 6 * wave, pulse);
      return;
    }

    if (label.includes("TALKING_COMPARING")) {
      rot(b.head, 0, 0, 5 * wave, pulse);
      rot(b.rUpper, 24, -30, -36 + 12 * wave, pulse);
      rot(b.lUpper, 24, 30, 36 - 12 * wave, pulse);
      rot(b.rLower, 0, -30, -14, pulse);
      rot(b.lLower, 0, 30, 14, pulse);
      return;
    }

    if (label.includes("TALKING_PRESENTING")) {
      rot(b.chest || b.spine, 2, 0, -4, pulse);
      rot(b.head, 0, 0, 3 * wave, pulse);
      rot(b.rUpper, 30, -44, -60 + 8 * wave, pulse);
      rot(b.rLower, 0, -42, -30, pulse);
      rot(b.lUpper, 18, 18, 28, pulse);
      return;
    }

    if (label.includes("TALKING_OPEN_HAND")) {
      rot(b.rUpper, 26, -28, -38 + 8 * wave, pulse);
      rot(b.lUpper, 26, 28, 38 - 8 * wave, pulse);
      rot(b.rLower, 0, -38, -18, pulse);
      rot(b.lLower, 0, 38, 18, pulse);
      return;
    }

    if (label.includes("TALKING_EXPLAINING")) {
      rot(b.head, 0, 0, 4 * wave, pulse);
      rot(b.rUpper, 20, -18, -24 + 8 * wave, pulse);
      rot(b.rLower, 0, -30, -14 + 6 * wave, pulse);
      rot(b.lUpper, 18, 16, 22 - 8 * wave, pulse);
      rot(b.lLower, 0, 26, 12 - 6 * wave, pulse);
      return;
    }
    // Default TALKING overlay: gerakan tangan ringan selama avatar berbicara.
    rot(b.head, 0, 0, 4 * wave, pulse);
    rot(b.neck, 0, 0, 2 * wave, pulse);
    rot(b.rUpper, 18, -14, -18 + 8 * wave, pulse);
    rot(b.rLower, 0, -22, -10 + 6 * wave, pulse);
    rot(b.lUpper, 16, 14, 18 - 8 * wave, pulse);
    rot(b.lLower, 0, 22, 10 - 6 * wave, pulse);
  };

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

    // Overlay gesture pedagogik setelah mixer update, agar pose pedagogik tidak tertimpa animasi dasar.
    if (pedagogicGestureRef.current.active) {
      const now = performance.now() / 1000;
      const elapsed = now - pedagogicGestureRef.current.start;
      const duration = pedagogicGestureRef.current.duration || 4;
      if (elapsed <= duration) {
        applyPedagogicGestureOverlay(elapsed, duration);
      } else {
        pedagogicGestureRef.current.active = false;
      }
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
useGLTF.preload("/models/menjelaskan_normal.glb");
[
  "Pointing.glb",
  "HandRaising.glb",
  "HeadNodding.glb",
  "HeadNo.glb",
  "Looking.glb",
  "Thinking.glb",
  "Bashful.glb",
  "Clapping.glb",
  "Counting.glb",
  "Patting.glb",
  "StandingGreeting.glb",
  "Talking_Argumen.glb",
  "Talking_Comparing.glb",
  "Talking_Explaining.glb",
  "Talking_OpenHand.glb",
  "Talking_Presenting.glb",
  "Thankful.glb"
].forEach((file) => useGLTF.preload(`/animations/gesture_pedagogik/${file}`));