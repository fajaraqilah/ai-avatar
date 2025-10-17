# 🤖 AI Teacher (Virtual Guru Teknologi) — Hybrid Developer Spec

### 🧩 Project Overview
This system is an **AI-powered virtual teacher** specialized in **technology and computing topics**.  
It receives user text input, processes it via a language model, generates synchronized **speech**, **gesture**, and **subtitle** outputs.

---

## 🚀 Core Features

1. **Language Awareness**
   - The AI must detect the user's input language.
   - It must respond in the same language (English → English, Indonesian → Indonesian).
   - If language detection fails, fallback to English.

2. **Real-time Subtitle Mode**
   - Text appears **line by line**, not all at once.
   - When a line exceeds a certain character limit (e.g., 100 chars), it **auto reloads** and continues.
   - Example behavior:
     ```
     AI: Artificial Intelligence is the ability of...
     (reloads)
     AI: computer systems to perform tasks that normally require human...
     ```

3. **Multimodal Output**
   - Synchronizes text, speech, and animation:
     - 🧠 Text → TTS (`tts.py`)
     - 🔊 Audio → WAV (`ffmpeg`)
     - 👄 Lip-sync → JSON (`Rhubarb`)
     - 🧍 Gesture → JSON (`generate_gesture.py`)

---

## 🧠 AI Model Configuration

**Model:** `gemma:2b`  
**Server:** Ollama (local inference)  
**Reason:** Faster response, reduced timeout risk.

---

## ⚙️ Backend Specification (Node.js)

### 1. Core Request Flow
**File:** `index.js`

```js
import express from "express";
import { execSync } from "child_process";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const MODEL = "tinyllama";
const TIMEOUT = 120000; // 120 seconds

app.post("/chat", async (req, res) => {
  try {
    const userMsg = req.body.message || "";
    const lang = detectLanguage(userMsg); // custom function below

    console.log(`[${new Date().toISOString()}] Sending to Ollama:`, userMsg);

    const ollamaResponse = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        prompt: getPrompt(lang, userMsg)
      }),
      timeout: TIMEOUT,
    });

    const result = await ollamaResponse.json();
    const text = result.message?.content || "No response.";

    console.log("Response received, length:", text.length);

    // === PIPELINE ===
    execSync(`py Text2Gestures/generate_gesture.py`);
    execSync(`py tts.py "audios/temp_text.txt"`);
    execSync(`../ffmpeg/bin/ffmpeg.exe -y -i audios/generated.mp3 audios/generated.wav`);
    execSync(`../Rhubarb-Lip-Sync/bin/rhubarb.exe -f json -o audios/generated.json audios/generated.wav -r phonetic`);

    const subtitles = createLineByLineSubtitles(text, 100);

    res.json({
      success: true,
      language: lang,
      text,
      subtitles,
      audio: "audios/generated.mp3",
      lipsync: "audios/generated.json"
    });

  } catch (error) {
    console.error("❌ Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(3007, () => console.log("AI Teacher backend running on port 3007"));

// --- Helper Functions ---
function detectLanguage(input) {
  const indo = /[^\x00-\x7F]|(yang|tidak|dan|apa)/i.test(input);
  return indo ? "indonesian" : "english";
}

function getPrompt(lang, input) {
  return lang === "indonesian"
    ? `Jawablah dalam Bahasa Indonesia, ringkas, ramah, dan informatif. Pertanyaan pengguna: ${input}`
    : `Answer in English clearly and informatively. User question: ${input}`;
}

function createLineByLineSubtitles(text, maxChars = 100) {
  const lines = [];
  let current = "";
  for (const word of text.split(" ")) {
    if ((current + word).length > maxChars) {
      lines.push(current.trim());
      current = "";
    }
    current += word + " ";
  }
  if (current.trim()) lines.push(current.trim());
  return lines;
}
