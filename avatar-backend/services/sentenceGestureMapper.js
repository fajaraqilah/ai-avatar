// Utility mapping gesture per kalimat dengan label canonical GLB terbaru.
// Patch ini mengganti alias lama seperti Greeting/closing menjadi
// STANDING_GREETING/THANKFUL agar panel mapping konsisten dengan backend terbaru.

export const CANONICAL_GESTURE_LABELS = [
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
  "THANKFUL"
];

export const CANONICAL_GESTURE_SET = new Set(CANONICAL_GESTURE_LABELS);

export const GESTURE_ALIAS = {
  Greeting: "STANDING_GREETING",
  GREETING: "STANDING_GREETING",
  greeting: "STANDING_GREETING",
  Waving: "STANDING_GREETING",
  WAVING: "STANDING_GREETING",
  salam_pembuka: "STANDING_GREETING",
  SALAM_PEMBUKA: "STANDING_GREETING",
  StandingGreeting: "STANDING_GREETING",
  Standing_Greeting: "STANDING_GREETING",
  STANDINGGREETING: "STANDING_GREETING",

  closing: "THANKFUL",
  Closing: "THANKFUL",
  CLOSING: "THANKFUL",
  penutup: "THANKFUL",
  THANK_YOU: "THANKFUL",
  Thanks: "THANKFUL",
  THANKS: "THANKFUL",
  Thankful: "THANKFUL",

  appreciation: "THANKFUL",
  Appreciation: "THANKFUL",
  correction: "SHAKING_HEAD_NO",
  Correction: "SHAKING_HEAD_NO",
  instruction: "TALKING_OPEN_HAND",
  Instruction: "TALKING_OPEN_HAND",
  normal: "TALKING_EXPLAINING",
  Normal: "TALKING_EXPLAINING",
  Idle: "TALKING_EXPLAINING",
  IDLE: "TALKING_EXPLAINING",
  terbuka: "TALKING_OPEN_HAND",
  Terbuka: "TALKING_OPEN_HAND",
  menjelaskan_normal: "TALKING_EXPLAINING",
  Menjelaskan_Normal: "TALKING_EXPLAINING",

  Talking_0: "TALKING_EXPLAINING",
  Talking_1: "TALKING_OPEN_HAND",
  Talking_2: "TALKING_EXPLAINING",
  Talking_3: "TALKING_EXPLAINING",
  Talking_4: "TALKING_PRESENTING",
  Talking_5: "TALKING_OPEN_HAND",
  Talking_6: "TALKING_PRESENTING",
  Talking_7: "TALKING_EXPLAINING",

  Talking_Argumen: "TALKING_ARGUMEN",
  Talking_Comparing: "TALKING_COMPARING",
  Talking_Explaining: "TALKING_EXPLAINING",
  Talking_OpenHand: "TALKING_OPEN_HAND",
  Talking_Presenting: "TALKING_PRESENTING",
  HandRaising: "HAND_RAISING",
  HeadNo: "SHAKING_HEAD_NO",
  HeadNodding: "HEAD_NOD_YES"
};

