import dotenv from "dotenv"; // Load environment variables from .env file
import express from "express"; // Web framework for Node.js
import cors from "cors"; // Middleware for enabling CORS
import { exec } from "child_process"; // Execute shell commands
import { promises as fs } from "fs"; // File system operations with promises
import fetch from "node-fetch"; // HTTP client for making requests
import {
  buildIndonesianTeachingPrompt,
  buildGestureAlignedTeachingPrompt,
  buildOllamaChatMessages,
  cleanTeacherResponse
} from "./services/indonesianPromptService.js";

// Add base64 conversion
import { readFile } from "fs/promises"; // File reading with promises

import gestureAnnotationRoutes from "./routes/gestureAnnotationRoutes.js";
import sentenceGestureMappingRoutes from "./routes/sentenceGestureMappingRoutes.js";
import gestureMappingCsvRoutes from "./routes/gestureMappingCsvRoutes.js";
import { buildSentenceGestureMapping } from "./services/sentenceGestureMapper.js";
import { saveSentenceGestureMapping } from "./services/sentenceGestureCsvStore.js";
import { saveGestureAnnotation } from "./services/gestureAnnotationStore.js";
import gestureMLRoutes from "./routes/gestureMLRoutes.js";
import { classifyGestureML, fallbackGestureML } from "./services/gestureMLClassifierService.js";
import {
  buildSentenceLevelGestureClassification,
  expandGestureSequenceForDuration
} from "./services/sentenceLevelGestureService.js";
import OpenAI from "openai";

dotenv.config(); // Load environment variables

const app = express(); // Create Express application

// Inisialisasi Groq client (menggunakan format OpenAI SDK)
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || "dummy-key-for-now",
  baseURL: "https://api.groq.com/openai/v1"
});

// Configure CORS
const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      // allow during development, but check in production
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json({ limit: "50mb" })); // Parse JSON bodies
app.use("/audios", express.static("audios")); // Serve generated audio files
app.use("/api", gestureAnnotationRoutes);
app.use("/api", sentenceGestureMappingRoutes);
app.use("/api", gestureMappingCsvRoutes);
app.use("/api", gestureMLRoutes);
const port = process.env.PORT || 3000; // Dynamic Server port


// List of available gestures for the AI to choose from
const AVAILABLE_GESTURES = [
  "STANDING_GREETING", "TALKING_EXPLAINING", "TALKING_OPEN_HAND", "TALKING_ARGUMEN",
  "TALKING_COMPARING", "TALKING_PRESENTING", "POINTING", "LOOKING", "COUNTING",
  "HAND_RAISING", "HEAD_NOD_YES", "SHAKING_HEAD_NO", "CLAPPING", "THANKFUL",
  "THINKING", "BASHFUL", "PATTING", "Greeting", "Waving", "Talking_0", "Talking_1",
  "Talking_2", "Talking_3", "Talking_4", "Talking_5", "Talking_6", "Talking_7",
  "normal", "terbuka", "Idle", "menjelaskan_normal"
];

// Generate appropriate prompt based on detected language
function getPrompt(lang, input) {
  const gestureList = AVAILABLE_GESTURES.join(", ");

  if (lang === "indonesian") {
    return `Identity: Kamu adalah Guru Indonesia yang profesional.
Tugas: Jawab pertanyaan user langsung dalam Bahasa Indonesia.
Batasan: Jangan katakan "Ini contoh jawaban" atau "Saya adalah AI". Jawab langsung.
Format: Jawaban harus diakhiri dengan [GESTURES: gesture1, gesture2] dari daftar ini: ${gestureList}.

User: ${input}
Guru:`;
  } else {
    return `Identity: You are a professional English Teacher.
Task: Answer the user's question directly in English.
Constraint: Do not say "Sure, here's an example" or "I am an AI". Answer directly.
Format: Your answer must end with [GESTURES: gesture1, gesture2] from this list: ${gestureList}.

User: ${input}
Teacher:`;
  }
}


