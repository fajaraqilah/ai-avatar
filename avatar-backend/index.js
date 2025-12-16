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

// Add greeting detection function
function isGreeting(text) {
  const greetingWords = ["hai", "halo", "hello", "hi", "assalam", "assalamu", "selamat pagi", "selamat siang"];
  const lowerText = text.toLowerCase().trim();
  return greetingWords.some(word => lowerText.includes(word));
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
            model: "gemma:2b", // Specify AI model - using gemma:2b (faster than tinyllama)
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

    console.log("Response received, length:", text.length); // Log response length

    // Clean text for TTS
    const cleanText = cleanTextForTTS(text); // Clean AI response for text-to-speech
    
    // === Gesture classification (Rule-based override first, then ML-based) ===
    let gestureLabels = [];
    let rulesTriggered = false;
    let rawClassifierOutput = null;
    
    try {
      // 1. Check for greeting rule-based override first
      if (isGreeting(userMsg)) {
        gestureLabels = ["Greeting"];
        rulesTriggered = true;
        console.log('Rule-based greeting detection triggered');
      } else {
        // 2. Use ML-based classifier with original user input
        const classifierTextFile = "audios/temp_text_for_classifier.txt";
        await fs.writeFile(classifierTextFile, userMsg, "utf-8"); // Use userMsg instead of cleanText
        // call python classifier
        const classifierCmd = `py textClassifier.py --file "${classifierTextFile}"`;
        const classifierOutput = await execPromise(classifierCmd);
        try {
          const parsed = JSON.parse(classifierOutput.trim());
          rawClassifierOutput = parsed;
          if (parsed && Array.isArray(parsed.predictions) && parsed.predictions.length > 0) {
            // Filter by confidence threshold
            const confidentPredictions = parsed.predictions.filter(p => p.confidence >= 0.40);
            
            if (confidentPredictions.length > 0) {
              gestureLabels = [confidentPredictions[0].label]; // Take only the highest confidence label
            } else {
              // Fallback to highest confidence prediction or "normal"
              gestureLabels = [parsed.predictions[0].label];
            }
          } else {
            // Fallback if no predictions
            gestureLabels = ["normal"];
          }
        } catch (e) {
          console.log('Could not parse classifier output', e.message);
          // Fallback on parsing error
          gestureLabels = ["normal"];
        }
      }
    } catch (classifierErr) {
      console.log('Classifier call failed:', classifierErr.message);
      // Fallback on classifier failure
      gestureLabels = ["normal"];
    }

    // === PIPELINE ===
    // 1. Generate TTS (Text-to-Speech) FIRST to get duration
    const tempTextFile = "audios/temp_text.txt"; // Temporary file for text input
    await fs.writeFile(tempTextFile, cleanText, "utf-8"); // Write cleaned text to file
    // Removed Python TTS script call since we're using a fully Mixamo-based system
    await execPromise(`py tts.py "${tempTextFile}"`); // Execute TTS script
    
    // 2. Convert to WAV format
    try {
      await execPromise(`..\\ffmpeg\\bin\\ffmpeg.exe -y -i audios/generated.mp3 audios/generated.wav`);
    } catch (conversionError) {
      console.log("Warning: Could not convert audio file, may affect lip-sync");
    }
    
    // 3. Get audio duration using ffprobe
    let audioDuration = 3.0; // Default duration
    try {
      const durationOutput = await execPromise(`..\\ffmpeg\\bin\\ffprobe.exe -v quiet -show_entries format=duration -of csv=p=0 audios/generated.wav`);
      audioDuration = parseFloat(durationOutput.trim()) || 3.0;
      console.log(`Audio duration: ${audioDuration} seconds`);
    } catch (durationError) {
      console.log("Could not determine audio duration, using default of 3.0 seconds");
    }
  
    // 5. Generate lip-sync data
    try {
      await execPromise(`..\\Rhubarb-Lip-Sync\\bin\\rhubarb.exe -f json -o audios\\generated.json audios\\generated.wav`);
    } catch (lipsyncError) {
      console.log("Warning: Could not generate lip-sync data");
    }

    const subtitles = createLineByLineSubtitles(text, 100); // Create subtitles from AI response
    
    // Read the generated lip-sync JSON file
    let lipsync = { mouthCues: [] }; // Default empty lip-sync data
    try {
      const lipsyncData = await fs.readFile("audios/generated.json", "utf-8"); // Read lip-sync data
      lipsync = JSON.parse(lipsyncData); // Parse lip-sync JSON
    } catch (lipsyncReadError) {
      console.log("Warning: Could not read lip-sync data file");
    }

    // Read the generated MP3 file and convert to base64
    let audioBase64 = ""; // Default empty audio
    try {
      const audioBuffer = await readFile("audios/generated.mp3"); // Read audio file
      audioBase64 = audioBuffer.toString('base64'); // Convert to base64 for transmission
    } catch (audioReadError) {
      console.log("Warning: Could not read audio file");
    }

    // Send response with all generated data
    res.json({
      success: true, // Indicate successful processing
      language: lang, // Include detected language
      text, // AI response text
      subtitles, // Subtitle lines for display
      audio: audioBase64, // Audio data in base64 format
      lipsync: lipsync, // Lip-sync data for animation
      gestureLabels: gestureLabels, // Gesture labels predicted by classifier
      audioDuration // Audio duration for loop calculation
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
      const out = await execPromise(`py textClassifier.py --file "${classifierTextFile}"`);
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
      const out = await execPromise(`py textClassifier.py --file "${classifierTextFile}"`);
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