export const GESTURE_FUNCTION = {
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

export const PEDAGOGICAL_CONTEXT = {
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

export const GESTURE_ANIMATION_FILE = {
  THINKING: "Thinking.glb",
  BASHFUL: "Bashful.glb",
  CLAPPING: "Clapping.glb",
  COUNTING: "Counting.glb",
  HAND_RAISING: "HandRaising.glb",
  SHAKING_HEAD_NO: "HeadNo.glb",
  HEAD_NOD_YES: "HeadNodding.glb",
  LOOKING: "Looking.glb",
  PATTING: "Patting.glb",
  POINTING: "Pointing.glb",
  STANDING_GREETING: "StandingGreeting.glb",
  TALKING_ARGUMEN: "Talking_Argumen.glb",
  TALKING_COMPARING: "Talking_Comparing.glb",
  TALKING_EXPLAINING: "Talking_Explaining.glb",
  TALKING_OPEN_HAND: "Talking_OpenHand.glb",
  TALKING_PRESENTING: "Talking_Presenting.glb",
  THANKFUL: "Thankful.glb"
};

export function normalizeGestureLabel(label = "") {
  const raw = String(label || "").trim();
  if (!raw) return "TALKING_EXPLAINING";
  if (GESTURE_ALIAS[raw]) return GESTURE_ALIAS[raw];

  const upper = raw.toUpperCase().replace(/[\s-]+/g, "_");
  if (CANONICAL_GESTURE_SET.has(upper)) return upper;
  if (GESTURE_ALIAS[upper]) return GESTURE_ALIAS[upper];

  if (upper.includes("STANDING") || upper.includes("GREETING") || upper.includes("SALAM")) return "STANDING_GREETING";
  if (upper.includes("CLOSING") || upper.includes("THANK") || upper.includes("TERIMA")) return "THANKFUL";
  if (upper.includes("HEAD") && upper.includes("NO")) return "SHAKING_HEAD_NO";
  if (upper.includes("SHAKE") || upper.includes("NO")) return "SHAKING_HEAD_NO";
  if (upper.includes("NOD") || upper.includes("YES")) return "HEAD_NOD_YES";
  if (upper.includes("POINT")) return "POINTING";
  if (upper.includes("COUNT")) return "COUNTING";
  if (upper.includes("HAND") && upper.includes("RAIS")) return "HAND_RAISING";
  if (upper.includes("COMPARE") || upper.includes("COMPARING")) return "TALKING_COMPARING";
  if (upper.includes("ARGUM")) return "TALKING_ARGUMEN";
  if (upper.includes("EXPLAIN")) return "TALKING_EXPLAINING";
  if (upper.includes("OPEN")) return "TALKING_OPEN_HAND";
  if (upper.includes("PRESENT")) return "TALKING_PRESENTING";
  if (upper.includes("THINK")) return "THINKING";
  if (upper.includes("CLAP")) return "CLAPPING";
  if (upper.includes("LOOK")) return "LOOKING";
  if (upper.includes("PATT")) return "PATTING";
  if (upper.includes("BASH")) return "BASHFUL";

  return "TALKING_EXPLAINING";
}

export function enrichGestureRow(row = {}) {
  const canonical = normalizeGestureLabel(
    row.gesture_label || row.animation_clip || row.frontend_animation_clip || row.canonical_label
  );
  return {
    ...row,
    original_gesture_label: row.original_gesture_label || row.gesture_label || "",
    gesture_label: canonical,
    canonical_label: canonical,
    animation_clip: canonical,
    frontend_animation_clip: canonical,
    animation_file: GESTURE_ANIMATION_FILE[canonical],
    frontend_animation_path: `/animations/gesture_pedagogik/${GESTURE_ANIMATION_FILE[canonical]}`,
    gesture_function: GESTURE_FUNCTION[canonical] || row.gesture_function || "Gesture avatar",
    pedagogical_context: PEDAGOGICAL_CONTEXT[canonical] || row.pedagogical_context || "Konteks pembelajaran"
  };
}

export function normalizeSentenceGestureRows(rows = []) {
  return Array.isArray(rows) ? rows.map(enrichGestureRow) : [];
}

export function splitSentences(text = "") {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  const matches = cleaned.match(/[^.!?]+[.!?]?/g) || [cleaned];
  return matches.map((s) => s.trim()).filter(Boolean);
}

function includesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

export function classifyGestureBySentence(sentence = "", fallbackGesture = "TALKING_EXPLAINING") {
  const lower = String(sentence || "").toLowerCase();

  // Label lama Greeting/closing tidak dipakai lagi. Semua rule harus mengembalikan label canonical baru.
  if (includesAny(lower, [/\b(assalamualaikum|selamat\s+pagi|selamat\s+siang|selamat\s+sore|selamat\s+malam|halo|hai|salam\s+pembuka)\b/])) return "STANDING_GREETING";
  if (includesAny(lower, [/terima\s+kasih|makasih|apresiasi|saya\s+hargai|penghargaan|penutup|akhiri\s+pembelajaran/])) return "THANKFUL";
  if (includesAny(lower, [/tepuk\s+tangan|beri\s+apresiasi|bagus\s+sekali|hebat|luar\s+biasa/])) return "CLAPPING";
  if (includesAny(lower, [/angkat\s+tangan|mengangkat\s+tangan|silakan\s+bertanya|ada\s+pertanyaan|ajukan\s+pertanyaan/])) return "HAND_RAISING";

  if (includesAny(lower, [/\b(tidak|bukan|belum)\b.*\b(tepat|benar|sesuai)\b|\bsalah\b|kurang\s+tepat|belum\s+tepat|perlu\s+diperbaiki/])) return "SHAKING_HEAD_NO";
  if (includesAny(lower, [/\b(ya|benar|betul|tepat|setuju)\b|jawaban.*sudah\s+benar|sudah\s+tepat/])) return "HEAD_NOD_YES";

  if (includesAny(lower, [/bandingkan|membandingkan|perbandingan|persamaan|perbedaan|kelebihan|kekurangan|lebih\s+(baik|efektif|tepat)/])) return "TALKING_COMPARING";
  if (includesAny(lower, [/perhatikan|tunjuk|menunjuk|bagian\s+ini|objek\s+ini|panah|posisi|komponen\s+utama/])) return "POINTING";
  if (includesAny(lower, [/lihat|lihatlah|amati|mengamati|cermati|gambar|diagram|grafik|papan|layar|visual/])) return "LOOKING";
  if (includesAny(lower, [/\b(hitung|menghitung|urutan|langkah|tahap|pertama|kedua|ketiga|keempat|kelima|satu\s+per\s+satu|daftar|enumerasi)\b/])) return "COUNTING";
  if (includesAny(lower, [/pikirkan|coba\s+pikir|renungkan|menurut\s+kalian|analisislah|menganalisis|refleksikan/])) return "THINKING";
  if (includesAny(lower, [/malu|tersipu|rendah\s+hati|pujian|dipuji|sungkan/])) return "BASHFUL";
  if (includesAny(lower, [/dukungan|semangat|tenang|tidak\s+apa-apa|kamu\s+bisa|jangan\s+menyerah|motivasi/])) return "PATTING";

  if (includesAny(lower, [/karena|sebab|alasannya|argumen|buktinya|dengan\s+demikian/])) return "TALKING_ARGUMEN";
  if (includesAny(lower, [/kesimpulannya|inti\s+materi|secara\s+ringkas|jadi,|paparkan|presentasikan|sajikan/])) return "TALKING_PRESENTING";
  if (includesAny(lower, [/baik,|mari\s+kita|sekarang\s+kita|saya\s+siap\s+membantu|ayo\s+kita|pengantar|terbuka|ramah/])) return "TALKING_OPEN_HAND";
  if (includesAny(lower, [/adalah|merupakan|yaitu|artinya|konsep|definisi|contohnya|misalnya|penjelasan|jelaskan|uraikan/])) return "TALKING_EXPLAINING";

  return normalizeGestureLabel(fallbackGesture || "TALKING_EXPLAINING");
}

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

export function buildSentenceGestureMapping({
  text,
  gestureSequence = [],
  lipsync = null,
  audioDuration = 0,
  audioFile = "generated.wav",
  sessionId = "",
  mode = "weighted"
}) {
  const sentences = splitSentences(text);
  const duration = Number(audioDuration) || Number(lipsync?.metadata?.duration) || 0;
  if (!sentences.length || !duration) return [];

  const normalizedSequence = Array.isArray(gestureSequence)
    ? gestureSequence.map(normalizeGestureLabel)
    : [];

  const mouthCues = lipsync?.mouthCues || [];
  const totalWeight = mode === "equal"
    ? sentences.length
    : sentences.reduce((sum, sentence) => sum + Math.max(sentence.length, 1), 0);

  let cursor = 0;
  return sentences.map((sentence, index) => {
    const weight = mode === "equal" ? 1 : Math.max(sentence.length, 1);
    const segmentDuration = index === sentences.length - 1 ? duration - cursor : (duration * weight) / totalWeight;
    const start = Number(cursor.toFixed(3));
    const end = Number((index === sentences.length - 1 ? duration : cursor + segmentDuration).toFixed(3));
    cursor = end;

    const fallbackGesture = normalizedSequence[index] || normalizedSequence[index % Math.max(normalizedSequence.length, 1)] || "TALKING_EXPLAINING";
    const gesture = normalizeGestureLabel(classifyGestureBySentence(sentence, fallbackGesture));
    const selectedCues = cuesInRange(mouthCues, start, end);

    return enrichGestureRow({
      session_id: sessionId,
      sentence_index: index,
      sentence_text: sentence,
      audio_file: audioFile || lipsync?.metadata?.soundFile || "",
      audio_duration: duration,
      start_time: start,
      end_time: end,
      duration: Number((end - start).toFixed(3)),
      gesture_label: gesture,
      animation_clip: gesture,
      gesture_source: gesture === fallbackGesture ? "backend_sequence" : "sentence_rule_override",
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
    });
  });
}
