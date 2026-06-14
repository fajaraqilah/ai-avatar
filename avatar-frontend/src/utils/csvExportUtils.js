export function convertGestureMappingToCsv(segments = [], meta = {}) {
  const header = ["session_id","audio_file","audio_duration","sentence_index","sentence_text","start_time","end_time","duration","gesture_label","animation_clip","gesture_source","gesture_function","pedagogical_context","mouth_cue_count","dominant_mouth_cue","annotation_status","gold_gesture_label","suitability_score","naturalness_score","sync_score","engagement_support_score","annotator_name","notes"];
  const csvCell = (value) => { if (value === null || value === undefined) return ""; return `"${String(value).replace(/"/g, '""')}"`; };
  const rows = segments.map((seg, index) => {
    const start = Number(seg.start_time ?? seg.start ?? 0); const end = Number(seg.end_time ?? seg.end ?? 0);
    const row = { session_id: meta.session_id || seg.session_id || "", audio_file: meta.audio_file || seg.audio_file || "", audio_duration: meta.audio_duration || seg.audio_duration || "", sentence_index: seg.sentence_index ?? index, sentence_text: seg.sentence_text || "", start_time: start, end_time: end, duration: seg.duration ?? Math.max(0, end - start).toFixed(3), gesture_label: seg.gesture_label || seg.gesture || seg.label || "normal", animation_clip: seg.animation_clip || seg.animationClip || "", gesture_source: seg.gesture_source || "", gesture_function: seg.gesture_function || "", pedagogical_context: seg.pedagogical_context || "", mouth_cue_count: seg.mouth_cue_count ?? "", dominant_mouth_cue: seg.dominant_mouth_cue || "", annotation_status: seg.annotation_status || "mapped", gold_gesture_label: seg.gold_gesture_label || "", suitability_score: seg.suitability_score || "", naturalness_score: seg.naturalness_score || "", sync_score: seg.sync_score || "", engagement_support_score: seg.engagement_support_score || "", annotator_name: seg.annotator_name || "", notes: seg.notes || "" };
    return header.map((key) => csvCell(row[key])).join(",");
  });
  return [header.join(","), ...rows].join("\n");
}
export function downloadGestureMappingCsv(segments = [], meta = {}, filename = "sentence_gesture_mapping.csv") {
  const csv = convertGestureMappingToCsv(segments, meta); const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.setAttribute("download", filename); document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
}
