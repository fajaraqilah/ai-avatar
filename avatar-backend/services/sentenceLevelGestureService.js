// Sentence-level gesture classification service
// Tujuan: satu jawaban guru panjang dipecah menjadi beberapa segmen/kalimat,
// lalu setiap segmen diklasifikasikan ke gesture pedagogik yang paling sesuai.

const CANONICAL_LABELS = new Set([
  "STANDING_GREETING",
  "TALKING_EXPLAINING",
  "TALKING_OPEN_HAND",
  "TALKING_ARGUMEN",
  "TALKING_COMPARING",
  "TALKING_PRESENTING",
  "POINTING",
  "LOOKING",
  "COUNTING",
  "HAND_RAISING",
  "HEAD_NOD_YES",
  "SHAKING_HEAD_NO",
  "CLAPPING",
  "THANKFUL",
  "THINKING",
  "BASHFUL",
  "PATTING"
]);

const LABEL_META = {
  STANDING_GREETING: { animation_file: "StandingGreeting.glb", pedagogic_analysis: "Membuka atau menyapa siswa" },
  TALKING_EXPLAINING: { animation_file: "Talking_Explaining.glb", pedagogic_analysis: "Menjelaskan konsep utama" },
  TALKING_OPEN_HAND: { animation_file: "Talking_OpenHand.glb", pedagogic_analysis: "Memberi penjelasan terbuka" },
  TALKING_ARGUMEN: { animation_file: "Talking_Argumen.glb", pedagogic_analysis: "Memberi alasan atau argumen" },
  TALKING_COMPARING: { animation_file: "Talking_Comparing.glb", pedagogic_analysis: "Membandingkan dua konsep" },
  TALKING_PRESENTING: { animation_file: "Talking_Presenting.glb", pedagogic_analysis: "Menyajikan inti materi" },
  POINTING: { animation_file: "Pointing.glb", pedagogic_analysis: "Menunjuk objek, papan, gambar, diagram, atau bagian tertentu" },
  LOOKING: { animation_file: "Looking.glb", pedagogic_analysis: "Mengarahkan perhatian visual" },
  COUNTING: { animation_file: "Counting.glb", pedagogic_analysis: "Menjelaskan urutan, langkah, atau enumerasi" },
  HAND_RAISING: { animation_file: "HandRaising.glb", pedagogic_analysis: "Memberi kesempatan bertanya atau merespons" },
  HEAD_NOD_YES: { animation_file: "HeadNodding.glb", pedagogic_analysis: "Menyetujui atau mengonfirmasi jawaban benar" },
  SHAKING_HEAD_NO: { animation_file: "HeadNo.glb", pedagogic_analysis: "Menolak, mengoreksi, atau menyatakan belum tepat" },
  CLAPPING: { animation_file: "Clapping.glb", pedagogic_analysis: "Memberi apresiasi" },
  THANKFUL: { animation_file: "Thankful.glb", pedagogic_analysis: "Mengucapkan terima kasih" },
  THINKING: { animation_file: "Thinking.glb", pedagogic_analysis: "Mengajak berpikir atau refleksi" },
  BASHFUL: { animation_file: "Bashful.glb", pedagogic_analysis: "Respons malu/sungkan secara sosial" },
  PATTING: { animation_file: "Patting.glb", pedagogic_analysis: "Memberi dukungan atau penguatan" }
};

const TALKING_VARIANTS = [
  "TALKING_OPEN_HAND",
  "TALKING_EXPLAINING",
  "TALKING_PRESENTING",
  "TALKING_ARGUMEN"
];