// Strict prompt agar Ollama menghasilkan respons guru, bukan menjelaskan metadata atau selalu memberi salam.
// Kunci metodologis: respons inilah yang dipakai untuk TTS, lipsync, dan klasifikasi gesture pedagogik.
function buildStrictTeacherResponsePrompt(userMessage, inputRole = "student") {
  return `Anda adalah Guru Virtual berbasis AI yang berperan sebagai pengajar di kelas Indonesia.

ATURAN BAHASA PALING PENTING:
1. WAJIB jawab 100% dalam Bahasa Indonesia.
2. DILARANG menggunakan bahasa Inggris, termasuk frasa seperti "Let's", "What is", "step by step", "first step", "need to", "break it down".
3. Jika pesan siswa memakai Bahasa Indonesia, campuran, atau bahasa Inggris, tetap jawab dalam Bahasa Indonesia.
4. Jika tanpa sengaja mulai membuat jawaban bahasa Inggris, hentikan dan tulis ulang seluruh jawaban dalam Bahasa Indonesia.

Aturan utama jawaban:
1. Jawab sebagai guru kepada siswa secara singkat, natural, pedagogis, dan mudah dipahami.
2. Jangan selalu memulai jawaban dengan salam seperti "Halo", "Selamat datang", "Selamat pagi", atau "Selamat malam".
3. Gunakan salam hanya jika siswa benar-benar menyapa di awal pesan, dan cukup satu frasa singkat sebelum menjawab inti pertanyaan.
4. Jika siswa meminta persetujuan, jawab langsung dengan afirmasi atau koreksi. Contoh: "Ya, saya setuju..." atau "Belum tepat...".
5. Jika siswa meminta penjelasan konsep, langsung jelaskan konsepnya tanpa pembuka panjang.
6. Jika jawaban perlu mengarahkan perhatian siswa ke gambar, diagram, papan, atau bagian tertentu, gunakan kalimat seperti "Perhatikan bagian..." agar gesture pointing dapat dipilih secara tepat.
7. Jangan menjelaskan label gesture, nama animasi, file FBX/GLB, metadata sistem, atau proses klasifikasi.
8. Jangan menulis tag seperti [GESTURES: ...].
9. Jangan mengutip ulang pertanyaan siswa kecuali diperlukan.
10. Jawaban maksimal 2 sampai 4 kalimat.

Mode input: ${inputRole}
Pesan siswa:
${userMessage}

Jawaban guru dalam Bahasa Indonesia:`;
}

// Helper Functions
// Detect language based on input text (Indonesian or English)
function detectLanguage(input) {
  const indo = /[^\x00-\x7F]|(yang|tidak|dan|apa)/i.test(input); // Check for Indonesian characters or words
  return indo ? "indonesian" : "english"; // Return detected language
}

// Add greeting detection function with precise word boundaries
function isGreeting(text) {
  const greetingWords = ["hai", "halo", "hello", "hi", "assalam", "assalamu", "selamat pagi", "selamat siang"];
  const lowerText = text.toLowerCase().trim();

  // Use regex with word boundaries \b to prevent matching substrings (e.g., "hi" in "machine")
  return greetingWords.some(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(lowerText);
  });
}

// === Behavioral Engine Configuration (S3 Dissertation Level) ===
const BEHAVIORAL_BAGS = {
  INTRO: ["Greeting", "Waving", "Talking_1", "normal"],
  EXPLAINING: ["Talking_0", "Talking_2", "Talking_3", "Talking_4", "Talking_5", "Talking_6", "Talking_7", "terbuka", "normal", "menjelaskan_normal"],
  EMPHASIS: ["Talking_2", "Talking_3", "Talking_6", "terbuka", "menjelaskan_normal"],
  CONCLUSION: ["Talking_1", "normal", "Idle"],
  EMOTIONAL: {
    FUNNY: ["Laughing", "Talking_1"],
    SERIOUS: ["Terrified", "Crying"], // Can be adjusted for mood
    ACTIVE: ["Walk_left", "Rumba"]
  }
};

/**
 * Intelligent Gesture Sequencer (Emergent Behavior)
 * Instead of just mapping keywords, it analyzes narrative phases.
 */
