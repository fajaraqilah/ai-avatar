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

// Function to clean text for TTS - removes markdown and special characters
function cleanTextForTTS(text) {
  // Remove markdown characters and other symbols that shouldn't be read aloud
  return text.replace(/[\*\_\`\~\#\@\!\^\&\%\$\(\)\[\]\{\}\<\>\|\\]/g, ' ')
             .replace(/\s+/g, ' ') // Replace multiple spaces with single space
             .trim();
}

function createLineByLineSubtitles(text, maxChars = 100) {
  // Clean text for better subtitle display
  const cleanText = cleanTextForTTS(text);
  const lines = [];
  let current = "";
  for (const word of cleanText.split(" ")) {
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

    // Add retry logic for Ollama connection
    let ollamaResponse;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        ollamaResponse = await fetch("http://localhost:11434/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "gemma:2b",
            prompt: getPrompt(lang, userMsg),
            stream: false
          }),
          timeout: 120000, // 120 seconds
        });
        
        if (ollamaResponse.ok) {
          break;
        }
      } catch (fetchError) {
        retryCount++;
        console.log(`Ollama request failed (attempt ${retryCount}/${maxRetries}):`, fetchError.message);
        if (retryCount >= maxRetries) {
          throw fetchError;
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (!ollamaResponse.ok) {
      throw new Error(`Ollama API error: ${ollamaResponse.status} ${ollamaResponse.statusText}`);
    }

    const result = await ollamaResponse.json();
    const text = result.response || "No response.";

    console.log("Response received, length:", text.length);

    // Clean text for TTS
    const cleanText = cleanTextForTTS(text);

    // === PIPELINE ===
    // 1. Generate gesture
    await execPromise(`py Text2gestures/generate_gesture.py`);
    
    // 2. Generate TTS
    const tempTextFile = "audios/temp_text.txt";
    await fs.writeFile(tempTextFile, cleanText, "utf-8");
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
    res.status(500).json({ 
      success: false, 
      message: error.message,
      // Provide a fallback response for better user experience
      text: "Sorry, I'm having trouble connecting to my AI brain right now. Please try again in a moment.",
      subtitles: ["Sorry, I'm having trouble connecting to my AI brain right now.", "Please try again in a moment."],
      audio: "",
      lipsync: { mouthCues: [] }
    });
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

// Add health check endpoint
app.get("/health", async (req, res) => {
  try {
    const ollamaResponse = await fetch("http://localhost:11434/api/tags", {
      method: "GET",
      timeout: 5000,
    });
    
    if (ollamaResponse.ok) {
      const data = await ollamaResponse.json();
      res.json({
        status: "healthy",
        ollama: "connected",
        models: data.models.map(m => m.name)
      });
    } else {
      res.status(500).json({
        status: "unhealthy",
        ollama: "error",
        error: `Ollama API error: ${ollamaResponse.status}`
      });
    }
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      ollama: "disconnected",
      error: error.message
    });
  }
});
