// Final index.js - Ollama + gTTS + ffmpeg + Rhubarb lipsync
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { exec } from "child_process";
// import { writeFile } from "fs/promises";
import { promises as fs } from "fs";
import fetch from "node-fetch";
import {spawn} from "child_process";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
const port = 3000;

app.post("/chat-ollama", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  try {
    // 1. Kirim pertanyaan ke LLM (Ollama)
    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "tinyllama",
        messages: [
          {
            role: "system",
            content:
              "Anda adalah guru AI yang ramah dan berpengetahuan luas. Tugas Anda adalah menjelaskan konsep pendidikan dengan jelas dan akurat kepada siswa SMA dan mahasiswa di Indonesia."
          },
          {
            role: "user",
            content: message
          }
        ]
      })
    });

    const body = await response.text();
    const messages = body
      .split("\n")
      .map((line) => {
        try {
          return JSON.parse(line.trim());
        } catch {
          return null;
        }
      })
      .filter((msg) => msg && msg.message && msg.message.content);

    const fullContent = messages.map((m) => m.message.content).join(" ").trim();

    // 2. Jalankan gesture AI
    const gestureResultRaw = await execPromise(`py Text2gestures/generate_gesture.py`);
    const gestureResult = JSON.parse(gestureResultRaw);

    // 3. Panggil ElevenLabs TTS API
    const elevenApiKey = process.env.ELEVEN_LABS_API_KEY;
    const voiceId = "Lpe7uP03WRpCk9XkpFnf";

    const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": elevenApiKey
      },
      body: JSON.stringify({
        text: fullContent,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.7
        }
      })
    });

    if (!ttsResponse.ok) {
      const error = await ttsResponse.text();
      throw new Error("TTS API error: " + error);
    }

    // 4. Simpan MP3
    const audioBuffer = await ttsResponse.arrayBuffer();
    await fs.writeFile("audios/generated.mp3", Buffer.from(audioBuffer));
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");

    // 5. Konversi ke WAV untuk Rhubarb
    await execPromise(`ffmpeg -y -i audios/generated.mp3 audios/generated.wav`);

    // 6. Jalankan Rhubarb untuk lipsync
    await execPromise(`..\\Rhubarb-Lip-Sync\\bin\\rhubarb.exe -f json -o audios\\generated.json audios\\generated.wav -r phonetic`);
    const lipsyncJson = await fs.readFile("audios/generated.json", "utf-8");

    // 7. Kembalikan respon ke frontend
    res.json({
      reply: fullContent,
      audio: audioBase64,
      lipsync: JSON.parse(lipsyncJson),
      gesture: gestureResult.gesture,
      expression: gestureResult.expression
    });

  } catch (err) {
    const errorMsg = Buffer.isBuffer(err?.response?.data)
      ? err.response.data.toString()
      : err?.response?.data || err.message;
    console.error("TTS or LLM ERROR:", errorMsg);
    res.status(500).json({ error: "Failed to process request", details: errorMsg });
  }
});

function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error("Exec error:", stderr);
        reject(stderr);
      } else {
        resolve(stdout);
      }
    });
  });
}


// Endpoint AI Gesture
app.post("/gesture-ai", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message required" });

  const py = spawn("py", ["Text2gestures/generate_gesture.py", message]);

  let result = "";
  py.stdout.on("data", (data) => {
    result += data.toString();
  });

  py.stderr.on("data", (data) => {
    console.error("Python error:", data.toString());
  });

  py.on("close", (code) => {
    try {
      const parsed = JSON.parse(result);
      res.json(parsed); // ✅ kirim gesture dan ekspresi ke frontend
    } catch (e) {
      console.error("Parse error:", result);
      res.status(500).json({ error: "Invalid gesture result" });
    }
  });
});

app.listen(port, () => {
  console.log(`Teacher AI listening on port ${port}`);
});