function generateBehavioralGestures(text, audioDuration, llmSuggested = []) {
  let gestures = [];

  // 1. Analyze Phases based on text structure
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const totalSentences = sentences.length;

  // 2. Map sentences to Narrative Phases
  sentences.forEach((sentence, index) => {
    const isIntro = index === 0;
    const isConclusion = index === totalSentences - 1 && totalSentences > 1;
    const isEmphasis = sentence.length < 30 && !isIntro && !isConclusion; // Short sentences often represent emphasis

    let bag = BEHAVIORAL_BAGS.EXPLAINING;
    if (isIntro) bag = BEHAVIORAL_BAGS.INTRO;
    else if (isConclusion) bag = BEHAVIORAL_BAGS.CONCLUSION;
    else if (isEmphasis) bag = BEHAVIORAL_BAGS.EMPHASIS;

    // Pick a random gesture from the appropriate bag for variety (Emergent Behavior)
    const randomGesture = bag[Math.floor(Math.random() * bag.length)];
    gestures.push(randomGesture);
  });

  // 3. Merge with LLM suggestions (they take priority at their suggested positions)
  if (llmSuggested.length > 0) {
    // LLM suggestions are usually most relevant at the start or specific points
    gestures = [...new Set([...llmSuggested, ...gestures])];
  }

  // 4. Ensure we have enough variety proportional to duration
  // A gesture roughly takes 2-4 seconds. 
  // If we have a long audio but few sentences, we repeat/fill.
  const idealCount = Math.ceil(audioDuration / 3);
  while (gestures.length < idealCount && gestures.length > 0) {
    const lastGesture = gestures[gestures.length - 1];
    let nextBag = BEHAVIORAL_BAGS.EXPLAINING;

    // Pick something different from the last one to avoid monotony
    let nextGesture = lastGesture;
    let attempts = 0;
    while (nextGesture === lastGesture && attempts < 5) {
      nextGesture = nextBag[Math.floor(Math.random() * nextBag.length)];
      attempts++;
    }
    gestures.push(nextGesture);
  }

  // Limit max gestures to avoid erratic movement
  return gestures.slice(0, 10);
}

