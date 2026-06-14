import React, { useMemo, useRef, useState } from "react";
import { buildSentenceGestureMapping, normalizeSentenceGestureRows } from "../utils/sentenceGestureMappingUtils";
import { downloadGestureMappingCsv } from "../utils/csvExportUtils";

const colors = ["#2563eb", "#059669", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#db2777", "#65a30d"];

export default function SentenceGestureMappingPanel({
  message,
  persistentMessage,
  audioUrl = "http://localhost:3000/audios/generated.mp3",
  apiBaseUrl = "http://localhost:3000/api",
}) {
  const audioRef = useRef(null);
  const [visible, setVisible] = useState(false); // default: tidak menutup tampilan utama
  const [minimized, setMinimized] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const source = persistentMessage || message;

  const mapping = useMemo(() => {
    if (!source) return [];
    if (Array.isArray(source.sentenceGestureMapping) && source.sentenceGestureMapping.length > 0) {
      return normalizeSentenceGestureRows(source.sentenceGestureMapping);
    }
    const sequenceFromTimeline = Array.isArray(source.gestureTimeline)
      ? source.gestureTimeline.map((item) => item.gesture_label)
      : [];
    return normalizeSentenceGestureRows(buildSentenceGestureMapping({
      text: source.text || source.ai_response || source.response || "",
      gestureSequence: sequenceFromTimeline.length > 0 ? sequenceFromTimeline : (source.gestureLabels || source.gestures || []),
      lipsync: source.lipsync || source.lipSync || null,
      audioDuration: source.audioDuration || source.audio_duration || source.lipsync?.metadata?.duration || 0,
      audioFile: source.audio_file || "generated.wav",
      sessionId: source.session_id || source.annotation_id || "",
    }));
  }, [source]);

  const duration = useMemo(() => Math.max(...mapping.map((row) => Number(row.end_time || 0)), 0), [mapping]);

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        style={floatingButton}
        title="Buka grafik mapping gesture"
      >
        📊
      </button>
    );
  }

  const playSegment = (row) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Number(row.start_time || 0);
      audioRef.current.play();
    }
  };

  const saveToBackend = async () => {
    try {
      setSaveMessage("");
      const response = await fetch(`${apiBaseUrl}/sentence-gesture-mapping/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: mapping,
          meta: {
            session_id: source?.session_id || source?.annotation_id || "",
            audio_file: "generated.wav",
            audio_duration: source?.audioDuration || source?.audio_duration || duration,
          },
          mode: "append",
        }),
      });
      const result = await response.json();
      if (result.success) setSaveMessage(`Berhasil menyimpan ${result.count} baris mapping.`);
      else setSaveMessage(`Gagal menyimpan: ${result.message || "tidak diketahui"}`);
    } catch (error) {
      setSaveMessage("Gagal terhubung ke backend. CSV lokal tetap bisa diunduh.");
    }
  };

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <strong style={titleStyle}>Mapping Gesture</strong>
        <div style={headerButtons}>
          <button onClick={() => setMinimized(!minimized)} style={smallButton} title="Minimalkan/buka panel">
            {minimized ? "Buka" : "Min"}
          </button>
          <button onClick={() => setVisible(false)} style={closeButton} title="Tutup panel">×</button>
        </div>
      </div>

      {minimized ? (
        <p style={miniText}>{mapping.length ? `${mapping.length} segmen gesture tersedia.` : "Belum ada mapping."}</p>
      ) : (
        <>
          {!mapping.length ? (
            <div style={emptyBox}>
              <p style={{ margin: 0, fontSize: 12, color: "#475569" }}>
                Mapping akan muncul setelah guru virtual menghasilkan jawaban dan gesture.
              </p>
            </div>
          ) : (
            <>
              <audio ref={audioRef} src={audioUrl} controls style={{ width: "100%", marginBottom: 8, height: 30 }} />
              <div style={timelineWrapper}>
                {mapping.map((row, index) => {
                  const width = duration ? `${(Number(row.duration) / duration) * 100}%` : `${100 / mapping.length}%`;
                  return (
                    <button
                      key={index}
                      onClick={() => playSegment(row)}
                      title={`${row.sentence_text} | ${row.start_time}s-${row.end_time}s | ${row.gesture_label}`}
                      style={{
                        width,
                        minWidth: 44,
                        background: colors[index % colors.length],
                        color: "#fff",
                        border: "none",
                        fontSize: 10,
                        fontWeight: 700,
                        cursor: "pointer",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {row.gesture_label}
                    </button>
                  );
                })}
              </div>
              <div style={timeRow}><span>0s</span><span>{duration.toFixed(2)}s</span></div>

              <div style={actionRow}>
                <button style={actionButton} onClick={() => downloadGestureMappingCsv(mapping, {
                  session_id: source?.session_id || source?.annotation_id || "",
                  audio_file: "generated.wav",
                  audio_duration: duration,
                }, "sentence_gesture_mapping.csv")}>CSV</button>
                <button style={outlineButton} onClick={saveToBackend}>Simpan</button>
                <button style={outlineButton} onClick={() => window.open(`${apiBaseUrl}/sentence-gesture-mapping/export-csv`, "_blank")}>Export</button>
              </div>

              {saveMessage && <p style={statusText}>{saveMessage}</p>}

              <div style={tableWrap}>
                <table style={tableStyle}>
                  <thead>
                    <tr style={{ background: "#f1f5f9" }}>
                      <th style={th}>No</th>
                      <th style={th}>Kalimat</th>
                      <th style={th}>Gesture</th>
                      <th style={th}>Waktu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mapping.map((row, index) => (
                      <tr key={index} onClick={() => playSegment(row)} style={{ cursor: "pointer" }}>
                        <td style={td}>{index + 1}</td>
                        <td style={td}>{row.sentence_text}</td>
                        <td style={td}>{row.gesture_label}</td>
                        <td style={td}>{row.start_time}-{row.end_time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

const panelStyle = {
  position: "fixed",
  left: 14,
  bottom: 92,
  width: 380,
  maxWidth: "calc(100vw - 28px)",
  maxHeight: "44vh",
  overflow: "auto",
  zIndex: 30,
  background: "rgba(255,255,255,0.90)",
  borderRadius: 14,
  boxShadow: "0 8px 22px rgba(15,23,42,0.20)",
  padding: 10,
  fontFamily: "Arial, sans-serif",
  backdropFilter: "blur(8px)",
};
const headerStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 };
const headerButtons = { display: "flex", gap: 4, alignItems: "center" };
const titleStyle = { fontSize: 14, lineHeight: 1.2 };
const smallButton = { border: "none", borderRadius: 8, padding: "5px 8px", background: "#059669", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 12 };
const closeButton = { border: "none", borderRadius: 8, padding: "5px 9px", background: "#e5e7eb", color: "#111827", cursor: "pointer", fontWeight: "bold", fontSize: 13 };
const floatingButton = { position: "fixed", left: 14, bottom: 92, zIndex: 30, width: 44, height: 44, borderRadius: "50%", border: "none", background: "#7c3aed", color: "#fff", fontSize: 19, cursor: "pointer", boxShadow: "0 6px 16px rgba(15,23,42,0.22)" };
const miniText = { margin: 0, fontSize: 12, color: "#334155" };
const emptyBox = { background: "#f8fafc", borderRadius: 10, padding: 10, border: "1px solid #e2e8f0" };
const timelineWrapper = { display: "flex", height: 34, borderRadius: 9, overflow: "hidden", border: "1px solid #e2e8f0", marginBottom: 4 };
const timeRow = { display: "flex", justifyContent: "space-between", fontSize: 10, color: "#64748b" };
const actionRow = { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 };
const actionButton = { padding: "6px 8px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 11 };
const outlineButton = { padding: "6px 8px", borderRadius: 8, border: "1px solid #2563eb", background: "#fff", color: "#2563eb", cursor: "pointer", fontWeight: 700, fontSize: 11 };
const statusText = { fontSize: 11, margin: "6px 0 0", color: "#334155" };
const tableWrap = { maxHeight: 150, overflowY: "auto", marginTop: 8 };
const tableStyle = { width: "100%", borderCollapse: "collapse", fontSize: 11 };
const th = { border: "1px solid #e2e8f0", padding: 5, textAlign: "left" };
const td = { border: "1px solid #e2e8f0", padding: 5, verticalAlign: "top" };
