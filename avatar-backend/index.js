import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { exec } from "child_process";
import { promises as fs } from "fs";
import fetch from "node-fetch";
import {spawn} from "child_process";

// Add base64 conversion
import { readFile } from "fs/promises";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
const port = 3007;

// Helper Functions
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

app.post("/chat", async (req, res) => {
  try {
    const userMsg = req.body.message || "";
    const lang = detectLanguage(userMsg);

    console.log(`[${new Date().toISOString()}] Sending to Ollama:`, userMsg);

    const ollamaResponse = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemma:2b",
        prompt: getPrompt(lang, userMsg),
        stream: false
      }),
      timeout: 120000, // 120 seconds
    });

    if (!ollamaResponse.ok) {
      throw new Error(`Ollama API error: ${ollamaResponse.status} ${ollamaResponse.statusText}`);
    }

    const result = await ollamaResponse.json();
    const text = result.response || "No response.";

    console.log("Response received, length:", text.length);

    // === PIPELINE ===
    // 1. Generate gesture
    await execPromise(`py Text2gestures/generate_gesture.py`);
    
    // 2. Generate TTS
    const tempTextFile = "audios/temp_text.txt";
    await fs.writeFile(tempTextFile, text, "utf-8");
    await execPromise(`py tts.py "${tempTextFile}"`);
    
    // 3. Convert to WAV
    await execPromise(`..\\ffmpeg\\bin\\ffmpeg.exe -y -i audios/generated.mp3 audios/generated.wav`);
    
    // 4. Generate lip-sync
    await execPromise(`..\\Rhubarb-Lip-Sync\\bin\\rhubarb.exe -f json -o audios\\generated.json audios\\generated.wav -r phonetic`);

    const subtitles = createLineByLineSubtitles(text, 100);
    
    // Read the generated lip-sync JSON file
    const lipsyncData = await fs.readFile("audios/generated.json", "utf-8");
    const lipsync = JSON.parse(lipsyncData);

    // Read the generated MP3 file and convert to base64
    const audioBuffer = await readFile("audios/generated.mp3");
    const audioBase64 = audioBuffer.toString('base64');

    res.json({
      success: true,
      language: lang,
      text,
      subtitles,
      audio: audioBase64,
      lipsync: lipsync
    });

  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

function execPromise(command) {
  return new Promise((resolve, reject) => {
    console.log("Executing command:", command);
    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error("Exec error:", err);
        console.error("Stderr:", stderr);
        reject(new Error(`Command failed: ${err.message}\nStderr: ${stderr}`));
      } else {
        console.log("Command output:", stdout);
        resolve(stdout);
      }
    });
  });
}

app.listen(port, () => console.log(`AI Teacher backend running on port ${port}`));
