import {
  CameraControls, // Control camera movement and positioning
  ContactShadows, // Render contact shadows for objects touching the ground
  Environment, // Set environment lighting and reflections
  Html, // Render HTML elements in 3D space
  Text, // Render 3D text
  useGLTF, // Load GLTF 3D models
} from "@react-three/drei"; // Collection of useful components for React Three Fiber
import { Suspense, useEffect, useRef, useState, memo } from "react"; // React hooks
import { useChat } from "../hooks/useChat"; // Custom hook for chat functionality
import { Avatar } from "./Avatar"; // Teacher avatar component
import { AvatarStudent } from "./AvatarStudent"; // Student avatar component
import { a, useSpring } from "@react-spring/three"; // Animation library for Three.js

// Component to display loading dots animation above teacher avatar
const Dots = (props) => {
  const { loading } = useChat(); // Get loading state from chat context
  const [loadingText, setLoadingText] = useState(""); // State for loading text animation
  
  // Effect to create animated loading dots
  useEffect(() => {
    if (loading) { // Only run when loading is true
      // Set interval to update loading text with dots
      const interval = setInterval(() => {
        setLoadingText((loadingText) => {
          if (loadingText.length >= 3) { // Reset to empty after 3 dots
            return "";
          }
          return loadingText + "."; // Add a dot
        });
      }, 500); // Update every 500ms
      return () => clearInterval(interval); // Cleanup interval on unmount
    } else {
      setLoadingText(""); // Clear text when not loading
    }
  }, [loading]); // Run effect when loading state changes
  
  if (!loading) return null; // Don't render when not loading
  
  // Render animated dots as 3D text
  return (
    <group {...props}> {/* Position and transform group */}
      <Text 
        fontSize={0.15} 
        anchorX={"center"} 
        anchorY={"middle"}
        color="#ffffff"
      >
        {loadingText} {/* Display animated dots */}
        <meshBasicMaterial attach="material" color="#ffffff" /> {/* White material */}
      </Text>
    </group>
  );
};

