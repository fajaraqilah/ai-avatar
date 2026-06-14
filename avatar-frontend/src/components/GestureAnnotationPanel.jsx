import React, { useState } from "react";

const gestureOptions = [
  "THINKING",
  "BASHFUL",
  "CLAPPING",
  "COUNTING",
  "HAND_RAISING",
  "SHAKING_HEAD_NO",
  "HEAD_NOD_YES",
  "LOOKING",
  "PATTING",
  "POINTING",
  "STANDING_GREETING",
  "TALKING_ARGUMEN",
  "TALKING_COMPARING",
  "TALKING_EXPLAINING",
  "TALKING_OPEN_HAND",
  "TALKING_PRESENTING",
  "THANKFUL",
  "Idle",
];

export default function GestureAnnotationPanel({ message, persistentMessage, apiBaseUrl = "http://localhost:3000/api" }) {
  const source = persistentMessage || message;
  const [visible, setVisible] = useState(false); // default: hanya tombol kecil agar tidak menutup layar utama
  const [minimized, setMinimized] = useState(false);
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({
    gold_gesture_label: "",
    gold_gesture_sequence: "",
    gesture_function: "",
    pedagogical_context: "",
    suitability_score: "",
    naturalness_score: "",
    sync_score: "",
    engagement_support_score: "",
    annotator_name: "",
    notes: "",
  });

  if (!visible) {
    return (
      <button onClick={() => setVisible(true)} style={floatBtn} title="Buka anotasi gesture">
        📝
      </button>
    );
  }

  const predictedGesture = source?.gesture_annotation?.predicted_gesture || source?.gestureLabels?.[0] || source?.sentenceGestureSequence?.[0] || "-";
  const sequence = source?.gesture_annotation?.predicted_gesture_sequence ||
    (Array.isArray(source?.sentenceGestureSequence) ? source.sentenceGestureSequence.join(" | ") :
      Array.isArray(source?.gestureLabels) ? source.gestureLabels.join(" | ") : "-");

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const save = async () => {
    try {
      setStatus("");
      const payload = {
        annotation_id: source?.annotation_id || source?.session_id || `ANN-${Date.now()}`,
        session_id: source?.session_id || "",
        user_input: source?.user_input || "",
        ai_response: source?.text || "",
        predicted_gesture: predictedGesture,
        predicted_gesture_sequence: sequence,
        confidence: source?.gesture_annotation?.confidence || source?.mlGesture?.confidence || "",
        audio_duration: source?.audioDuration || "",
        animation_clip: predictedGesture,
        lip_sync_file: "generated.json",
        validation_status: "validated",
        ...form,
      };
      const res = await fetch(`${apiBaseUrl}/gesture-annotate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success) setStatus("Anotasi berhasil disimpan.");
      else setStatus(`Gagal: ${result.message || "tidak diketahui"}`);
    } catch (e) {
      setStatus("Gagal terhubung ke backend anotasi.");
    }
  };

  return (
    <div style={panel}>
      <div style={head}>
        <strong style={title}>Anotasi Gesture</strong>
        <div style={headButtons}>
          <button onClick={() => setMinimized(!minimized)} style={minBtn} title="Minimalkan/buka panel">
            {minimized ? "Buka" : "Min"}
          </button>
          <button onClick={() => setVisible(false)} style={xBtn} title="Tutup panel">×</button>
        </div>
      </div>

      {minimized ? (
        <p style={miniText}>Panel anotasi siap.</p>
      ) : (
        <>
          <div style={info}>
            <b>ID:</b> {source?.annotation_id || "-"}<br />
            <b>Input:</b> {source?.user_input || "-"}<br />
            <b>Prediksi:</b> {predictedGesture}<br />
            <b>Sequence:</b> {sequence}<br />
            <b>Durasi:</b> {source?.audioDuration || "-"} detik
          </div>

          {field("Gold Label", "gold_gesture_label", "select", onChange)}
          {field("Gold Sequence", "gold_gesture_sequence", "input", onChange, "Contoh: COUNTING|POINTING")}
          {field("Fungsi Gesture", "gesture_function", "input", onChange, "Contoh: menjelaskan")}
          {field("Konteks", "pedagogical_context", "input", onChange, "Contoh: penjelasan")}
          <div style={scoreGrid}>
            {field("Kesesuaian", "suitability_score", "number", onChange)}
            {field("Naturalitas", "naturalness_score", "number", onChange)}
            {field("Sinkron", "sync_score", "number", onChange)}
            {field("Engagement", "engagement_support_score", "number", onChange)}
          </div>
          {field("Anotator", "annotator_name", "input", onChange)}
          <label style={label}>Catatan</label>
          <textarea name="notes" onChange={onChange} style={{ ...input, minHeight: 48 }} />
          <button onClick={save} style={saveBtn}>Simpan</button>
          <div style={{ marginTop: 6 }}>
            <a href={`${apiBaseUrl}/gesture-annotations/export`} target="_blank" rel="noreferrer" style={linkStyle}>Download CSV Anotasi</a>
          </div>
          {status && <p style={statusText}>{status}</p>}
        </>
      )}
    </div>
  );
}

function field(labelText, name, type, onChange, placeholder = "") {
  return (
    <div>
      <label style={label}>{labelText}</label>
      {type === "select" ? (
        <select name={name} onChange={onChange} style={input}>
          <option value="">Pilih label</option>
          {gestureOptions.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      ) : (
        <input name={name} type={type} min="1" max="5" onChange={onChange} placeholder={placeholder} style={input} />
      )}
    </div>
  );
}

const panel = {
  position: "fixed",
  right: 14,
  bottom: 92,
  width: 340,
  maxWidth: "calc(100vw - 28px)",
  maxHeight: "50vh",
  overflow: "auto",
  zIndex: 31,
  background: "rgba(255,255,255,0.90)",
  borderRadius: 14,
  boxShadow: "0 8px 22px rgba(15,23,42,0.20)",
  padding: 10,
  fontFamily: "Arial, sans-serif",
  backdropFilter: "blur(8px)",
};
const head = { display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 8 };
const title = { fontSize: 14, lineHeight: 1.2 };
const headButtons = { display: "flex", gap: 4, alignItems: "center" };
const minBtn = { border: "none", borderRadius: 8, padding: "5px 8px", background: "#4f46e5", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 12 };
const xBtn = { border: "none", borderRadius: 8, padding: "5px 9px", background: "#e5e7eb", cursor: "pointer", fontWeight: 700, fontSize: 13 };
const info = { background: "#f1f5f9", borderRadius: 9, padding: 8, fontSize: 11, marginBottom: 8 };
const label = { fontSize: 11, fontWeight: 700, display: "block", marginTop: 6 };
const input = { width: "100%", boxSizing: "border-box", padding: "6px 7px", border: "1px solid #cbd5e1", borderRadius: 8, marginTop: 3, fontSize: 12 };
const scoreGrid = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 8px" };
const saveBtn = { width: "100%", padding: "8px", border: "none", borderRadius: 9, background: "#16a34a", color: "#fff", fontWeight: 800, marginTop: 10, cursor: "pointer", fontSize: 12 };
const floatBtn = { position: "fixed", right: 14, bottom: 146, width: 44, height: 44, borderRadius: "50%", border: "none", background: "#db2777", color: "#fff", fontSize: 19, zIndex: 31, cursor: "pointer", boxShadow: "0 6px 16px rgba(15,23,42,0.22)" };
const miniText = { fontSize: 12, margin: 0, color: "#334155" };
const linkStyle = { fontSize: 12 };
const statusText = { fontSize: 11, margin: "6px 0 0", color: "#334155" };
