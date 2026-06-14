import {
  GESTURE_FUNCTION,
  PEDAGOGICAL_CONTEXT,
  GESTURE_ANIMATION_FILE,
  normalizeGestureLabel
} from "./sentenceGestureMapper.js";

function dominantMouthCue(cues = []) {
  if (!cues.length) return "";
  const counts = {};
  cues.forEach((cue) => {
    const value = cue.value || "";
    counts[value] = (counts[value] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
}

function cuesInRange(cues = [], start, end) {
  return cues.filter((cue) => {
    const cueStart = Number(cue.start || 0);
    const cueEnd = Number(cue.end || 0);
    return cueStart < end && cueEnd > start;
  });
}

export function buildGestureTimeline({ lipsync, gestureSequence, audioDuration, audioFile, sessionId }) {
  const duration = Number(audioDuration) || Number(lipsync?.metadata?.duration) || 0;

  if (!duration) {
    throw new Error("audioDuration tidak ditemukan. Kirim audioDuration atau metadata.duration dari generated.json.");
  }

  const gestures = Array.isArray(gestureSequence) && gestureSequence.length
    ? gestureSequence.map(normalizeGestureLabel)
    : ["TALKING_EXPLAINING"];

  const mouthCues = lipsync?.mouthCues || [];
  const segmentDuration = duration / gestures.length;

  return gestures.map((gesture, index) => {
    const canonical = normalizeGestureLabel(gesture);
    const start = Number((index * segmentDuration).toFixed(3));
    const end = Number((index === gestures.length - 1 ? duration : (index + 1) * segmentDuration).toFixed(3));
    const selectedCues = cuesInRange(mouthCues, start, end);

    return {
      session_id: sessionId || "",
      audio_file: audioFile || lipsync?.metadata?.soundFile || "generated.wav",
      audio_duration: duration,
      segment_index: index,
      start_time: start,
      end_time: end,
      duration: Number((end - start).toFixed(3)),
      gesture_label: canonical,
      canonical_label: canonical,
      animation_clip: canonical,
      frontend_animation_clip: canonical,
      animation_file: GESTURE_ANIMATION_FILE[canonical],
      frontend_animation_path: `/animations/gesture_pedagogik/${GESTURE_ANIMATION_FILE[canonical]}`,
      gesture_function: GESTURE_FUNCTION[canonical] || "Gesture avatar",
      pedagogical_context: PEDAGOGICAL_CONTEXT[canonical] || "Konteks pembelajaran",
      mouth_cue_count: selectedCues.length,
      dominant_mouth_cue: dominantMouthCue(selectedCues),
      annotation_status: "mapped",
      gold_gesture_label: "",
      suitability_score: "",
      naturalness_score: "",
      sync_score: "",
      engagement_support_score: "",
      annotator_name: "",
      notes: ""
    };
  });
}
