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

      // console.log("Response status:", replyRes.status); // Log HTTP response status
      // console.log("Response headers:", [...replyRes.headers.entries()]); // Log response headers

      if (!replyRes.ok) { // Check if HTTP response is not successful
        throw new Error(`HTTP error! status: ${replyRes.status}`); // Throw error with status code
      }
      
      const replyData = await replyRes.json(); // Parse JSON response from backend
      
      console.log("Response data:", replyData); // Log response data
      
      if (!replyData.success) { // Check if backend processing was unsuccessful
        throw new Error(replyData.message || "Failed to get response"); // Throw error with message
      }
      
      const replyText = replyData.text; // Extract AI response text
      const subtitles = replyData.subtitles || [replyText];

      // Log gesture labels for debugging
      console.log("Gesture labels:", replyData.gestureLabels);
      
      // Validate gesture labels
      if (replyData.gestureLabels && !Array.isArray(replyData.gestureLabels)) {
        console.warn("Invalid gesture labels format, expected array. Clearing gestureLabels and letting frontend fallback.");
        replyData.gestureLabels = [];
      }
      
      // Add the response to the messages queue
      setMessages((prev) => [
        ...prev,
        {
          text: replyText, // AI response text
          subtitles: subtitles, // Subtitle lines for display
          facialExpression: "neutral", // Default facial expression
          audio: replyData.audio || "", // Audio data in base64 format
          lipsync: replyData.lipsync || { mouthCues: [] }, // Lip-sync data for mouth animation
          gestureLabels: replyData.gestureLabels || [], // Gesture labels for body animation
          audioDuration: replyData.audioDuration || 0 // Audio duration for loop calculation
        },
      ]);
    } catch (err) { // Handle any errors that occurred
      console.error("TTS or LLM ERROR:", err); // Log error
      // Add error message to the messages queue
      setMessages((prev) => [
        ...prev,
        {
          text: `Error: ${err.message}`, // Error message text
          subtitles: [`Error: ${err.message}`], // Error message as subtitle
          facialExpression: "neutral", // Neutral facial expression for error
          audio: "", // No audio for error
          lipsync: { mouthCues: [] }, // Empty lip-sync data for error
          gestureLabels: ['Idle'], // Default gesture labels for error
          audioDuration: 0 // No audio duration for error
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