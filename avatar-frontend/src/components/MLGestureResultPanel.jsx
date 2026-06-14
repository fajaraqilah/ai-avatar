import React, { useMemo, useState } from "react";

// Panel ini menampilkan gesture yang BENAR-BENAR dipakai pada timeline animasi.
// Sebelumnya panel membaca source.mlGesture, yaitu prediksi global terhadap seluruh jawaban guru.
// Pada sentence-level gesture classification, animasi yang dimainkan frontend berasal dari
// source.sentenceGestureMapping / source.gestureLabels. Karena itu panel ML harus mengikuti timeline,
// bukan prediksi global, agar tidak muncul perbedaan seperti ML=THANKFUL tetapi mapping=STANDING_GREETING.

const GESTURE_FUNCTION = {
  THINKING: "Mengajak siswa berpikir atau merefleksikan jawaban",
  BASHFUL: "Menunjukkan respons rendah hati atau malu-malu",
  CLAPPING: "Memberikan apresiasi dengan tepuk tangan",
  COUNTING: "Menjelaskan tahapan, urutan, atau daftar poin",
  HAND_RAISING: "Mengajak siswa bertanya atau merespons",
  SHAKING_HEAD_NO: "Mengoreksi jawaban yang belum tepat",
  HEAD_NOD_YES: "Memberi konfirmasi atau persetujuan",
  LOOKING: "Mengarahkan perhatian visual siswa",
  PATTING: "Memberikan dukungan dan motivasi",
  POINTING: "Menunjuk objek, papan, gambar, diagram, atau bagian penting",
  STANDING_GREETING: "Membuka pembelajaran atau menyapa siswa",
  TALKING_ARGUMEN: "Memberikan alasan atau argumentasi",
  TALKING_COMPARING: "Membandingkan dua konsep atau metode",
  TALKING_EXPLAINING: "Menjelaskan konsep utama secara runtut",
  TALKING_OPEN_HAND: "Memberikan penjelasan terbuka dan ramah",
  TALKING_PRESENTING: "Menyajikan ringkasan atau kesimpulan",
  THANKFUL: "Mengucapkan terima kasih atau menutup pembelajaran"
};

const PEDAGOGICAL_CONTEXT = {
  THINKING: "Refleksi / Berpikir kritis",
  BASHFUL: "Respons sosial rendah hati",
  CLAPPING: "Apresiasi positif",
  COUNTING: "Fase Strukturisasi / Enumerasi",
  HAND_RAISING: "Interaksi tanya jawab",
  SHAKING_HEAD_NO: "Koreksi / Penolakan jawaban salah",
  HEAD_NOD_YES: "Konfirmasi / Persetujuan jawaban benar",
  LOOKING: "Arah perhatian visual",
  PATTING: "Motivasi / Dukungan emosional",
  POINTING: "Fase Deiksis Visual / Penunjukan objek",
  STANDING_GREETING: "Pembuka pembelajaran / Salam",
  TALKING_ARGUMEN: "Argumentasi pedagogik",
  TALKING_COMPARING: "Komparasi konsep",
  TALKING_EXPLAINING: "Penjelasan materi",
  TALKING_OPEN_HAND: "Penjelasan terbuka",
  TALKING_PRESENTING: "Presentasi / Kesimpulan",
  THANKFUL: "Apresiasi sosial / Penutup positif"
};

const ALIAS = {
  Greeting: "STANDING_GREETING",
  GREETING: "STANDING_GREETING",
  greeting: "STANDING_GREETING",
  StandingGreeting: "STANDING_GREETING",
  STANDINGGREETING: "STANDING_GREETING",
  closing: "THANKFUL",
  Closing: "THANKFUL",
  CLOSING: "THANKFUL",
  Thankful: "THANKFUL",
  Thanks: "THANKFUL",
  normal: "TALKING_EXPLAINING",
  Normal: "TALKING_EXPLAINING",
  terbuka: "TALKING_OPEN_HAND",
  Terbuka: "TALKING_OPEN_HAND",
  Talking_Argumen: "TALKING_ARGUMEN",
  Talking_Comparing: "TALKING_COMPARING",
  Talking_Explaining: "TALKING_EXPLAINING",
  Talking_OpenHand: "TALKING_OPEN_HAND",
  Talking_Presenting: "TALKING_PRESENTING",
  HandRaising: "HAND_RAISING",
  HeadNo: "SHAKING_HEAD_NO",
  HeadNodding: "HEAD_NOD_YES"
};

