import { useRef, useState } from "react"; // React hooks for refs and state
import { useChat } from "../hooks/useChat"; // Custom hook for chat functionality
import SentenceGestureMappingPanel from "./SentenceGestureMappingPanel";
import GestureAnnotationPanel from "./GestureAnnotationPanel";
import MLGestureResultPanel from "./MLGestureResultPanel";

// UI component that provides the user interface for interacting with the AI avatar
export const UI = ({ hidden, ...props }) => {
  const input = useRef(); // Ref to access the input element
  const { chat, loading, cameraZoomed, setCameraZoomed, message, persistentMessage, backendUrl } = useChat(); // Get chat functions and state from context
  const [isListening, setIsListening] = useState(false); // State to track speech recognition status
  const [recognition, setRecognition] = useState(null); // State to store speech recognition instance

  // Initialize speech recognition functionality
  const initSpeechRecognition = () => {
    // Check for browser support of SpeechRecognition API 
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) { // Check if SpeechRecognition is not supported
      alert("Speech recognition is not supported in your browser. Please try Chrome or Edge."); // Alert user about unsupported browser
      return null; // Return null if not supported
    }
    
    // Create new speech recognition instance
    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Stop recognition after first result
    recognition.interimResults = false; // Don't return interim results
    recognition.lang = 'id-ID'; // Set language to Indonesian (change if needed)
    
    // Event handler for when speech recognition has results
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript; // Extract transcript from results
      input.current.value = transcript; // Set input value to transcript
      setIsListening(false); // Stop listening state
    };
    
    // Event handler for speech recognition errors
    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error); // Log error
      setIsListening(false); // Stop listening state
    };
    
    // Event handler for when speech recognition ends
    recognition.onend = () => {
      setIsListening(false); // Stop listening state
    };
    
    return recognition; // Return initialized recognition instance
  };

  // Toggle speech recognition on/off
  const toggleSpeechRecognition = () => {
    if (isListening) { // If currently listening
      if (recognition) { // If recognition instance exists
        recognition.stop(); // Stop recognition
      }
      setIsListening(false); // Update listening state
    } else { // If not currently listening
      let rec = recognition; // Get existing recognition instance
      if (!rec) { // If no recognition instance exists
        rec = initSpeechRecognition(); // Initialize new recognition instance
        if (!rec) return; // Return if initialization failed
        setRecognition(rec); // Store recognition instance
      }
      rec.start(); // Start recognition
      setIsListening(true); // Update listening state
    }
  };

  // Send message function to process user input
  const sendMessage = () => {
    const text = input.current.value; // Get text from input element
    // Check if not loading, no current message, and text is not empty
    if (!loading && !message && text.trim()) {
      chat(text); // Send text to chat function
      input.current.value = ""; // Clear input field
    }
  };
  
  // Don't render UI if hidden prop is true
  if (hidden) {
    return null;
  }

  // Main UI rendering
  return (
    <>
      <SentenceGestureMappingPanel
        message={message}
        persistentMessage={persistentMessage}
        audioUrl={`${backendUrl}/audios/generated.mp3`}
        apiBaseUrl={`${backendUrl}/api`}
      />
      <GestureAnnotationPanel
        message={message}
        persistentMessage={persistentMessage}
        apiBaseUrl={`${backendUrl}/api`}
      />
      <MLGestureResultPanel
        message={message}
        persistentMessage={persistentMessage}
      />
      {/* Main UI container with flex layout */}
      <div className="fixed top-0 left-0 right-0 bottom-0 z-10 flex justify-between p-4 flex-col pointer-events-none">
        {/* Header section with virtual teacher info */}
        <div className="self-start backdrop-blur-md bg-white/80 p-4 rounded-xl shadow-lg">
          <h1 className="font-black text-xl text-gray-800">Guru Virtual</h1> {/* Virtual teacher title */}
          <p className="text-gray-600 font-medium">Nuraini Purwandari, S.T.,MMSI 📚</p> {/* Teacher name and credentials */}
        </div>
        
        {/* Right side controls */}
        <div className="w-full flex flex-col items-end justify-center gap-4">
          {/* Camera zoom toggle button */}
          <button
            onClick={() => setCameraZoomed(!cameraZoomed)} // Toggle camera zoom state
            className="pointer-events-auto bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white p-4 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105"
          >
            {/* Show different icons based on camera zoom state */}
            {cameraZoomed ? (
              // Zoom out icon
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6"
                />
              </svg>
            ) : (
              // Zoom in icon
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6"
                />
              </svg>
            )}
          </button>
          
          {/* Green screen toggle button */}
          <button
            onClick={() => {
              const body = document.querySelector("body"); // Get body element
              // Toggle greenScreen class on body for chroma key effect
              if (body.classList.contains("greenScreen")) {
                body.classList.remove("greenScreen");
              } else {
                body.classList.add("greenScreen");
              }
            }}
            className="pointer-events-auto bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white p-4 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105"
          >
            {/* Chroma key icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </button>
        </div>
        
        {/* Input section with text input and buttons */}
        <div className="flex items-center gap-3 pointer-events-auto max-w-2xl w-full mx-auto">
          {/* Text input field */}
          <input
            className="w-full placeholder:text-gray-600 placeholder:italic p-5 rounded-2xl bg-white/90 backdrop-blur-md shadow-lg border border-gray-200 focus:border-pink-300 focus:ring-2 focus:ring-pink-200 focus:outline-none transition-all duration-200"
            placeholder="Type a message..." // Placeholder text
            ref={input} // Attach ref to access input element
            onKeyDown={(e) => {
              // Send message when Enter key is pressed
              if (e.key === "Enter") {
                sendMessage();
              }
            }}
          />
          
          {/* Speech recognition button */}
          <button
            onClick={toggleSpeechRecognition} // Toggle speech recognition
            className={`p-5 rounded-2xl shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center justify-center ${
              isListening 
                ? "bg-red-500 hover:bg-red-600 text-white" // Red when listening
                : "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white" // Blue when not listening
            }`}
          >
            {/* Show different icons based on listening state */}
            {isListening ? (
              // Stop recording icon
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            ) : (
              // Start recording icon
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>
          
          {/* Send message button */}
          <button
            disabled={loading || message} // Disable when loading or message is being processed
            onClick={sendMessage} // Send message on click
            className={`bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white p-5 px-8 font-semibold uppercase rounded-2xl shadow-lg transition-all duration-200 transform hover:scale-105 ${
              loading || message ? "cursor-not-allowed opacity-50" : "" // Reduce opacity when disabled
            }`}
          >
            Send
          </button>
        </div>
      </div>
    </>
  );
};
