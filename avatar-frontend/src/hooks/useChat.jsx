import { createContext, useContext, useEffect, useState } from "react"; // React hooks for state and context

const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:3000"; // Get backend URL from environment variables or use default

const ChatContext = createContext(); // Create context for chat functionality

// Chat provider component that manages chat state and functions
export const ChatProvider = ({ children }) => { 
  const [userInput, setUserInput] = useState(""); // State to track user input for display purposes
  
  // Main chat function that sends user message to backend and processes response
  const chat = async (message) => { 
    // Store the user's input for display purposes
    setUserInput(message);
    
    setLoading(true); // Set loading state to true while processing

    try {
      // Send user message to backend: Ollama + TTS + Rhubarb + Gesture AI
      const replyRes = await fetch(`${backendUrl}/chat`, {
        method: "POST", // HTTP POST method
        headers: { "Content-Type": "application/json" }, // Set JSON content type
        body: JSON.stringify({ message }), // Send user message in request body
      });

      console.log("Response status:", replyRes.status); // Log HTTP response status
      console.log("Response headers:", [...replyRes.headers.entries()]); // Log response headers

      if (!replyRes.ok) { // Check if HTTP response is not successful
        throw new Error(`HTTP error! status: ${replyRes.status}`); // Throw error with status code
      }
      
      const replyData = await replyRes.json(); // Parse JSON response from backend
      
      console.log("Response data:", replyData); // Log response data
      
      if (!replyData.success) { // Check if backend processing was unsuccessful
        throw new Error(replyData.message || "Failed to get response"); // Throw error with message
      }
      
      const replyText = replyData.text; // Extract AI response text
      const subtitles = replyData.subtitles || [replyText]; // Extract subtitles or use response text

      // Determine animation based on user message keywords (similar to backend logic)
      let selectedAnimation = "Idle"; // Default primary animation
      let secondaryAnimation = null; // No secondary animation by default
      
      // Define keywords for double animations using actual available animations
      const doubleAnimationKeywords = {
        "angry": ["Angry", "Talking_1"],
        "furious": ["Angry", "Talking_1"],
        "cry": ["Crying", "Talking_2"],
        "sad": ["Crying", "Talking_2"],
        "upset": ["Crying", "Talking_2"],
        "hello": ["Greeting", "Talking_1"],
        "hi": ["Greeting", "Talking_1"],
        "greet": ["Greeting", "Talking_1"],
        "greetings": ["Greeting", "Talking_1"],
        "laugh": ["Laughing", "Talking_4"],
        "funny": ["Laughing", "Talking_4"],
        "haha": ["Laughing", "Talking_4"],
        "lol": ["Laughing", "Talking_4"],
        "dance": ["Rumba", "Idle"],
        "rumba": ["Rumba", "Idle"],
        "terrified": ["Terrified", "Talking_5"],
        "scared": ["Terrified", "Talking_5"],
        "afraid": ["Terrified", "Talking_5"],
        "wave": ["Waving", "Talking_1"],
        "goodbye": ["Waving", "Talking_1"],
        "bye": ["Waving", "Talking_1"],
        "see you": ["Waving", "Talking_1"],
        "explain": ["Talking_1", "Idle"],
        "teach": ["Talking_1", "Idle"],
        "tell me": ["Talking_1", "Idle"],
        "what is": ["Talking_1", "Idle"],
        "how to": ["Talking_1", "Idle"],
        "why": ["Talking_1", "Idle"],
        "when": ["Talking_1", "Idle"],
        "where": ["Talking_1", "Idle"],
        "who": ["Talking_1", "Idle"],
        "how": ["Talking_1", "Idle"]
      };
      
      // Check if user message contains any double animation keywords
      const lowerUserMsg = message.toLowerCase(); // Convert message to lowercase for case-insensitive matching
      for (const [keyword, animations] of Object.entries(doubleAnimationKeywords)) { // Iterate through keyword mappings
        if (lowerUserMsg.includes(keyword)) { // Check if message contains keyword
          selectedAnimation = animations[0]; // Set primary animation
          secondaryAnimation = animations[1]; // Set secondary animation
          console.log(`🎯 Double animation triggered: ${keyword} -> Primary: ${selectedAnimation}, Secondary: ${secondaryAnimation}`); // Log triggered animations
          break; // Exit loop after first match
        }
      }
      
      // If no keyword matched but there's a message, use a random talking animation
      if (message.trim() && selectedAnimation === "Idle" && !secondaryAnimation) { // Check if message exists but no animations were triggered
        const talkingAnimations = ["Talking_0", "Talking_1", "Talking_2", "Talking_1", "Talking_4", "Talking_5", "Talking_6", "Talking_7"];
        const randomIndex = Math.floor(Math.random() * talkingAnimations.length); // Generate random index
        selectedAnimation = talkingAnimations[randomIndex]; // Select random talking animation
        console.log(`🎲 Random talking animation selected: ${selectedAnimation}`); // Log selected animation
      }

      // Add the response to the messages queue
      setMessages((prev) => [
        ...prev,
        {
          text: replyText, // AI response text
          subtitles: subtitles, // Subtitle lines for display
          animation: selectedAnimation, // Primary animation to play
          secondaryAnimation: secondaryAnimation, // Secondary animation to play
          facialExpression: "neutral", // Default facial expression
          audio: replyData.audio || "", // Audio data in base64 format
          lipsync: replyData.lipsync || { mouthCues: [] }, // Lip-sync data for mouth animation
          gesture: replyData.gesture || { compressed: { bones: [], frames: [] } } // Gesture data for body animation
        },
      ]);
    } catch (err) { // Handle any errors that occurred
      console.error("TTS or LLM ERROR:", err); // Log error
      // Display error to user
      // Determine animation based on user message keywords (similar to backend logic)
      let selectedAnimation = "Idle"; // Default primary animation
      let secondaryAnimation = null; // No secondary animation by default
      
      // Define keywords for double animations using actual available animations
      const doubleAnimationKeywords = {
        "angry": ["Angry", "Talking_1"],
        "furious": ["Angry", "Talking_1"],
        "cry": ["Crying", "Talking_2"],
        "sad": ["Crying", "Talking_2"],
        "upset": ["Crying", "Talking_2"],
        "hello": ["Greeting", "Talking_1"],
        "hi": ["Greeting", "Talking_1"],
        "greet": ["Greeting", "Talking_1"],
        "greetings": ["Greeting", "Talking_1"],
        "laugh": ["Laughing", "Talking_4"],
        "funny": ["Laughing", "Talking_4"],
        "haha": ["Laughing", "Talking_4"],
        "lol": ["Laughing", "Talking_4"],
        "dance": ["Rumba", "Idle"],
        "rumba": ["Rumba", "Idle"],
        "terrified": ["Terrified", "Talking_5"],
        "scared": ["Terrified", "Talking_5"],
        "afraid": ["Terrified", "Talking_5"],
        "wave": ["Waving", "Talking_1"],
        "goodbye": ["Waving", "Talking_1"],
        "bye": ["Waving", "Talking_1"],
        "see you": ["Waving", "Talking_1"],
        "explain": ["Talking_1", "Idle"],
        "teach": ["Talking_1", "Idle"],
        "tell me": ["Talking_1", "Idle"],
        "what is": ["Talking_1", "Idle"],
        "how to": ["Talking_1", "Idle"],
        "why": ["Talking_1", "Idle"],
        "when": ["Talking_1", "Idle"],
        "where": ["Talking_1", "Idle"],
        "who": ["Talking_1", "Idle"],
        "how": ["Talking_1", "Idle"]
      };
      
      // Check if user message contains any double animation keywords
      const lowerUserMsg = userInput.toLowerCase(); // Convert stored user input to lowercase
      for (const [keyword, animations] of Object.entries(doubleAnimationKeywords)) { // Iterate through keyword mappings
        if (lowerUserMsg.includes(keyword)) { // Check if message contains keyword
          selectedAnimation = animations[0]; // Set primary animation
          secondaryAnimation = animations[1]; // Set secondary animation
          console.log(`🎯 Double animation triggered: ${keyword} -> Primary: ${selectedAnimation}, Secondary: ${secondaryAnimation}`); // Log triggered animations
          break; // Exit loop after first match
        }
      }
      
      // If no keyword matched but there's a message, use a random talking animation
      if (userInput.trim() && selectedAnimation === "Idle" && !secondaryAnimation) { // Check if message exists but no animations were triggered
        const talkingAnimations = ["Talking_0", "Talking_1", "Talking_2", "Talking_1", "Talking_4", "Talking_5", "Talking_6", "Talking_7"];
        const randomIndex = Math.floor(Math.random() * talkingAnimations.length); // Generate random index
        selectedAnimation = talkingAnimations[randomIndex]; // Select random talking animation
        console.log(`🎲 Random talking animation selected: ${selectedAnimation}`); // Log selected animation
      }
      
      // Add error message to the messages queue
      setMessages((prev) => [
        ...prev,
        {
          text: `Error: ${err.message}`, // Error message text
          subtitles: [`Error: ${err.message}`], // Error message as subtitle
          animation: selectedAnimation, // Primary animation for error
          secondaryAnimation: secondaryAnimation, // Secondary animation for error
          facialExpression: "neutral", // Neutral facial expression for error
          audio: "", // No audio for error
          lipsync: { mouthCues: [] }, // Empty lip-sync data for error
          gesture: { compressed: { bones: [], frames: [] } } // Empty gesture data for error
        },
      ]);
    }

    setLoading(false); // Set loading state to false after processing
  };

  const [messages, setMessages] = useState([]); // State to store message queue
  const [message, setMessage] = useState(); // State to store current message being processed
  const [loading, setLoading] = useState(false); // State to track loading status
  const [cameraZoomed, setCameraZoomed] = useState(true); // State to track camera zoom status
  
  // Function called when a message finishes playing
  const onMessagePlayed = () => { 
    setMessages((messages) => messages.slice(1)); // Remove the first message from queue
  };

  // Effect to update current message when messages queue changes
  useEffect(() => { 
    if (messages.length > 0) { // Check if there are messages in queue
      setMessage(messages[0]); // Set first message as current message
    } else { 
      setMessage(null); // Clear current message if queue is empty
    } 
  }, [messages]); // Run effect when messages queue changes

  // Provide chat context values to child components
  return ( 
    <ChatContext.Provider value={{ 
      chat, // Chat function
      message, // Current message
      onMessagePlayed, // Function called when message finishes playing
      loading, // Loading status
      cameraZoomed, // Camera zoom status
      setCameraZoomed, // Function to update camera zoom status
      userInput, // User input text
      setUserInput // Function to update user input text
    }} > 
      {children} // Render child components
    </ChatContext.Provider> 
  ); 
};

// Custom hook to use chat context in components
export const useChat = () => { 
  const context = useContext(ChatContext); // Get chat context
  if (!context) { // Check if used outside ChatProvider
    throw new Error("useChat must be used within a ChatProvider"); // Throw error if used incorrectly
  } 
  return context; // Return chat context
};