function normalizeGesture(label = "") {
  const raw = String(label || "").trim();
  if (!raw) return "TALKING_EXPLAINING";
  if (ALIAS[raw]) return ALIAS[raw];
  const upper = raw.toUpperCase().replace(/[\s-]+/g, "_");
  if (GESTURE_FUNCTION[upper]) return upper;
  if (upper.includes("GREETING") || upper.includes("SALAM")) return "STANDING_GREETING";
  if (upper.includes("THANK") || upper.includes("CLOSING") || upper.includes("TERIMA")) return "THANKFUL";
  if (upper.includes("OPEN")) return "TALKING_OPEN_HAND";
  if (upper.includes("EXPLAIN")) return "TALKING_EXPLAINING";
  if (upper.includes("PRESENT")) return "TALKING_PRESENTING";
  if (upper.includes("COMPARE")) return "TALKING_COMPARING";
  if (upper.includes("ARGUM")) return "TALKING_ARGUMEN";
  if (upper.includes("COUNT")) return "COUNTING";
  if (upper.includes("POINT")) return "POINTING";
  if (upper.includes("HAND") && upper.includes("RAIS")) return "HAND_RAISING";
  if (upper.includes("NO") || upper.includes("SHAKE")) return "SHAKING_HEAD_NO";
  if (upper.includes("YES") || upper.includes("NOD")) return "HEAD_NOD_YES";
  if (upper.includes("LOOK")) return "LOOKING";
  if (upper.includes("CLAP")) return "CLAPPING";
  if (upper.includes("THINK")) return "THINKING";
  if (upper.includes("PATT")) return "PATTING";
  if (upper.includes("BASH")) return "BASHFUL";
  return "TALKING_EXPLAINING";
}

function buildTimelineRows(source) {
  if (!source) return [];

  if (Array.isArray(source.sentenceGestureMapping) && source.sentenceGestureMapping.length > 0) {
    return source.sentenceGestureMapping.map((row, index) => {
      const gesture = normalizeGesture(row.gesture_label || row.animation_clip || row.frontend_animation_clip);
      return {
        index,
        sentence: row.sentence_text || row.text || row.kalimat || "-",
        gesture_label: gesture,
        confidence: row.confidence || source?.mlGesture?.confidence || "",
        start_time: row.start_time ?? row.start ?? "",
        end_time: row.end_time ?? row.end ?? "",
        animation_clip: gesture,
        gesture_function: row.gesture_function || GESTURE_FUNCTION[gesture] || "Gesture avatar",
        pedagogical_context: row.pedagogical_context || PEDAGOGICAL_CONTEXT[gesture] || "Konteks pembelajaran"
      };
    });
  }

  const sequence = Array.isArray(source.gestureLabels) ? source.gestureLabels : [];
  return sequence.map((label, index) => {
    const gesture = normalizeGesture(label);
    return {
      index,
      sentence: index === 0 ? (source.text || source.teacherResponse || "-") : "Gesture lanjutan / transisi",
      gesture_label: gesture,
      confidence: source?.mlGesture?.confidence || "",
      start_time: "",
      end_time: "",
      animation_clip: gesture,
      gesture_function: GESTURE_FUNCTION[gesture] || "Gesture avatar",
      pedagogical_context: PEDAGOGICAL_CONTEXT[gesture] || "Konteks pembelajaran"
    };
  });
}