// Typewriter subtitle component for real-time display of AI responses
const TypewriterSubtitle = memo(({ message, fontSize = "medium" }) => {
  const subtitles = message?.subtitles || []; // Get subtitles from message
  const [displayText, setDisplayText] = useState(""); // State for currently displayed text
  const [lineIndex, setLineIndex] = useState(0); // State for current line index
  const [charIndex, setCharIndex] = useState(0); // State for current character index
  const [isComplete, setIsComplete] = useState(false); // State for completion status

  // Refs for timers and current values to avoid stale closures
  const timerRef = useRef(null); // Ref for timer ID
  const subtitlesRef = useRef(subtitles); // Ref for current subtitles

  // Keep refs in sync with state
  useEffect(() => { subtitlesRef.current = subtitles; }, [subtitles]);

  // Reset when the overall message object changes (new response)
  useEffect(() => {
    // reset indices and displayed text
    setDisplayText("");
    setLineIndex(0);
    setCharIndex(0);
    setIsComplete(false);

    // clear any pending timers
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [message]); // triggers when message changes

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Helper: typing step function (runs schedule loop)
  useEffect(() => {
    // If no subtitles, nothing to do
    if (!subtitlesRef.current || subtitlesRef.current.length === 0) {
      setDisplayText("");
      return;
    }

    // Clear existing timer to avoid duplicates
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Check if we've displayed all lines
    if (isComplete) {
      // Clear text after 3 seconds when all text is displayed
      timerRef.current = setTimeout(() => {
        setDisplayText("");
        setIsComplete(false);
      }, 3000);
      return;
    }

    // Get current line
    const currentLineIndex = Math.min(lineIndex, subtitlesRef.current.length - 1);
    const currentLine = subtitlesRef.current[currentLineIndex] || "";
    
    // Typing phase
    if (charIndex < currentLine.length) {
      timerRef.current = setTimeout(() => {
        setCharIndex(prev => {
          const next = prev + 1;
          // Build display text with all previous lines plus current line progress
          let newDisplayText = "";
          for (let i = 0; i < currentLineIndex; i++) {
            newDisplayText += subtitlesRef.current[i] + " ";
          }
          newDisplayText += currentLine.slice(0, next);
          setDisplayText(newDisplayText);
          return next;
        });
      }, 10); // typing speed (ms) - faster typing
      return;
    }

    // Finished typing current line
    if (charIndex === currentLine.length && currentLine.length > 0) {
      // Check if this is the last line
      const isLastLine = currentLineIndex >= subtitlesRef.current.length - 1;
      
      if (isLastLine) {
        // Mark as complete but don't clear text yet
        setIsComplete(true);
      } else {
        // Move to next line after pause
        timerRef.current = setTimeout(() => {
          setLineIndex(prev => prev + 1);
          setCharIndex(0);
        }, 1000); // pause at end of line (ms) - shorter pause
      }
      return;
    }
  }, [
    // include these so effect re-runs when any of them change
    lineIndex, charIndex, message, isComplete
  ]);

  // Get CSS class for font size based on prop
  const getFontSizeClass = () => {
    switch (fontSize) {
      case "small": return "text-sm";
      case "large": return "text-lg";
      case "extra-large": return "text-xl";
      default: return "text-base";
    }
  };

  // Render typewriter text with animated cursor
  return (
    <div className={`${getFontSizeClass()} leading-relaxed min-h-[4.5rem]`}>
      {displayText} {/* Display typed text */}
      <span className="inline-block w-2 h-5 bg-white ml-1 animate-pulse" /> {/* Animated cursor */}
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if the message.text or subtitles array changed content or fontSize changed
  const prevSubs = prevProps.message?.subtitles || [];
  const nextSubs = nextProps.message?.subtitles || [];
  const subsEqual = prevSubs.length === nextSubs.length && prevSubs.every((s, i) => s === nextSubs[i]);
  return prevProps.message?.text === nextProps.message?.text &&
         subsEqual &&
         prevProps.fontSize === nextProps.fontSize;
});

// New component to display user input subtitles above AvatarStudent
const UserInputSubtitle = memo((props) => {
  const { userInput } = useChat(); // Get user input from chat context
  const [subtitle, setSubtitle] = useState(""); // State for subtitle text

  // Animation for fade in/out effect
  const fade = useSpring({
    opacity: subtitle ? 1 : 0, // Fully opaque when subtitle exists, transparent otherwise
    scale: subtitle ? 1 : 0.9, // Normal scale when subtitle exists, slightly smaller otherwise
    config: { tension: 120, friction: 15 }, // Animation configuration
  });

  // Effect to handle subtitle display timing
  useEffect(() => {
    if (userInput) { // When user input exists
      setSubtitle(userInput); // Set subtitle to user input

      // Clear subtitle after 8 seconds
      const timer = setTimeout(() => setSubtitle(""), 8000);
      return () => clearTimeout(timer); // Cleanup timer on unmount
    }
  }, [userInput]); // Run effect when user input changes

  if (!subtitle) return null; // Don't render when no subtitle

  // Render subtitle as 3D board with text
  return (
    <a.group {...props} {...fade}> {/* Animated group with fade properties */}
      {/* Calm board design with soft edges */}
      <mesh position={[0, 0, -0.02]}> {/* Position slightly behind text */}
        <planeGeometry args={[Math.min(1.6 + subtitle.length * 0.02, 3), 0.5]} /> {/* Dynamic width based on text length */}
        <meshStandardMaterial
          color="#e2e8f0" // Light gray-blue background
          transparent
          opacity={0.9} // Slightly transparent
          roughness={0.9} // Matte finish
          metalness={0.05} // Minimal metallic effect
        />
      </mesh>

      {/* Subtle border */}
      <mesh position={[0, 0, -0.01]}> {/* Position between background and text */}
        <planeGeometry args={[Math.min(1.6 + subtitle.length * 0.02, 3) * 1.02, 0.52]} /> {/* Slightly larger than background */}
        <meshBasicMaterial color="#cbd5e0" transparent opacity={0.3} /> {/* Light border */}
      </mesh>

      {/* Smaller, calmer text */}
      <Text
        fontSize={0.08} // Small font size for subtlety
        anchorX="center"
        anchorY="middle"
        color="#334155" // Dark slate text color
        maxWidth={2.6} // Maximum width before wrapping
        lineHeight={1.2} // Line height for readability
      >
        {subtitle} {/* Display user input */}
      </Text>
    </a.group>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memo - only re-render when position changes
  return prevProps.position[0] === nextProps.position[0] &&
         prevProps.position[1] === nextProps.position[1] &&
         prevProps.position[2] === nextProps.position[2];
});

// Separate component for the board content to prevent unnecessary re-renders
const BoardContent = memo(({ message, fontSize }) => {
  // Get CSS class for font size based on prop
  const getFontSizeClass = () => {
    switch (fontSize) {
      case "small": return "text-sm";
      case "large": return "text-lg";
      case "extra-large": return "text-xl";
      default: return "text-base";
    }
  };

  // Render board content based on message state
  return (
    <div className={`${getFontSizeClass()} leading-relaxed min-h-[4.5rem]`}>
      {message?.subtitles ? ( // If subtitles exist
        <div>
          {message.subtitles.map((subtitle, index) => ( // Map through subtitles
            <div key={index}>{subtitle}</div> // Display each subtitle line
          ))}
        </div>
      ) : message?.text ? ( // If only text exists
        <p>{message.text}</p> // Display text
      ) : ( // If no content
        <p className="italic text-gray-400">Waiting for response...</p> // Show waiting message
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if message content actually changed
  return prevProps.message?.text === nextProps.message?.text &&
         prevProps.fontSize === nextProps.fontSize &&
         JSON.stringify(prevProps.message?.subtitles) === JSON.stringify(nextProps.message?.subtitles);
});

// Main Experience component that orchestrates the 3D scene
export const Experience = () => {
  const cameraControls = useRef(); // Ref for camera controls
  const { cameraZoomed, message, audio, onMessagePlayed } = useChat(); // Get chat state and functions

  const { scene: ruangKelas } = useGLTF("/models/classroom_default.glb"); // Load classroom model

  // Board settings state for interactive board customization
  const [boardSettings, setBoardSettings] = useState({
    fontSize: "medium", // Default font size
    backgroundColor: "dark", // Default background color
    position: "center", // Default position
    visible: true // Board visibility
  });

  // Initial camera setup effect
  useEffect(() => {
    cameraControls.current.setLookAt(0, 2, 5, 0, 1.5, 0); // Set initial camera position and target
  }, []); // Run once on mount

  // Camera zoom effect
  useEffect(() => {
    if (cameraZoomed) { // When zoomed in
      cameraControls.current.setLookAt(0, 1.5, 2.0, 0, 1.5, 0, true); // Zoom in to teacher
    } else { // When zoomed out
      cameraControls.current.setLookAt(0, 2.2, 5, 0, 1.0, 0, true); // Zoom out to classroom view
    }
  }, [cameraZoomed]); // Run when cameraZoomed changes

  // Toggle board visibility
  const toggleBoard = () => {
    setBoardSettings(prev => ({
      ...prev,
      visible: !prev.visible // Toggle visibility
    }));
  };

  // Change font size
  const changeFontSize = (size) => {
    setBoardSettings(prev => ({
      ...prev,
      fontSize: size // Update font size
    }));
  };

  // Change background style
  const changeBackground = (style) => {
    setBoardSettings(prev => ({
      ...prev,
      backgroundColor: style // Update background style
    }));
  };

  // Change position
  const changePosition = (pos) => {
    setBoardSettings(prev => ({
      ...prev,
      position: pos // Update position
    }));
  };

  // Get background style CSS classes based on settings
  const getBackgroundStyle = () => {
    switch (boardSettings.backgroundColor) {
      case "light": return "bg-white/80 text-gray-800"; // Light background
      case "transparent": return "bg-transparent/50 text-white backdrop-blur-sm"; // Transparent background
      default: return "bg-black/70 text-white"; // Dark background (default)
    }
  };

  // Get position CSS classes based on settings
  const getPositionClasses = () => {
    switch (boardSettings.position) {
      case "top": return "top-20 left-1/2 transform -translate-x-1/2"; // Top center
      case "bottom": return "bottom-32 left-1/2 transform -translate-x-1/2"; // Bottom center
      case "left": return "left-10 top-1/2 transform -translate-y-1/2"; // Left middle
      case "right": return "right-10 top-1/2 transform -translate-y-1/2"; // Right middle
      default: return "top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"; // Center (default)
    }
  };

  // Handle audio ended event
  useEffect(() => {
    if (!audio) return; // Return if no audio

    const handleAudioEnded = () => {
      onMessagePlayed(); // Call when audio finishes
    };

    audio.addEventListener('ended', handleAudioEnded); // Add event listener

    return () => {
      audio.removeEventListener('ended', handleAudioEnded); // Cleanup listener
    };
  }, [audio, onMessagePlayed]); // Run when audio or onMessagePlayed changes

  // Main render function for the 3D experience
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} /> {/* Soft ambient light */}
      <directionalLight position={[3, 5, 2]} intensity={1} /> {/* Directional light for shadows */}
      
      {/* Camera controls */}
      <CameraControls ref={cameraControls} /> {/* Attach camera controls */}
      
      {/* Environment */}
      <Environment preset="sunset" /> {/* Set environment preset */}
      
      {/* Classroom model */}
      <primitive object={ruangKelas} scale={0.8} position={[0, 0, 1]} /> {/* Render classroom */}

      <Suspense fallback={null}> {/* Suspend rendering until models load */}
        {/* Loading indicator above teacher avatar */}
        <Dots position={[-1.0, 1.9, -1.1]} rotation={[0, 0.3, 0]} />
        
        {/* User input subtitle above student avatar */}
        <UserInputSubtitle position={[1.5, 1.5, 2.6]} />

        {/* Interactive Board */}
        {boardSettings.visible ? ( // Only render when visible
          <Html
            position={[0.15, 1.5, -1]} // Position in 3D space
            transform
            distanceFactor={1.5} // Scale based on distance
            occlude // Hide when obstructed
          >
            <div className={`fixed ${getPositionClasses()} z-20 transition-all duration-300`}>
              {/* Board Controls */}
              <div className="absolute -top-12 right-0 flex gap-2">
                <button
                  onClick={toggleBoard} // Toggle board visibility
                  className="bg-red-500 text-white p-2 rounded-full shadow-md hover:bg-red-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> {/* Close icon */}
                  </svg>
                </button>
              </div>

              {/* Main Board */}
              <div className={`${getBackgroundStyle()} rounded-xl shadow-2xl p-6 w-[500px] max-w-[90vw] backdrop-blur-md border border-white/20`}>
                {/* Board Header with Settings */}
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/20">
                  <h3 className="font-bold text-lg">Virtual Board</h3> {/* Board title */}
                  <div className="flex gap-2">
                    {/* Font size controls */}
                    <button 
                      onClick={() => changeFontSize("small")} // Set small font
                      className={`text-xs px-2 py-1 rounded ${boardSettings.fontSize === "small" ? "bg-white/30" : "bg-white/10"}`}
                    >
                      S
                    </button>
                    <button 
                      onClick={() => changeFontSize("medium")} // Set medium font
                      className={`text-sm px-2 py-1 rounded ${boardSettings.fontSize === "medium" ? "bg-white/30" : "bg-white/10"}`}
                    >
                      M
                    </button>
                    <button 
                      onClick={() => changeFontSize("large")} // Set large font
                      className={`text-lg px-2 py-1 rounded ${boardSettings.fontSize === "large" ? "bg-white/30" : "bg-white/10"}`}
                    >
                      L
                    </button>
                  </div>
                </div>

                {/* Subtitle Content */}
                <BoardContent message={message} fontSize={boardSettings.fontSize} />

                {/* Board Footer with Options */}
                <div className="flex justify-between mt-20 pt-2 border-t border-white/20">
                  <div className="flex gap-2">
                    {/* Background color options */}
                    <button 
                      onClick={() => changeBackground("dark")} // Set dark background
                      className={`w-6 h-6 rounded-full ${boardSettings.backgroundColor === "dark" ? "ring-2 ring-white" : ""}`}
                      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
                      title="Dark background"
                    />
                    <button 
                      onClick={() => changeBackground("light")} // Set light background
                      className={`w-6 h-6 rounded-full ${boardSettings.backgroundColor === "light" ? "ring-2 ring-white" : ""}`}
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)' }}
                      title="Light background"
                    />
                    <button 
                      onClick={() => changeBackground("transparent")} // Set transparent background
                      className={`w-6 h-6 rounded-full ${boardSettings.backgroundColor === "transparent" ? "ring-2 ring-white" : ""}`}
                      style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
                      title="Transparent background"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Html>
        ) : (
          // Show minimized board button when board is hidden
          <Html position={[0.15, 1.5, -1]} transform distanceFactor={1.5} occlude>
            <div className="fixed top-4 right-4 z-20">
              <button
                onClick={toggleBoard} // Toggle board visibility
                className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-3 rounded-full shadow-lg hover:from-pink-600 hover:to-purple-700 transition-all duration-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> {/* Document icon */}
                </svg>
              </button>
            </div>
          </Html>
        )}
      </Suspense>
      
      {/* Avatars */}
      <Avatar position={[-1, 0, -1]} rotation={[0, 0.3, 0]}/>  {/* Render teacher avatar */}
      <AvatarStudent  position={[1.5, 0, 2.6]} rotation={[0, 3, 0]} /> {/* Render student avatar */}
      
      {/* Contact shadows */}
      <ContactShadows opacity={0.7} /> {/* Render contact shadows for realism */}
    </>
  );
};