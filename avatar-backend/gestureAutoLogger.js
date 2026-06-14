import { saveGestureAnnotation } from "./gestureAnnotationStore.js";

function firstGesture(payload = {}) {
  if (Array.isArray(payload.gestureLabels) && payload.gestureLabels.length > 0) return payload.gestureLabels[0];
  if (Array.isArray(payload.gestures) && payload.gestures.length > 0) return payload.gestures[0];
  if (payload.gesture_annotation?.predicted_gesture) return payload.gesture_annotation.predicted_gesture;
  return payload.predicted_gesture || payload.gesture || payload.gestureLabel || "normal";
}

export function logVirtualTeacherOutput(payload = {}) {
  const predictedGesture = firstGesture(payload);

  return saveGestureAnnotation({
    session_id: payload.session_id || payload.sessionId || "",
    user_input: payload.user_input || payload.userMessage || payload.message || payload.question || "",
    ai_response: payload.ai_response || payload.text || payload.response || payload.answer || "",
    predicted_gesture: predictedGesture,
    predicted_gesture_sequence: payload.gestureLabels || payload.gestures || [predictedGesture],
    confidence: payload.confidence || payload.gestureConfidence || payload.gesturePrediction?.confidence || "",
    audio_duration: payload.audioDuration || payload.audio_duration || payload.duration || "",
    animation_clip: payload.animationClip || payload.animation_clip || predictedGesture,
    lip_sync_file: payload.lipsyncFile || payload.lipsync || "generated.json",
    validation_status: "system-log"
  });
}