export default function MLGestureResultPanel({ message, persistentMessage }) {
  const [expanded, setExpanded] = useState(false);
  const source = persistentMessage || message;
  const globalMl = source?.mlGesture || null;

  const timelineRows = useMemo(() => buildTimelineRows(source), [source]);
  const primary = timelineRows[0] || null;

  if (!source || (!primary && !globalMl)) return null;

  const displayedLabel = primary?.gesture_label || normalizeGesture(globalMl?.gesture_label || globalMl?.animation_clip || "TALKING_EXPLAINING");
  const displayedConfidence = primary?.confidence || globalMl?.confidence || "";
  const globalLabel = globalMl ? normalizeGesture(globalMl.gesture_label || globalMl.animation_clip) : "";
  const isDifferent = globalLabel && displayedLabel && globalLabel !== displayedLabel;

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        title="Buka output gesture aktual dari timeline animasi"
        style={pillStyle}
      >
        <b>ML</b>&nbsp;{displayedLabel}
      </button>
    );
  }

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <strong>Output Gesture Aktual</strong>
        <button onClick={() => setExpanded(false)} style={minButton}>Min</button>
      </div>

      <div style={infoBox}>
        <div><b>Label tampil:</b> {displayedLabel}</div>
        <div><b>Animasi:</b> {primary?.animation_clip || displayedLabel}</div>
        <div><b>Confidence:</b> {displayedConfidence !== "" ? Number(displayedConfidence || 0).toFixed(3) : "-"}</div>
        <div><b>Fungsi:</b> {primary?.gesture_function || GESTURE_FUNCTION[displayedLabel]}</div>
        <div><b>Konteks:</b> {primary?.pedagogical_context || PEDAGOGICAL_CONTEXT[displayedLabel]}</div>
      </div>

      {timelineRows.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Sequence dari Mapping Gesture</div>
          <div style={sequenceBox}>
            {timelineRows.map((row) => (
              <span key={row.index} style={tagStyle}>{row.gesture_label}</span>
            ))}
          </div>
          <div style={tableBox}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={th}>No</th>
                  <th style={th}>Kalimat</th>
                  <th style={th}>Gesture</th>
                </tr>
              </thead>
              <tbody>
                {timelineRows.map((row) => (
                  <tr key={row.index}>
                    <td style={td}>{row.index + 1}</td>
                    <td style={td}>{row.sentence}</td>
                    <td style={td}><b>{row.gesture_label}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {globalMl && (
        <div style={globalBox}>
          <div><b>Prediksi global respons utuh:</b> {globalLabel}</div>
          <div><b>Catatan:</b> {isDifferent
            ? "Berbeda dari timeline karena sistem memakai sentence-level gesture untuk animasi frontend."
            : "Sama dengan gesture timeline."}
          </div>
        </div>
      )}
    </div>
  );
}

const pillStyle = {
  position: "fixed",
  right: 84,
  top: 250,
  zIndex: 32,
  border: "none",
  borderRadius: 999,
  padding: "10px 14px",
  background: "rgba(17,24,39,0.92)",
  color: "#fff",
  fontSize: 13,
  cursor: "pointer",
  boxShadow: "0 6px 18px rgba(15,23,42,0.22)",
  maxWidth: 260,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
};

const panelStyle = {
  position: "fixed",
  right: 84,
  top: 250,
  width: 360,
  maxWidth: "86vw",
  maxHeight: "52vh",
  overflow: "auto",
  zIndex: 32,
  background: "rgba(255,255,255,0.96)",
  borderRadius: 14,
  padding: 12,
  boxShadow: "0 8px 24px rgba(15,23,42,0.18)",
  fontFamily: "Arial, sans-serif",
  fontSize: 13
};

const headerStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 };
const minButton = { border: "none", borderRadius: 8, padding: "6px 10px", background: "#111827", color: "#fff", cursor: "pointer", fontWeight: 700 };
const infoBox = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, lineHeight: 1.45 };
const sequenceBox = { display: "flex", gap: 6, flexWrap: "wrap" };
const tagStyle = { background: "#e0f2fe", color: "#075985", border: "1px solid #bae6fd", borderRadius: 999, padding: "4px 8px", fontSize: 11, fontWeight: 700 };
const tableBox = { marginTop: 8, maxHeight: 150, overflow: "auto", border: "1px solid #e5e7eb", borderRadius: 8 };
const tableStyle = { width: "100%", borderCollapse: "collapse", fontSize: 12 };
const th = { borderBottom: "1px solid #e5e7eb", padding: 6, textAlign: "left", background: "#f1f5f9" };
const td = { borderTop: "1px solid #e5e7eb", padding: 6, verticalAlign: "top" };
const globalBox = { marginTop: 10, padding: 10, background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, color: "#7c2d12", lineHeight: 1.4 };
