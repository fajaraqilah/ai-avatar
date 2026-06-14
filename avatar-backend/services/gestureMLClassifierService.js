import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PYTHON_BIN = process.env.PYTHON_BIN || "python";
const PREDICT_SCRIPT = path.join(__dirname, "..", "ml", "predict_pedagogic_gesture.py");

function sanitizeClassifierResult(result, fallbackText = "") {
  return {
    input_text: result.input_text || fallbackText,
    gesture_label: result.gesture_label || "TALKING",
    canonical_label: result.canonical_label || result.gesture_label || "TALKING",
    confidence: result.confidence ?? 0,
    animation_clip: result.animation_clip || result.frontend_animation_clip || "TALKING",
    frontend_animation_clip: result.frontend_animation_clip || result.animation_clip || "TALKING",
    animation_file: result.animation_file || "",
    frontend_animation_path: result.frontend_animation_path || "",
    decision_source: result.decision_source || "ml",
    ml_prediction: result.ml_prediction || "",
    rule_hits: result.rule_hits || 0,
    top3: result.top3 || [],
    gesture_function: result.gesture_function || result.pedagogic_analysis || "",
    pedagogical_context: result.pedagogical_context || result.pedagogic_category || "",
    pedagogic_category: result.pedagogic_category || "",
    pedagogic_analysis: result.pedagogic_analysis || "",
    data_type: result.data_type || "",
    teacher_sentence: result.teacher_sentence || result.example_sentence || "",
    example_sentence: result.example_sentence || result.teacher_sentence || ""
  };
}

export function classifyGestureML(text = "") {
  return new Promise((resolve, reject) => {
    const py = spawn(PYTHON_BIN, [PREDICT_SCRIPT, "--text", text], {
      cwd: path.join(__dirname, "..")
    });

    let stdout = "";
    let stderr = "";

    py.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    py.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    py.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(stderr || `Python classifier exited with code ${code}`));
      }

      try {
        const result = JSON.parse(stdout.trim());
        resolve(sanitizeClassifierResult(result, text));
      } catch (error) {
        reject(new Error(`Gagal parsing output classifier: ${stdout}`));
      }
    });
  });
}

export function fallbackGestureML(text = "") {
  return {
    input_text: text,
    gesture_label: "TALKING",
    canonical_label: "TALKING",
    confidence: 0,
    animation_clip: "TALKING",
    frontend_animation_clip: "TALKING",
    animation_file: "",
    gesture_function: "Fallback ketika model ML gagal dipanggil",
    pedagogical_context: "fallback",
    pedagogic_category: "fallback",
    pedagogic_analysis: "Fallback ketika model ML gagal dipanggil",
    data_type: "fallback",
    teacher_sentence: ""
  };
}
