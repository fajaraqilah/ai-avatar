import dotenv from "dotenv"; // Load environment variables from .env file
import express from "express"; // Web framework for Node.js
import cors from "cors"; // Middleware for enabling CORS
import { exec } from "child_process"; // Execute shell commands
import { promises as fs } from "fs"; // File system operations with promises
import fetch from "node-fetch"; // HTTP client for making requests

// Add base64 conversion
import { readFile } from "fs/promises"; // File reading with promises

dotenv.config(); // Load environment variables

const app = express(); // Create Express application
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Parse JSON bodies
const port = 3000; // Server port

// Helper Functions
// Detect language based on input text (Indonesian or English)
function detectLanguage(input) {
  const indo = /[^\x00-\x7F]|(yang|tidak|dan|apa)/i.test(input); // Check for Indonesian characters or words
  return indo ? "indonesian" : "english"; // Return detected language
}

// Generate appropriate prompt based on detected language
function getPrompt(lang, input) {
  return lang === "indonesian"
    ? `Jawablah dalam Bahasa Indonesia, ringkas, ramah, dan informatif. Pertanyaan pengguna: ${input}` // Indonesian prompt
    : `Answer in English clearly and informatively. User question: ${input}`; // English prompt
}

// Function to clean text for TTS - removes markdown and special characters
function cleanTextForTTS(text) {
  // Remove markdown characters and other symbols that shouldn't be read aloud
  return text.replace(/[\*\_\`\~\#\@\!\^\&\%\$\(\)\[\]\{\}\<\>\|\\]/g, ' ')
             .replace(/\s+/g, ' ') // Replace multiple spaces with single space
             .trim(); // Remove leading/trailing whitespace
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
    const lang = detectLanguage(userMsg); // Detect language of user message

    console.log(`[${new Date().toISOString()}] Sending to Ollama:`, userMsg); // Log user message

    // Add retry logic for Ollama connection
    let ollamaResponse;
    let retryCount = 0;
    const maxRetries = 3; // Maximum number of retry attempts
    
    // Retry loop for connecting to Ollama API
    while (retryCount < maxRetries) {
      try {
        // Send request to Ollama API for text generation
        ollamaResponse = await fetch("http://localhost:11434/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" }, // Set JSON content type
          body: JSON.stringify({
            model: "gemma:2b", // Specify AI model to use
            prompt: getPrompt(lang, userMsg), // Generate appropriate prompt
            stream: false // Don't stream response
          }),
          timeout: 120000, // 120 seconds timeout
        });
        
        if (ollamaResponse.ok) { // Check if request was successful
          break; // Exit retry loop
        }
      } catch (fetchError) {
        retryCount++; // Increment retry counter
        console.log(`Ollama request failed (attempt ${retryCount}/${maxRetries}):`, fetchError.message);
        if (retryCount >= maxRetries) { // Check if max retries reached
          throw fetchError; // Throw error if all retries failed
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
      }
    }

    if (!ollamaResponse.ok) { // Check if Ollama request failed
      throw new Error(`Ollama API error: ${ollamaResponse.status} ${ollamaResponse.statusText}`);
    }

    const result = await ollamaResponse.json(); // Parse JSON response
    const text = result.response || "No response."; // Extract AI response text

    // Simple animation selection - frontend now handles keyword logic
    let animationState = "Idle"; // Default animation state
    let secondaryAnimation = null; // No secondary animation by default
    
    // If there's a message, use a random talking animation
    if (userMsg.trim()) { // Check if user message is not empty
      const talkingAnimations = ["Talking_0", "Talking_1", "Talking_2", "Talking_1", "Talking_4", "Talking_5", "Talking_6", "Talking_7"];
      const randomIndex = Math.floor(Math.random() * talkingAnimations.length); // Generate random index
      animationState = talkingAnimations[randomIndex]; // Select random talking animation
      console.log(`🎲 Random talking animation selected: ${animationState}`); // Log selected animation
    }
    
    console.log(`📤 Sending animation response: Primary=${animationState}, Secondary=${secondaryAnimation}`); // Log animation info

    console.log("Response received, length:", text.length); // Log response length

    // Clean text for TTS
    const cleanText = cleanTextForTTS(text); // Clean AI response for text-to-speech

    // === PIPELINE ===
    // 1. Generate gesture (commented out as per task requirements)
    // await execPromise(`py Text2gestures/generate_gesture.py"${cleanText}"`);
    
    // Read the generated gesture data (using empty gesture data as fallback)
    let gestureData = {};
    try {
      // const gestureBuffer = await fs.readFile("audios/gesture.json", "utf-8");
      // gestureData = JSON.parse(gestureBuffer);
      
      // Using empty gesture data as we've removed the Text2Gestures generation
      gestureData = {
        compressed: {
          bones: [], // Empty bones array
          frames: [] // Empty frames array
        }
      };
    } catch (e) {
      console.log("No gesture data found, using empty gesture data"); // Log if no gesture data found
      gestureData = {
        compressed: {
          bones: [], // Empty bones array
          frames: [] // Empty frames array
        }
      };
    }
    
    // 2. Generate TTS (Text-to-Speech)
    const tempTextFile = "audios/temp_text.txt"; // Temporary file for text input
    await fs.writeFile(tempTextFile, cleanText, "utf-8"); // Write cleaned text to file
    await execPromise(`py tts.py "${tempTextFile}"`); // Execute TTS script
    
    // 3. Convert to WAV format
    await execPromise(`..\\ffmpeg\\bin\\ffmpeg.exe -y -i audios/generated.mp3 audios/generated.wav`);
    
    // 4. Generate lip-sync data
    await execPromise(`..\\Rhubarb-Lip-Sync\\bin\\rhubarb.exe -f json -o audios\\generated.json audios\\generated.wav -r phonetic`);

    const subtitles = createLineByLineSubtitles(text, 100); // Create subtitles from AI response
    
    // Read the generated lip-sync JSON file
    const lipsyncData = await fs.readFile("audios/generated.json", "utf-8"); // Read lip-sync data
    const lipsync = JSON.parse(lipsyncData); // Parse lip-sync JSON

    // Read the generated MP3 file and convert to base64
    const audioBuffer = await readFile("audios/generated.mp3"); // Read audio file
    const audioBase64 = audioBuffer.toString('base64'); // Convert to base64 for transmission

    // Send response with all generated data
    res.json({
      success: true, // Indicate successful processing
      language: lang, // Include detected language
      text, // AI response text
      subtitles, // Subtitle lines for display
      audio: audioBase64, // Audio data in base64 format
      lipsync: lipsync, // Lip-sync data for animation
      gesture: gestureData  // Gesture data for animation
    });

  } catch (error) { // Handle any errors that occurred
    console.error("❌ Error:", error); // Log error
    res.status(500).json({ 
      success: false, // Indicate processing failure
      message: error.message, // Include error message
      // Provide a fallback response for better user experience
      text: "Sorry, I'm having trouble connecting to my AI brain right now. Please try again in a moment.",
      subtitles: ["Sorry, I'm having trouble connecting to my AI brain right now.", "Please try again in a moment."],
      audio: "", // Empty audio data
      lipsync: { mouthCues: [] }, // Empty lip-sync data
      gesture: { // Empty gesture data
        compressed: {
          bones: [], // Empty bones array
          frames: [] // Empty frames array
        }
      }
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
    // Check if Ollama is running by requesting model tags
    const ollamaResponse = await fetch("http://localhost:11434/api/tags", {
      method: "GET",
      timeout: 5000, // 5 second timeout
    });
    
    if (ollamaResponse.ok) { // Check if Ollama responded successfully
      const data = await ollamaResponse.json(); // Parse response data
      res.json({
        status: "healthy", // Indicate healthy status
        ollama: "connected", // Indicate Ollama connection
        models: data.models.map(m => m.name) // List available models
      });
    } else {
      res.status(500).json({
        status: "unhealthy", // Indicate unhealthy status
        ollama: "error", // Indicate Ollama error
        error: `Ollama API error: ${ollamaResponse.status}` // Include error details
      });
    }
  } catch (error) { // Handle connection errors
    res.status(500).json({
      status: "unhealthy", // Indicate unhealthy status
      ollama: "disconnected", // Indicate Ollama disconnection
      error: error.message // Include error message
    });
  }
});