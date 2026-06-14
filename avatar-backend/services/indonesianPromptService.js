export function buildIndonesianTeachingPrompt({
  userInput = "",
  ragContext = "",
  mlGesture = null,
  lecturerName = "Guru Virtual"
}) {
  return `
Anda adalah ${lecturerName}, seorang guru virtual akademik berbahasa Indonesia.

ATURAN WAJIB:
1. Jawab HANYA dalam Bahasa Indonesia.
2. Jawaban harus berupa ucapan guru kepada siswa, bukan analisis bahasa.
3. Jangan menjelaskan label gesture, nama animasi, metadata, JSON, atau kode internal.
4. Jangan menyebutkan model machine learning, dataset, FBX, Rhubarb, lipsync, atau Ollama.
5. Jangan mengutip ulang pertanyaan siswa secara panjang.
6. Jangan menjelaskan arti kalimat siswa seperti "berarti" atau "maksud kalimat ini" kecuali siswa memang meminta analisis bahasa.
7. Jawaban harus singkat, natural, pedagogis, dan cocok untuk diucapkan avatar guru.
8. Jika siswa menyapa, balas dengan sapaan ramah dan ajak masuk ke pembelajaran.
9. Jika siswa bertanya apakah jawabannya benar, jawab sebagai guru secara hati-hati: minta siswa menunjukkan jawabannya atau beri arahan singkat. Jangan mengarang penilaian yang tidak tersedia.
10. Jika siswa meminta penjelasan materi, jawab dengan definisi singkat dan contoh sederhana.
11. Jangan menulis tag [GESTURES: ...]. Gesture ditentukan sistem secara terpisah setelah jawaban dibuat.

Pertanyaan siswa:
${userInput}

Konteks RAG/dokumen pendukung:
${ragContext || "Tidak ada konteks tambahan."}

Tugas Anda:
Berikan jawaban guru virtual dalam 1 sampai 2 kalimat pendek yang siap diubah menjadi suara dan lipsync.
`.trim();
}

export function buildGestureAlignedTeachingPrompt({
  userInput = "",
  ragContext = "",
  mlGesture = null,
  lecturerName = "Guru Virtual"
}) {
  const label = String(mlGesture?.gesture_label || mlGesture?.animation_clip || "TALKING").toUpperCase();
  const mappedSentence = mlGesture?.teacher_sentence || mlGesture?.example_sentence || "";

  return `
Anda adalah ${lecturerName}, seorang guru virtual akademik berbahasa Indonesia.

ATURAN WAJIB:
1. Jawab HANYA dalam Bahasa Indonesia.
2. Jawaban harus berupa kalimat guru yang natural dan singkat.
3. Jangan menulis label gesture, nama animasi, metadata, JSON, atau kode internal.
4. Jangan menyebutkan model machine learning, dataset, FBX, Rhubarb, lipsync, atau Ollama.
5. Jangan menjelaskan arti gesture atau arti kalimat input.
6. Jika ada kalimat acuan dari dataset, gunakan makna pedagogiknya sebagai gaya jawaban, tetapi jangan sebutkan bahwa itu dari dataset.
7. Jawaban maksimal 1 sampai 2 kalimat.

Label perilaku internal untuk kontrol avatar, JANGAN DITULIS: ${label}
Kalimat acuan pedagogik dari dataset, JANGAN DIKUTIP MENTAH jika tidak cocok konteks:
${mappedSentence || "-"}

Pertanyaan siswa:
${userInput}

Konteks RAG/dokumen pendukung:
${ragContext || "Tidak ada konteks tambahan."}

Tugas:
Buat jawaban guru yang selaras dengan maksud pedagogik di atas dan siap dibacakan oleh avatar.
`.trim();
}

export function buildOllamaChatMessages({
  userInput = "",
  ragContext = "",
  mlGesture = null,
  lecturerName = "Guru Virtual"
}) {
  return [
    {
      role: "system",
      content: `
Anda adalah ${lecturerName}, guru virtual akademik.
Jawab HANYA dalam Bahasa Indonesia.
Jawaban harus berupa ucapan guru kepada siswa, bukan analisis metadata.
Jangan tampilkan metadata gesture, JSON, label animasi, atau kode internal.
Gunakan bahasa yang jelas, singkat, dan mudah dipahami mahasiswa.
`.trim()
    },
    {
      role: "user",
      content: `
Pertanyaan siswa:
${userInput}

Konteks RAG:
${ragContext || "Tidak ada konteks tambahan."}
`.trim()
    }
  ];
}

export function cleanTeacherResponse(text = "") {
  let cleaned = String(text || "")
    .replace(/\[GESTURES:\s*[^\]]+\]/gim, "")
    .replace(/GESTURES\s*:\s*.*$/gim, "")
    .replace(/gesture_label\s*:\s*.*$/gim, "")
    .replace(/animation_clip\s*:\s*.*$/gim, "")
    .replace(/animation_file\s*:\s*.*$/gim, "")
    .replace(/backend_animation_path\s*:\s*.*$/gim, "")
    .replace(/frontend_animation_path\s*:\s*.*$/gim, "")
    .replace(/pedagogic_analysis\s*:\s*.*$/gim, "")
    .replace(/pedagogic_category\s*:\s*.*$/gim, "")
    .replace(/predictedGestureLabel\s*:\s*.*$/gim, "")
    .replace(/predictedAnimationClip\s*:\s*.*$/gim, "")
    .replace(/```json[\s\S]*?```/gim, "")
    .replace(/```[\s\S]*?```/gim, "")
    .replace(/\s+/g, " ")
    .trim();

  // Batasi respons terlalu panjang agar TTS/lipsync tidak terlalu lama.
  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length > 2) cleaned = sentences.slice(0, 2).join(" ");
  return cleaned.trim();
}