function cleanSegment(text = "") {
  return String(text || "")
    .replace(/\[GESTURES?:[^\]]+\]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function splitTeacherResponseIntoSegments(text = "", maxSegments = 6) {
  const source = cleanSegment(text);
  if (!source) return [];

  // 1. Pecah berdasarkan tanda baca utama.
  let segments = source
    .split(/(?<=[.!?])\s+|\n+|;\s+/u)
    .map(cleanSegment)
    .filter((s) => s.length >= 3);

  // 2. Jika hanya satu kalimat panjang, pecah berdasarkan penanda pedagogik.
  if (segments.length <= 1 && source.length > 90) {
    const withBreaks = source.replace(
      /\b(Pertama|Kedua|Ketiga|Keempat|Kelima|Selanjutnya|Kemudian|Setelah itu|Berikutnya|Terakhir|Kesimpulannya|Selain itu|Sebaliknya|Perhatikan|Bandingkan|Coba|Mari kita|Sekarang)\b/gi,
      "|||$1"
    );
    segments = withBreaks
      .split("|||")
      .map(cleanSegment)
      .filter((s) => s.length >= 3);
  }

  // 3. Jika tetap satu segmen tetapi terlalu panjang, potong per koma yang aman.
  if (segments.length <= 1 && source.length > 120) {
    segments = source
      .split(/,\s+(?=(maka|lalu|kemudian|selanjutnya|karena|sehingga|tetapi|namun|dan)\b)/gi)
      .map(cleanSegment)
      .filter((s) => s.length >= 3);
  }

  // 4. Hindari segmen terlalu pendek berdiri sendiri kecuali segmen pedagogik penting.
  const merged = [];
  for (const seg of segments) {
    if (seg.length < 12 && merged.length > 0 && !hardRuleGesture(seg)) {
      merged[merged.length - 1] = `${merged[merged.length - 1]} ${seg}`.trim();
    } else {
      merged.push(seg);
    }
  }

  return merged.slice(0, maxSegments);
}

function includesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

export function hardRuleGesture(segment = "") {
  const t = String(segment || "").toLowerCase();

  if (includesAny(t, [/\b(assalamualaikum|selamat\s+pagi|selamat\s+siang|selamat\s+sore|halo|hai)\b/])) return "STANDING_GREETING";
  if (includesAny(t, [/terima\s+kasih|makasih|apresiasi|saya\s+hargai/])) return "THANKFUL";
  if (includesAny(t, [/tepuk\s+tangan|beri\s+apresiasi|bagus\s+sekali|hebat/])) return "CLAPPING";
  if (includesAny(t, [/angkat\s+tangan|mengangkat\s+tangan|silakan\s+bertanya|ada\s+pertanyaan|ajukan\s+pertanyaan/])) return "HAND_RAISING";

  // Koreksi negatif harus dicek sebelum afirmasi positif.
  if (includesAny(t, [/\b(tidak|bukan|belum)\b.*\b(tepat|benar|sesuai)\b|\bsalah\b|kurang\s+tepat|belum\s+tepat|jangan\s+demikian/])) return "SHAKING_HEAD_NO";
  if (includesAny(t, [/\b(ya|benar|betul|tepat|setuju)\b|jawabanmu\s+sudah\s+benar|sudah\s+tepat/])) return "HEAD_NOD_YES";

  if (includesAny(t, [/bandingkan|membandingkan|perbandingan|persamaan|perbedaan|kelebihan|kekurangan|lebih\s+(baik|efektif|tepat)/])) return "TALKING_COMPARING";
  // POINTING diprioritaskan sebelum COUNTING karena kalimat seperti
  // "Pertama, perhatikan gambar ini" secara visual lebih tepat sebagai menunjuk.
  if (includesAny(t, [/perhatikan|lihat\s+bagian|tunjuk|menunjuk|gambar|diagram|grafik|papan|bagian\s+ini|objek\s+ini/])) return "POINTING";
  if (includesAny(t, [/\b(hitung|menghitung|urutan|langkah|tahap|pertama|kedua|ketiga|keempat|kelima|satu\s+per\s+satu|daftar|enumerasi)\b/])) return "COUNTING";
  if (includesAny(t, [/amati|lihatlah|pandangan|fokus\s+ke|cermati/])) return "LOOKING";
  if (includesAny(t, [/pikirkan|coba\s+pikir|renungkan|menurut\s+kalian|analisislah|menganalisis/])) return "THINKING";
  if (includesAny(t, [/malu|sungkan|maaf\s+kalau|agak\s+ragu/])) return "BASHFUL";
  if (includesAny(t, [/dukungan|semangat|tenang|tidak\s+apa-apa|kamu\s+bisa/])) return "PATTING";

  if (includesAny(t, [/karena|sebab|alasannya|argumen|buktinya|dengan\s+demikian/])) return "TALKING_ARGUMEN";
  if (includesAny(t, [/kesimpulannya|inti\s+materi|secara\s+ringkas|jadi,/])) return "TALKING_PRESENTING";
  if (includesAny(t, [/baik,|mari\s+kita|sekarang\s+kita|saya\s+siap\s+membantu|ayo\s+kita/])) return "TALKING_OPEN_HAND";
  if (includesAny(t, [/adalah|merupakan|yaitu|artinya|konsep|definisi|contohnya|misalnya|penjelasan/])) return "TALKING_EXPLAINING";

  return null;
}

export function normalizeGestureLabel(label = "") {
  const upper = String(label || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (CANONICAL_LABELS.has(upper)) return upper;
  if (upper.includes("HEAD") && upper.includes("NO")) return "SHAKING_HEAD_NO";
  if (upper.includes("SHAKE") || upper.includes("NO")) return "SHAKING_HEAD_NO";
  if (upper.includes("NOD") || upper.includes("YES")) return "HEAD_NOD_YES";
  if (upper.includes("POINT")) return "POINTING";
  if (upper.includes("COUNT")) return "COUNTING";
  if (upper.includes("HAND") && upper.includes("RAIS")) return "HAND_RAISING";
  if (upper.includes("COMPARE")) return "TALKING_COMPARING";
  if (upper.includes("ARGUM")) return "TALKING_ARGUMEN";
  if (upper.includes("EXPLAIN")) return "TALKING_EXPLAINING";
  if (upper.includes("OPEN")) return "TALKING_OPEN_HAND";
  if (upper.includes("PRESENT")) return "TALKING_PRESENTING";
  if (upper.includes("THANK")) return "THANKFUL";
  if (upper.includes("THINK")) return "THINKING";
  if (upper.includes("CLAP")) return "CLAPPING";
  if (upper.includes("LOOK")) return "LOOKING";
  if (upper.includes("GREETING") || upper.includes("SALAM")) return "STANDING_GREETING";
  return "TALKING_EXPLAINING";
}

function metaFor(label) {
  const canonical = normalizeGestureLabel(label);
  const meta = LABEL_META[canonical] || LABEL_META.TALKING_EXPLAINING;
  return {
    gesture_label: canonical,
    canonical_label: canonical,
    animation_clip: canonical,
    frontend_animation_clip: canonical,
    animation_file: meta.animation_file,
    frontend_animation_path: `/animations/gesture_pedagogik/${meta.animation_file}`,
    pedagogic_analysis: meta.pedagogic_analysis,
    gesture_function: meta.pedagogic_analysis,
    pedagogical_context: "sentence-level pedagogic gesture",
    pedagogic_category: "Sentence-level gesture classification",
    data_type: "Kalimat guru / sentence-level"
  };
}

function hasStrongCue(label, segment = "") {
  const t = String(segment || "").toLowerCase();
  const canonical = normalizeGestureLabel(label);
  const cueMap = {
    COUNTING: [/hitung|urutan|langkah|pertama|kedua|ketiga|satu\s+per\s+satu|daftar|tahap/],
    POINTING: [/perhatikan|gambar|diagram|grafik|papan|bagian\s+ini|tunjuk/],
    TALKING_COMPARING: [/banding|perbandingan|persamaan|perbedaan|kelebihan|kekurangan/],
    HAND_RAISING: [/angkat\s+tangan|pertanyaan|bertanya/],
    HEAD_NOD_YES: [/\b(ya|benar|betul|tepat|setuju)\b/],
    SHAKING_HEAD_NO: [/tidak|bukan|belum\s+tepat|salah|kurang\s+tepat/],
    THANKFUL: [/terima\s+kasih|makasih/],
    CLAPPING: [/tepuk\s+tangan|apresiasi|hebat/],
    THINKING: [/pikir|renungkan|analisis/]
  };
  const patterns = cueMap[canonical] || [];
  return patterns.some((p) => p.test(t));
}

function deMonotonizeResults(results = []) {
  if (!Array.isArray(results) || results.length <= 1) return results;

  let talkingCursor = 0;
  const adjusted = results.map((item, index) => {
    const current = normalizeGestureLabel(item.gesture_label);
    const previous = index > 0 ? normalizeGestureLabel(results[index - 1].gesture_label) : "";

    if (index > 0 && current === previous) {
      // Jika dua segmen berturut-turut menghasilkan gesture sama,
      // sisipkan variasi talking agar avatar tidak terlihat mengulang gerakan identik.
      const replacement = TALKING_VARIANTS[talkingCursor % TALKING_VARIANTS.length];
      talkingCursor += 1;
      const meta = metaFor(replacement);
      return {
        ...item,
        ...meta,
        original_gesture_label: current,
        decision_source: `${item.decision_source || "ml"}+variation`,
        variation_reason: `Consecutive duplicate gesture ${current} reduced for visual naturalness`
      };
    }

    return { ...item, gesture_label: current, canonical_label: current };
  });

  // Jika seluruh sequence masih satu jenis, paksa variasi ringan di awal/akhir.
  const unique = new Set(adjusted.map((r) => normalizeGestureLabel(r.gesture_label)));
  if (unique.size === 1 && adjusted.length > 1) {
    const firstMeta = metaFor("TALKING_OPEN_HAND");
    adjusted[0] = {
      ...adjusted[0],
      ...firstMeta,
      original_gesture_label: adjusted[0].gesture_label,
      decision_source: `${adjusted[0].decision_source || "ml"}+opening-variation`,
      variation_reason: "Opening segment varied to avoid one-gesture-only response"
    };
  }

  return adjusted;
}

export async function buildSentenceLevelGestureClassification({
  text = "",
  classifyGestureML,
  fallbackGestureML,
  maxSegments = 6
}) {
  const segments = splitTeacherResponseIntoSegments(text, maxSegments);
  const safeSegments = segments.length > 0 ? segments : [cleanSegment(text) || "Baik, mari kita lanjutkan."];

  const rawResults = [];

  for (let index = 0; index < safeSegments.length; index += 1) {
    const segment = safeSegments[index];
    const ruleLabel = hardRuleGesture(segment);

    if (ruleLabel) {
      rawResults.push({
        index,
        text: segment,
        input_text: segment,
        confidence: 1,
        decision_source: "sentence_rule",
        rule_hits: 1,
        ...metaFor(ruleLabel)
      });
      continue;
    }

    try {
      const ml = await classifyGestureML(segment);
      const label = normalizeGestureLabel(ml?.gesture_label || ml?.frontend_animation_clip || ml?.animation_clip || "TALKING_EXPLAINING");
      rawResults.push({
        ...ml,
        index,
        text: segment,
        input_text: segment,
        decision_source: ml?.decision_source || "sentence_ml",
        ...metaFor(label)
      });
    } catch (error) {
      const fb = fallbackGestureML ? fallbackGestureML(segment) : {};
      rawResults.push({
        ...fb,
        index,
        text: segment,
        input_text: segment,
        confidence: 0,
        decision_source: "sentence_fallback",
        classifier_error: error.message,
        ...metaFor("TALKING_EXPLAINING")
      });
    }
  }

  const results = deMonotonizeResults(rawResults);
  const gestureLabels = results.map((r) => normalizeGestureLabel(r.gesture_label));

  return {
    segments: safeSegments,
    results,
    gestureLabels,
    primaryGesture: gestureLabels[0] || "TALKING_EXPLAINING",
    uniqueGestureCount: new Set(gestureLabels).size,
    mode: "sentence-level"
  };
}

export function expandGestureSequenceForDuration(gestureLabels = [], audioDuration = 0, sentenceResults = []) {
  const base = (Array.isArray(gestureLabels) && gestureLabels.length ? gestureLabels : ["TALKING_EXPLAINING"])
    .map(normalizeGestureLabel);

  const idealCount = Math.min(8, Math.max(base.length, Math.ceil((Number(audioDuration) || 3) / 3)));
  const expanded = [...base];
  let cursor = 0;

  while (expanded.length < idealCount) {
    const previous = expanded[expanded.length - 1];
    const nextVariant = TALKING_VARIANTS[cursor % TALKING_VARIANTS.length];
    cursor += 1;

    if (previous !== nextVariant) {
      expanded.push(nextVariant);
    } else {
      expanded.push(TALKING_VARIANTS[cursor % TALKING_VARIANTS.length]);
      cursor += 1;
    }
  }

  return expanded.slice(0, idealCount);
}
