import { useMemo, useRef, useState } from "react";
import { downloadGestureMappingCsv } from "../utils/csvExportUtils";
import { buildGestureTimeline } from "../utils/gestureTimelineUtils";

const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

const palette = [
  "#2563eb",
  "#059669",
  "#f59e0b",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#65a30d",
];

export function GestureMappingTimeline({ message, onClear }) {
  const [open, setOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const audioRef = useRef(null);

  const timeline = useMemo(() => {
    if (!message) return [];
    if (Array.isArray(message.gestureTimeline) && message.gestureTimeline.length) {
      return message.gestureTimeline;
    }

    return buildGestureTimeline({
      lipsync: message.lipsync,
      gestureSequence: message.gestureLabels || ["normal"],
      audioDuration: message.audioDuration || message.lipsync?.metadata?.duration || 0,
      audioFile: "generated.wav",
      sessionId: message.annotation_id || "",
    });
  }, [message]);

  const meta = useMemo(() => ({
    session_id: message?.annotation_id || "",
    audio_file: "generated.wav",
    audio_duration: message?.audioDuration || message?.lipsync?.metadata?.duration || "",
  }), [message]);

  const audioUrl = message?.audio ? `data:audio/mp3;base64,${message.audio}` : "";
  const duration = Number(meta.audio_duration) || Math.max(...timeline.map((item) => Number(item.end_time || 0)), 0);

  const labelCounts = useMemo(() => {
    const counts = {};
    timeline.forEach((item) => {
      counts[item.gesture_label] = (counts[item.gesture_label] || 0) + 1;
    });
    return counts;
  }, [timeline]);

  if (!message || !timeline.length) return null;

  const playSegment = (segment) => {
    if (audioRef.current && segment.start_time !== undefined) {
      audioRef.current.currentTime = Number(segment.start_time);
      audioRef.current.play();
    }
  };

  const saveBackendCsv = async () => {
    try {
      setSaveMessage("Menyimpan mapping ke CSV...");
      const response = await fetch(`${backendUrl}/api/gesture-mapping/save-csv`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "append", meta, segments: timeline }),
      });
      const result = await response.json();
      if (result.success) {
        setSaveMessage(`Berhasil menyimpan ${result.count} segmen ke CSV backend.`);
      } else {
        setSaveMessage(`Gagal: ${result.message || "Tidak diketahui"}`);
      }
    } catch (error) {
      console.error(error);
      setSaveMessage("Gagal terhubung ke backend CSV. Gunakan Download CSV Lokal.");
    }
  };

  return (
    <div className="pointer-events-auto fixed left-4 bottom-4 z-30 w-[520px] max-h-[76vh] overflow-y-auto rounded-2xl bg-white/95 shadow-2xl border border-gray-200 p-4 text-sm">
      <div className="flex gap-2 mb-3">
        <button
          className="flex-1 rounded-xl bg-emerald-600 text-white font-semibold py-2"
          onClick={() => setOpen(!open)}
        >
          {open ? "Minimalkan Grafik Mapping" : "Buka Grafik Mapping Gesture"}
        </button>
        {onClear && (
          <button
            className="rounded-xl bg-gray-200 text-gray-800 font-semibold px-3"
            onClick={onClear}
            title="Tutup grafik mapping"
          >
            ×
          </button>
        )}
      </div>

      {!open && (
        <div className="text-xs text-gray-700">
          <b>Mapping:</b> {timeline.length} segmen · <b>Durasi:</b> {Number(duration || 0).toFixed(2)} detik
        </div>
      )}

      {open && (
        <>
          <h2 className="font-black text-lg text-gray-800 mb-2">Grafik Mapping Gesture Guru Virtual</h2>
          <p className="text-xs text-gray-600 mb-3">
            Timeline ini memetakan gesture avatar terhadap durasi audio, lip-sync Rhubarb, dan fungsi pedagogik.
          </p>

          {audioUrl && (
            <audio ref={audioRef} src={audioUrl} controls className="w-full mb-3" />
          )}

          <div className="h-12 w-full border border-gray-200 rounded-xl overflow-hidden flex mb-2">
            {timeline.map((segment, index) => {
              const width = duration ? `${(Number(segment.duration) / duration) * 100}%` : `${100 / timeline.length}%`;
              return (
                <button
                  key={index}
                  onClick={() => playSegment(segment)}
                  title={`${segment.gesture_label}: ${segment.start_time}s - ${segment.end_time}s`}
                  style={{
                    width,
                    background: palette[index % palette.length],
                  }}
                  className="border-0 text-white text-[10px] font-bold overflow-hidden"
                >
                  {segment.gesture_label}
                </button>
              );
            })}
          </div>

          <div className="flex justify-between text-[11px] text-gray-500 mb-3">
            <span>0 detik</span>
            <span>{Number(duration || 0).toFixed(2)} detik</span>
          </div>

          <div className="flex gap-2 flex-wrap mb-3">
            <button
              className="rounded-lg bg-blue-600 text-white px-3 py-2 text-xs font-semibold"
              onClick={() => downloadGestureMappingCsv(timeline, meta)}
            >
              Download CSV Lokal
            </button>
            <button
              className="rounded-lg border border-blue-600 text-blue-700 px-3 py-2 text-xs font-semibold"
              onClick={saveBackendCsv}
            >
              Simpan CSV Backend
            </button>
            <button
              className="rounded-lg border border-emerald-600 text-emerald-700 px-3 py-2 text-xs font-semibold"
              onClick={() => window.open(`${backendUrl}/api/gesture-mapping/export-csv`, "_blank")}
            >
              Export CSV Backend
            </button>
          </div>

          {saveMessage && <p className="text-xs text-gray-700 mb-3">{saveMessage}</p>}

          <div className="overflow-x-auto mb-4">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-gray-100">
                  <th className={th}>No</th>
                  <th className={th}>Start</th>
                  <th className={th}>End</th>
                  <th className={th}>Gesture</th>
                  <th className={th}>Fungsi</th>
                  <th className={th}>Cue</th>
                </tr>
              </thead>
              <tbody>
                {timeline.map((item, index) => (
                  <tr key={index} onClick={() => playSegment(item)} className="cursor-pointer hover:bg-blue-50">
                    <td className={td}>{index + 1}</td>
                    <td className={td}>{item.start_time}</td>
                    <td className={td}>{item.end_time}</td>
                    <td className={td}>{item.gesture_label}</td>
                    <td className={td}>{item.gesture_function}</td>
                    <td className={td}>{item.mouth_cue_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="font-bold text-gray-800 mb-2">Distribusi Label Gesture</h3>
          <div className="grid gap-2">
            {Object.entries(labelCounts).map(([label, count], index) => (
              <div key={label} className="flex items-center gap-2 text-xs">
                <div className="w-24 truncate">{label}</div>
                <div className="flex-1 h-4 bg-gray-200 rounded-lg overflow-hidden">
                  <div
                    className="h-full"
                    style={{
                      width: `${(count / timeline.length) * 100}%`,
                      background: palette[index % palette.length],
                    }}
                  />
                </div>
                <div>{count}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const th = "p-2 border border-gray-200 text-left";
const td = "p-2 border border-gray-200";