// Function to clean text for TTS - removes markdown and special characters
function cleanTextForTTS(text) {
  // Remove markdown characters and other symbols that shouldn't be read aloud
  return text.replace(/[\*\_\`\~\#\@\!\^\&\%\$\(\)\[\]\{\}\<\>\|\\]/g, ' ')
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim(); // Remove leading/trailing whitespace
}

// Function to extract gesture suggestions from AI response
// Deteksi sederhana untuk mencegah jawaban guru keluar dalam Bahasa Inggris.
function containsEnglishTeacherPhrase(text = "") {
  const t = String(text || "").toLowerCase();
  const englishPatterns = [
    /let['’]?s/,
    /break it down/,
    /step by step/,
    /what is/,
    /first step/,
    /we need to/,
    /need to take/,
    /the answer is/,
    /please try/,
    /sorry/,
    /teacher/,
    /student/
  ];
  return englishPatterns.some((pattern) => pattern.test(t));
}

async function rewriteTeacherAnswerToIndonesian({ rawText, userMsg }) {
  const rewritePrompt = `Tugas Anda adalah memperbaiki bahasa jawaban guru virtual.

ATURAN WAJIB:
1. Terjemahkan/tulis ulang jawaban berikut menjadi 100% Bahasa Indonesia.
2. Jangan pakai bahasa Inggris sama sekali.
3. Pertahankan maksud pedagogik jawaban.
4. Jangan tampilkan label gesture, metadata, JSON, atau tag sistem.
5. Jawaban maksimal 2 kalimat pendek dan natural untuk diucapkan guru.

Pesan siswa:
${userMsg}

Jawaban guru yang harus diperbaiki:
${rawText}

Jawaban guru dalam Bahasa Indonesia:`;

  try {
    const groqResponse = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [
        {
          role: "user",
          content: rewritePrompt
        }
      ],
      temperature: 0.1
    });
    return groqResponse.choices[0]?.message?.content || rawText;
  } catch (e) {
    console.error("Groq rewrite failed, returning raw text:", e.message);
    return rawText;
  }
}

function extractGesturesFromText(text) {
  // Look for pattern: [GESTURES: gesture1, gesture2, gesture3]
  const gesturePattern = /\[GESTURES:\s*([^\]]+)\]/i;
  const match = text.match(gesturePattern);

  if (match && match[1]) {
    // Extract and clean gesture names
    const gestures = match[1]
      .split(',')
      .map(g => g.trim())
      .filter(g => g.length > 0 && AVAILABLE_GESTURES.includes(g));

    // Remove the gesture tag from the text
    const cleanedText = text.replace(gesturePattern, '').trim();

    return { gestures, cleanedText };
  }

  return { gestures: [], cleanedText: text };
}

// Create line-by-line subtitles for better display
function createLineByLineSubtitles(text, maxChars = 100) {
  // Clean text for better subtitle display
  const cleanText = cleanTextForTTS(text);
  const lines = []; // Array to store subtitle lines
  let current = ""; // Current line being built
  for (const word of cleanText.split(" ")) { // Split text into words
    if ((current + word).length > maxChars) { // Check if adding word exceeds max characters
      lines.push(current.trim()); // Add completed line to array
      current = ""; // Reset current line
    }
    current += word + " "; // Add word to current line
  }
  if (current.trim()) lines.push(current.trim()); // Add final line if not empty
  return lines; // Return array of subtitle lines
}

// Main chat endpoint - handles user messages and generates AI responses
app.post("/chat", async (req, res) => {
  try {
    const userMsg = req.body.message || ""; // Get user message from request body
    const inputRole = req.body.input_role || req.body.inputRole || "student";
    const lang = detectLanguage(userMsg); // Detect language of user message

    // === TEXT PIPELINE LOG ===
    // Dataset gesture dilatih dari kalimat guru. Karena itu input siswa hanya dicatat,
    // sedangkan classifier gesture memakai respons guru hasil Ollama.
    console.log("\n================ TEXT PIPELINE ================");
    console.log("Student input / input teks siswa:", userMsg);
    console.log("Input role:", inputRole);

    // === IMPORTANT PIPELINE FIX ===
    // Dataset gesture berisi KALIMAT GURU, bukan pertanyaan siswa.
    // Karena itu klasifikasi gesture final dilakukan SETELAH Ollama menghasilkan jawaban guru,
    // lalu teks yang sama dipakai untuk TTS, lipsync, subtitle, dan animasi gesture.
    let mlGesture = null;

    const indonesianPrompt = buildStrictTeacherResponsePrompt(userMsg, inputRole);
    console.log(`[${new Date().toISOString()}] Sending to Groq:`, userMsg); // Log user message

    // Ganti pemanggilan Ollama dengan SDK Groq (menggunakan model llama3-8b-8192 gratis dan cepat)
    let rawText = "No response.";
    try {
      const groqResponse = await groq.chat.completions.create({
        model: "llama3-8b-8192",
        messages: [
          {
            role: "user",
            content: indonesianPrompt
          }
        ],
        temperature: 0.4
      });
      rawText = groqResponse.choices[0]?.message?.content || "No response.";
    } catch (groqError) {
      console.error("Groq API error, attempting fallback:", groqError.message);
      // Fallback sederhana jika API Groq bermasalah
      rawText = "Mari kita bahas materi pembelajaran hari ini dengan baik.";
    }

    console.log("Response received, length:", rawText.length); // Log response length

    // === LANGUAGE GUARDRAIL ===
    // Jika terdeteksi frasa bahasa Inggris, jawaban ditulis ulang dulu menjadi Bahasa Indonesia
    // menggunakan Groq.
    if (containsEnglishTeacherPhrase(rawText)) {
      console.warn("English response detected. Rewriting teacher answer to Indonesian...");
      try {
        rawText = await rewriteTeacherAnswerToIndonesian({ rawText, userMsg });
        console.log("Rewritten Indonesian response, length:", rawText.length);
      } catch (rewriteError) {
        console.warn("Indonesian rewrite failed, using deterministic Indonesian fallback:", rewriteError.message);
        rawText = "Baik, mari kita uraikan langkah-langkahnya satu per satu agar lebih mudah dipahami.";
      }
    }

    // === STEP 1: Extract LLM-suggested gestures from response ===
    const { gestures: llmGestures, cleanedText: textWithoutGestures } = extractGesturesFromText(rawText);
    console.log("LLM-suggested gestures:", llmGestures);

    // Bersihkan respons untuk tampilan, TTS, lipsync, dan klasifikasi gesture.
    let text = cleanTeacherResponse(textWithoutGestures);
    if (!text) text = "Baik, mari kita lanjutkan pembelajaran dengan lebih terarah.";
    const cleanText = cleanTextForTTS(text); // Clean AI response for text-to-speech

    // === TEACHER RESPONSE LOG ===
    // Teks inilah yang dipakai serentak untuk subtitle, TTS, lipsync, dan classifier gesture.
    console.log("Teacher response / jawaban guru:", text);
    console.log("Gesture classifier input / teks guru untuk klasifikasi:", text);

    // === ML Gesture Classifier on TEACHER RESPONSE ===
    // Klasifikasi dilakukan pada teks jawaban guru agar gesture sama dengan kalimat yang diucapkan avatar.
    try {
      mlGesture = await classifyGestureML(text);
      console.log("ML gesture classification on teacher response:", {
        student_input: userMsg,
        teacher_response_for_gesture: text,
        gesture_label: mlGesture?.gesture_label || "",
        canonical_label: mlGesture?.canonical_label || "",
        confidence: mlGesture?.confidence || "",
        animation_clip: mlGesture?.animation_clip || "",
        frontend_animation_clip: mlGesture?.frontend_animation_clip || "",
        animation_file: mlGesture?.animation_file || "",
        frontend_animation_path: mlGesture?.frontend_animation_path || "",
        decision_source: mlGesture?.decision_source || "",
        ml_prediction: mlGesture?.ml_prediction || "",
        rule_hits: mlGesture?.rule_hits || 0,
        top3: mlGesture?.top3 || [],
        gesture_function: mlGesture?.gesture_function || "",
        pedagogical_context: mlGesture?.pedagogical_context || "",
        pedagogic_category: mlGesture?.pedagogic_category || "",
        pedagogic_analysis: mlGesture?.pedagogic_analysis || "",
        data_type: mlGesture?.data_type || ""
      });
    } catch (mlError) {
      console.warn("ML gesture classifier failed, using fallback:", mlError.message);
      mlGesture = fallbackGestureML(text);
    }

    // === SENTENCE-LEVEL GESTURE PIPELINE ===
    // Satu jawaban guru dapat berisi beberapa fungsi pedagogik.
    // Karena itu respons dipecah menjadi beberapa segmen/kalimat,
    // lalu setiap segmen diprediksi gesture-nya secara terpisah.
    const estimatedDuration = Math.max(2.5, (cleanText.split(' ').length / 130) * 60);
    let sentenceLevelGesture = null;
    let gestureLabels = [];

    try {
      sentenceLevelGesture = await buildSentenceLevelGestureClassification({
        text,
        classifyGestureML,
        fallbackGestureML,
        maxSegments: 6
      });
      gestureLabels = sentenceLevelGesture.gestureLabels || [];
    } catch (sentenceLevelError) {
      console.warn("Sentence-level gesture classifier failed, using whole-response fallback:", sentenceLevelError.message);
      const fallbackLabel = mlGesture?.frontend_animation_clip || mlGesture?.animation_clip || mlGesture?.gesture_label || "TALKING_EXPLAINING";
      gestureLabels = [String(fallbackLabel).toUpperCase()];
      sentenceLevelGesture = {
        mode: "fallback-whole-response",
        segments: [text],
        results: [{
          index: 0,
          text,
          gesture_label: gestureLabels[0],
          canonical_label: gestureLabels[0],
          confidence: mlGesture?.confidence ?? 0,
          decision_source: "whole_response_fallback",
          animation_file: mlGesture?.animation_file || "",
          frontend_animation_path: mlGesture?.frontend_animation_path || ""
        }],
        gestureLabels,
        primaryGesture: gestureLabels[0],
        uniqueGestureCount: 1
      };
    }

    // Jika respons hanya satu kalimat, sistem tetap bisa menghasilkan satu gesture.
    // Jika respons dua kalimat atau lebih, sequence berasal dari hasil klasifikasi per kalimat,
    // bukan pengulangan satu gesture dominan.
    console.log('Sentence-level gesture segments:', sentenceLevelGesture?.segments || []);
    console.log('Sentence-level gesture results:', (sentenceLevelGesture?.results || []).map((item) => ({
      index: item.index,
      text: item.text,
      gesture_label: item.gesture_label,
      animation_file: item.animation_file,
      confidence: item.confidence,
      decision_source: item.decision_source,
      variation_reason: item.variation_reason || ""
    })));
    console.log('Initial sentence-level gesture sequence:', gestureLabels);

    // === PIPELINE ===
    // 1. Generate TTS (Text-to-Speech)
    const tempTextFile = "audios/temp_text.txt";
    await fs.writeFile(tempTextFile, cleanText, "utf-8");
    // Gunakan 'python3' jika di Linux/Render, gunakan 'py' jika di Windows lokal
    const pythonCmd = process.platform === "win32" ? "py" : "python3";
    await execPromise(`${pythonCmd} tts.py "${tempTextFile}"`);

    // 2. Convert to WAV format
    try {
      const ffmpegPath = process.platform === "win32" ? "..\\ffmpeg\\bin\\ffmpeg.exe" : "ffmpeg";
      await execPromise(`${ffmpegPath} -y -i audios/generated.mp3 audios/generated.wav`);
    } catch (conversionError) {
      console.log("Warning: Could not convert audio file");
    }

    // 3. Get actual audio duration
    let audioDuration = 3.0;
    try {
      const ffprobeCmd = process.platform === "win32" 
        ? "..\\ffmpeg\\bin\\ffprobe.exe -v quiet -show_entries format=duration -of csv=p=0 audios/generated.wav"
        : "ffprobe -v quiet -show_entries format=duration -of csv=p=0 audios/generated.wav";
      const durationOutput = await execPromise(ffprobeCmd);
      audioDuration = parseFloat(durationOutput.trim()) || 3.0;
      console.log(`Actual audio duration: ${audioDuration} seconds`);
    } catch (durationError) {
      console.log("Could not determine duration, using estimate");
      audioDuration = estimatedDuration;
    }

    // 4. Final Gesture Sequence Refinement (Adjust to actual duration)
    // Sequence diperluas proporsional terhadap durasi audio, tetapi tetap menjaga
    // hasil klasifikasi per kalimat agar jawaban panjang tidak hanya memakai satu gesture.
    gestureLabels = expandGestureSequenceForDuration(
      gestureLabels,
      audioDuration,
      sentenceLevelGesture?.results || []
    );
    console.log('Final ML-aligned sentence-level gesture sequence:', gestureLabels);

    // 5. Generate lip-sync data
    try {
      const rhubarbCmd = process.platform === "win32"
        ? "..\\Rhubarb-Lip-Sync\\bin\\rhubarb.exe -f json -o audios\\generated.json audios\\generated.wav"
        : "/app/Rhubarb-Lip-Sync/rhubarb -f json -o audios/generated.json audios/generated.wav";
      await execPromise(rhubarbCmd);
    } catch (lipsyncError) {
      console.log("Warning: Could not generate lip-sync data");
    }

    const subtitles = createLineByLineSubtitles(text, 100);

    // Read generated files
    let lipsync = { mouthCues: [] };
    try {
      const lipsyncData = await fs.readFile("audios/generated.json", "utf-8");
      lipsync = JSON.parse(lipsyncData);
    } catch (e) { }

    let audioBase64 = "";
    try {
      const audioBuffer = await readFile("audios/generated.mp3");
      audioBase64 = audioBuffer.toString('base64');
    } catch (e) { }


    // === Gesture annotation + sentence-level gesture mapping ===
    const sessionId = `SES-${Date.now()}`;
    const predictedGesture = Array.isArray(gestureLabels) && gestureLabels.length > 0 ? gestureLabels[0] : "normal";
    const annotationLog = saveGestureAnnotation({
      annotation_id: sessionId,
      session_id: sessionId,
      user_input: userMsg,
      ai_response: text,
      predicted_gesture: predictedGesture,
      predicted_gesture_sequence: gestureLabels,
      confidence: mlGesture?.confidence ?? "",
      audio_duration: audioDuration,
      animation_clip: predictedGesture,
      lip_sync_file: "audios/generated.json",
      validation_status: "system-log"
    });

    const sentenceGestureMapping = buildSentenceGestureMapping({
      text,
      gestureSequence: gestureLabels,
      lipsync,
      audioDuration,
      audioFile: "generated.wav",
      sessionId
    });

    let sentenceGestureSaved = null;
    try {
      sentenceGestureSaved = saveSentenceGestureMapping(sentenceGestureMapping, {
        session_id: sessionId,
        audio_file: "generated.wav",
        audio_duration: audioDuration
      }, "append");
    } catch (saveError) {
      console.warn("Warning: failed to save sentence gesture mapping:", saveError.message);
    }

    // Send response
    res.json({
      success: true,
      language: lang,
      inputRole,
      studentInput: userMsg,
      teacherResponse: text,
      gestureClassifierInput: text,
      text,
      subtitles,
      audio: audioBase64,
      lipsync: lipsync,
      gestureLabels: gestureLabels,
      audioDuration,
      session_id: sessionId,
      annotation_id: annotationLog?.annotation_id || sessionId,
      gesture_annotation: {
        predicted_gesture: annotationLog?.predicted_gesture || predictedGesture,
        predicted_gesture_sequence: annotationLog?.predicted_gesture_sequence || gestureLabels.join("|"),
        confidence: annotationLog?.confidence || mlGesture?.confidence || "",
        validation_status: annotationLog?.validation_status || "system-log"
      },
      sentenceGestureMapping,
      sentenceGestureSaved,
      sentenceLevelGesture,
      sentenceGestureResults: sentenceLevelGesture?.results || [],
      sentenceGestureSequence: gestureLabels,
      sentenceSegments: sentenceLevelGesture?.segments || [],
      mlGesture,
      predictedGestureLabel: sentenceLevelGesture?.primaryGesture || mlGesture?.gesture_label || "",
      predictedAnimationClip: sentenceLevelGesture?.primaryGesture || mlGesture?.animation_clip || ""
    });

  } catch (error) { // Handle any errors that occurred
    console.error("❌ Error:", error); // Log error
    res.status(500).json({
      success: false, // Indicate processing failure
      message: error.message, // Include error message
      // Provide a fallback response for better user experience
      text: "Maaf, sistem guru virtual sedang mengalami kendala. Silakan coba beberapa saat lagi.",
      subtitles: ["Maaf, sistem guru virtual sedang mengalami kendala.", "Silakan coba beberapa saat lagi."],
      audio: "", // Empty audio data
      lipsync: { mouthCues: [] }, // Empty lip-sync data
      audioDuration: 0 // No audio duration
    });
  }
});

// Execute shell command and return promise
function execPromise(command) {
  return new Promise((resolve, reject) => {
    console.log("Executing command:", command); // Log command being executed
    exec(command, (err, stdout, stderr) => { // Execute command
      if (err) { // Check if command failed
        console.error("Exec error:", err); // Log execution error
        console.error("Stderr:", stderr); // Log standard error output
        reject(new Error(`Command failed: ${err.message}\nStderr: ${stderr}`)); // Reject promise with error
      } else {
        console.log("Command output:", stdout); // Log standard output
        resolve(stdout); // Resolve promise with output
      }
    });
  });
}

// Start server on specified port
app.listen(port, () => console.log(`AI Teacher backend running on port ${port}`));

// Add health check endpoint
app.get("/health", async (req, res) => {
  try {
    // Memastikan koneksi ke Groq API
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        status: "unhealthy",
        error: "Missing GROQ_API_KEY environment variable"
      });
    }

    res.json({
      status: "healthy",
      groq: "connected"
    });
  } catch (error) { // Handle connection errors
    res.status(500).json({
      status: "unhealthy",
      error: error.message
    });
  }
});

// Debugging endpoint for classifier alone
app.post('/classify', async (req, res) => {
  try {
    const text = req.body && req.body.text ? String(req.body.text) : '';
    if (!text) return res.status(400).json({ error: 'Missing text in request body' });

    // Check for greeting rule-based override first
    let rulesTriggered = false;
    let gestureLabels = [];
    let rawClassifierOutput = null;
    let confidence = 0;
    let label = "";

    if (isGreeting(text)) {
      gestureLabels = ["Greeting"];
      rulesTriggered = true;
      label = "Greeting";
      confidence = 1.0;
    } else {
      const classifierTextFile = 'audios/temp_text_for_classifier.txt';
      await fs.writeFile(classifierTextFile, text, 'utf-8');
      const pythonCmd = process.platform === "win32" ? "py" : "python3";
      const out = await execPromise(`${pythonCmd} textClassifier.py --file "${classifierTextFile}"`);
      let parsed = {};
      try {
        parsed = JSON.parse(out.trim());
        rawClassifierOutput = parsed;
        if (parsed && Array.isArray(parsed.predictions) && parsed.predictions.length > 0) {
          const topPrediction = parsed.predictions[0];
          label = topPrediction.label;
          confidence = topPrediction.confidence;

          // Apply confidence threshold
          if (confidence >= 0.40) {
            gestureLabels = [label]; // Take only the highest confidence label
          } else {
            // Fallback to "normal" if confidence is low
            gestureLabels = ["normal"];
            label = "normal";
            confidence = 1.0 - confidence; // Inverted confidence for fallback
          }
        } else {
          // Fallback if no predictions
          gestureLabels = ["normal"];
          label = "normal";
          confidence = 0.0;
        }
      } catch (e) {
        parsed = { raw: out };
        gestureLabels = ["normal"];
        label = "normal";
        confidence = 0.0;
      }
    }

    res.json({
      success: true,
      classifier: {
        label: label,
        confidence: confidence,
        rulesTriggered: rulesTriggered,
        rawClassifierOutput: rawClassifierOutput,
        gestureLabels: gestureLabels
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Add GET /classify endpoint
app.get('/classify', async (req, res) => {
  try {
    const text = req.query && req.query.text ? String(req.query.text) : '';
    if (!text) return res.status(400).json({ error: 'Missing text query parameter' });

    // Check for greeting rule-based override first
    let rulesTriggered = false;
    let gestureLabels = [];
    let rawClassifierOutput = null;
    let confidence = 0;
    let label = "";

    if (isGreeting(text)) {
      gestureLabels = ["Greeting"];
      rulesTriggered = true;
      label = "Greeting";
      confidence = 1.0;
    } else {
      const classifierTextFile = 'audios/temp_text_for_classifier.txt';
      await fs.writeFile(classifierTextFile, text, 'utf-8');
      const pythonCmd = process.platform === "win32" ? "py" : "python3";
      const out = await execPromise(`${pythonCmd} textClassifier.py --file "${classifierTextFile}"`);
      let parsed = {};
      try {
        parsed = JSON.parse(out.trim());
        rawClassifierOutput = parsed;
        if (parsed && Array.isArray(parsed.predictions) && parsed.predictions.length > 0) {
          const topPrediction = parsed.predictions[0];
          label = topPrediction.label;
          confidence = topPrediction.confidence;

          // Apply confidence threshold
          if (confidence >= 0.40) {
            gestureLabels = [label]; // Take only the highest confidence label
          } else {
            // Fallback to "normal" if confidence is low
            gestureLabels = ["normal"];
            label = "normal";
            confidence = 1.0 - confidence; // Inverted confidence for fallback
          }
        } else {
          // Fallback if no predictions
          gestureLabels = ["normal"];
          label = "normal";
          confidence = 0.0;
        }
      } catch (e) {
        parsed = { raw: out };
        gestureLabels = ["normal"];
        label = "normal";
        confidence = 0.0;
      }
    }

    res.json({
      label: label,
      confidence: confidence,
      rulesTriggered: rulesTriggered,
      rawClassifierOutput: rawClassifierOutput
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});