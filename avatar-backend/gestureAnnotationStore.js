import { existsSync, mkdirSync, writeFileSync, appendFileSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const annotationDir = path.join(__dirname, "annotations");
const csvPath = path.join(annotationDir, "gesture_annotations.csv");
const jsonlPath = path.join(annotationDir, "gesture_logs.jsonl");

export const ANNOTATION_HEADER = [
  "annotation_id",
  "session_id",
  "timestamp",
  "user_input",
  "ai_response",
  "predicted_gesture",
  "predicted_gesture_sequence",
  "confidence",
  "audio_duration",
  "animation_clip",
  "lip_sync_file",
  "pedagogical_context",
  "gold_gesture_label",
  "gold_gesture_sequence",
  "gesture_function",
  "suitability_score",
  "naturalness_score",
  "sync_score",
  "engagement_support_score",
  "annotator_name",
  "validation_status",
  "notes"
];

function ensureAnnotationFiles() {
  if (!existsSync(annotationDir)) {
    mkdirSync(annotationDir, { recursive: true });
  }
  if (!existsSync(csvPath)) {
    writeFileSync(csvPath, ANNOTATION_HEADER.join(",") + "\n", "utf8");
  }
  if (!existsSync(jsonlPath)) {
    writeFileSync(jsonlPath, "", "utf8");
  }
}

function csvCell(value) {
  if (value === undefined || value === null) return "";
  const text = Array.isArray(value) ? value.join("|") : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function sequenceToText(value) {
  if (!value) return "";
  if (Array.isArray(value)) return value.join("|");
  return String(value);
}

function createAnnotationId() {
  return `ANN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function normalizeAnnotationPayload(data = {}) {
  const sequence = data.predicted_gesture_sequence || data.gestureLabels || data.gestures || [];
  const predictedGesture =
    data.predicted_gesture ||
    data.gesture ||
    data.gestureLabel ||
    (Array.isArray(sequence) && sequence.length > 0 ? sequence[0] : "") ||
    "normal";

  return {
    annotation_id: data.annotation_id || createAnnotationId(),
    session_id: data.session_id || data.sessionId || "",
    timestamp: data.timestamp || new Date().toISOString(),
    user_input: data.user_input || data.userMessage || data.message || data.question || "",
    ai_response: data.ai_response || data.text || data.response || data.answer || "",
    predicted_gesture: predictedGesture,
    predicted_gesture_sequence: sequenceToText(sequence.length ? sequence : [predictedGesture]),
    confidence: data.confidence ?? data.gestureConfidence ?? data.gesturePrediction?.confidence ?? "",
    audio_duration: data.audio_duration ?? data.audioDuration ?? data.duration ?? "",
    animation_clip: data.animation_clip || data.animationClip || predictedGesture,
    lip_sync_file: data.lip_sync_file || data.lipsyncFile || data.lipsync || "generated.json",
    pedagogical_context: data.pedagogical_context || "",
    gold_gesture_label: data.gold_gesture_label || "",
    gold_gesture_sequence: sequenceToText(data.gold_gesture_sequence || ""),
    gesture_function: data.gesture_function || "",
    suitability_score: data.suitability_score || "",
    naturalness_score: data.naturalness_score || "",
    sync_score: data.sync_score || "",
    engagement_support_score: data.engagement_support_score || "",
    annotator_name: data.annotator_name || "",
    validation_status: data.validation_status || "system-log",
    notes: data.notes || ""
  };
}

export function saveGestureAnnotation(data = {}) {
  ensureAnnotationFiles();
  const rowData = normalizeAnnotationPayload(data);
  appendFileSync(jsonlPath, JSON.stringify(rowData) + "\n", "utf8");
  appendFileSync(csvPath, ANNOTATION_HEADER.map((key) => csvCell(rowData[key])).join(",") + "\n", "utf8");
  return rowData;
}

export function listGestureAnnotations(limit = 100) {
  ensureAnnotationFiles();
  return readFileSync(jsonlPath, "utf8")
    .split("\n")
    .filter(Boolean)
    .slice(-limit)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        return null;
      }
    })
    .filter(Boolean)
    .reverse();
}

export function getGestureAnnotationCSVPath() {
  ensureAnnotationFiles();
  return csvPath;
}
