import {
  CameraControls,
  ContactShadows,
  Environment,
  Html,
  Text,
  useGLTF,
} from "@react-three/drei";
import { Suspense, useEffect, useRef, useState, memo } from "react";
import { useChat } from "../hooks/useChat";
import { Avatar } from "./Avatar";
import { AvatarStudent } from "./AvatarStudent";
import { a, useSpring } from "@react-spring/three";

const Dots = (props) => {
  const { loading } = useChat();
  const [loadingText, setLoadingText] = useState("");
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingText((loadingText) => {
          if (loadingText.length >= 3) {
            return "";
          }
          return loadingText + ".";
        });
      }, 500);
      return () => clearInterval(interval);
    } else {
      setLoadingText("");
    }
  }, [loading]);
  if (!loading) return null;
  return (
    <group {...props}>
      <Text 
        fontSize={0.15} 
        anchorX={"center"} 
        anchorY={"middle"}
        color="#ffffff"
      >
        {loadingText}
        <meshBasicMaterial attach="material" color="#ffffff" />
      </Text>
    </group>
  );
};

// Typewriter subtitle component for real-time display
const TypewriterSubtitle = memo(({ message, fontSize = "medium" }) => {
  const subtitles = message?.subtitles || [];
  const [displayText, setDisplayText] = useState("");
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // Refs for timers and current values to avoid stale closures
  const timerRef = useRef(null);
  const subtitlesRef = useRef(subtitles);

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

  const getFontSizeClass = () => {
    switch (fontSize) {
      case "small": return "text-sm";
      case "large": return "text-lg";
      case "extra-large": return "text-xl";
      default: return "text-base";
    }
  };

  return (
    <div className={`${getFontSizeClass()} leading-relaxed min-h-[4.5rem]`}>
      {displayText}
      <span className="inline-block w-2 h-5 bg-white ml-1 animate-pulse" />
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
  const { userInput } = useChat();
  const [subtitle, setSubtitle] = useState("");

  // Animasi muncul dan hilang
  const fade = useSpring({
    opacity: subtitle ? 1 : 0,
    scale: subtitle ? 1 : 0.9,
    config: { tension: 120, friction: 15 },
  });

  useEffect(() => {
    if (userInput) {
      setSubtitle(userInput);

      // Clear subtitle after 8 seconds
      const timer = setTimeout(() => setSubtitle(""), 8000);
      return () => clearTimeout(timer);
    }
  }, [userInput]);

  if (!subtitle) return null;

  return (
    <a.group {...props} {...fade}>
      {/* Calm board design with soft edges */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[Math.min(1.6 + subtitle.length * 0.02, 3), 0.5]} />
        <meshStandardMaterial
          color="#e2e8f0"
          transparent
          opacity={0.9}
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>

      {/* Subtle border */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[Math.min(1.6 + subtitle.length * 0.02, 3) * 1.02, 0.52]} />
        <meshBasicMaterial color="#cbd5e0" transparent opacity={0.3} />
      </mesh>

      {/* Smaller, calmer text */}
      <Text
        fontSize={0.08}
        anchorX="center"
        anchorY="middle"
        color="#334155"
        maxWidth={2.6}
        lineHeight={1.2}
      >
        {subtitle}
      </Text>
    </a.group>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memo
  return prevProps.position[0] === nextProps.position[0] &&
         prevProps.position[1] === nextProps.position[1] &&
         prevProps.position[2] === nextProps.position[2];
});

// Separate component for the board content to prevent unnecessary re-renders
const BoardContent = memo(({ message, fontSize }) => {
  // Get font size class
  const getFontSizeClass = () => {
    switch (fontSize) {
      case "small": return "text-sm";
      case "large": return "text-lg";
      case "extra-large": return "text-xl";
      default: return "text-base";
    }
  };

  return (
    <div className={`${getFontSizeClass()} leading-relaxed min-h-[4.5rem]`}>
      {message?.subtitles ? (
        <div>
          {message.subtitles.map((subtitle, index) => (
            <div key={index}>{subtitle}</div>
          ))}
        </div>
      ) : message?.text ? (
        <p>{message.text}</p>
      ) : (
        <p className="italic text-gray-400">Waiting for response...</p>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if message content actually changed
  return prevProps.message?.text === nextProps.message?.text &&
         prevProps.fontSize === nextProps.fontSize &&
         JSON.stringify(prevProps.message?.subtitles) === JSON.stringify(nextProps.message?.subtitles);
});

export const Experience = () => {
  const cameraControls = useRef();
  const { cameraZoomed, message, audio, onMessagePlayed } = useChat();

  const { scene: ruangKelas } = useGLTF("/models/classroom_default.glb");

  // Board settings state
  const [boardSettings, setBoardSettings] = useState({
    fontSize: "medium",
    backgroundColor: "dark",
    position: "center",
    visible: true
  });

  useEffect(() => {
    cameraControls.current.setLookAt(0, 2, 5, 0, 1.5, 0);
  }, []);

  useEffect(() => {
    if (cameraZoomed) {
      cameraControls.current.setLookAt(0, 1.5, 2.0, 0, 1.5, 0, true);
    } else {
      cameraControls.current.setLookAt(0, 2.2, 5, 0, 1.0, 0, true);
    }
  }, [cameraZoomed]);

  // Toggle board visibility
  const toggleBoard = () => {
    setBoardSettings(prev => ({
      ...prev,
      visible: !prev.visible
    }));
  };

  // Change font size
  const changeFontSize = (size) => {
    setBoardSettings(prev => ({
      ...prev,
      fontSize: size
    }));
  };

  // Change background style
  const changeBackground = (style) => {
    setBoardSettings(prev => ({
      ...prev,
      backgroundColor: style
    }));
  };

  // Change position
  const changePosition = (pos) => {
    setBoardSettings(prev => ({
      ...prev,
      position: pos
    }));
  };

  // Get background style
  const getBackgroundStyle = () => {
    switch (boardSettings.backgroundColor) {
      case "light": return "bg-white/80 text-gray-800";
      case "transparent": return "bg-transparent/50 text-white backdrop-blur-sm";
      default: return "bg-black/70 text-white";
    }
  };

  // Get position classes
  const getPositionClasses = () => {
    switch (boardSettings.position) {
      case "top": return "top-20 left-1/2 transform -translate-x-1/2";
      case "bottom": return "bottom-32 left-1/2 transform -translate-x-1/2";
      case "left": return "left-10 top-1/2 transform -translate-y-1/2";
      case "right": return "right-10 top-1/2 transform -translate-y-1/2";
      default: return "top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2";
    }
  };

  // Handle audio ended event
  useEffect(() => {
    if (!audio) return;

    const handleAudioEnded = () => {
      onMessagePlayed();
    };

    audio.addEventListener('ended', handleAudioEnded);

    return () => {
      audio.removeEventListener('ended', handleAudioEnded);
    };
  }, [audio, onMessagePlayed]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 5, 2]} intensity={1} />
      <CameraControls ref={cameraControls} />
      <Environment preset="sunset" />
      {/* Ruangan kelas */}
  <primitive object={ruangKelas} scale={0.8} position={[0, 0, 1]} />

     <Suspense fallback={null}>
  {/* Dot di atas kepala Avatar */}
  <Dots position={[-1.0, 1.9, -1.1]} rotation={[0, 0.3, 0]} />
  
  {/* User input subtitle above AvatarStudent */}
  <UserInputSubtitle position={[1.5, 1.5, 2.6]} />

  {/* Interactive Board */}
  {boardSettings.visible ? (
    <Html
      position={[0.15, 1.5, -1]}
      transform
      distanceFactor={1.5}
      occlude
    >
      <div className={`fixed ${getPositionClasses()} z-20 transition-all duration-300`}>
        {/* Board Controls */}
        <div className="absolute -top-12 right-0 flex gap-2">
          <button
            onClick={toggleBoard}
            className="bg-red-500 text-white p-2 rounded-full shadow-md hover:bg-red-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
        </div>

        {/* Main Board */}
        <div className={`${getBackgroundStyle()} rounded-xl shadow-2xl p-6 w-[500px] max-w-[90vw] backdrop-blur-md border border-white/20`}>
          {/* Board Header with Settings */}
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/20">
            <h3 className="font-bold text-lg">Virtual Board</h3>
            <div className="flex gap-2">
              <button 
                onClick={() => changeFontSize("small")}
                className={`text-xs px-2 py-1 rounded ${boardSettings.fontSize === "small" ? "bg-white/30" : "bg-white/10"}`}
              >
                S
              </button>
              <button 
                onClick={() => changeFontSize("medium")}
                className={`text-sm px-2 py-1 rounded ${boardSettings.fontSize === "medium" ? "bg-white/30" : "bg-white/10"}`}
              >
                M
              </button>
              <button 
                onClick={() => changeFontSize("large")}
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
              <button 
                onClick={() => changeBackground("dark")}
                className={`w-6 h-6 rounded-full ${boardSettings.backgroundColor === "dark" ? "ring-2 ring-white" : ""}`}
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
                title="Dark background"
              />
              <button 
                onClick={() => changeBackground("light")}
                className={`w-6 h-6 rounded-full ${boardSettings.backgroundColor === "light" ? "ring-2 ring-white" : ""}`}
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)' }}
                title="Light background"
              />
              <button 
                onClick={() => changeBackground("transparent")}
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
          onClick={toggleBoard}
          className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-3 rounded-full shadow-lg hover:from-pink-600 hover:to-purple-700 transition-all duration-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
      </div>
    </Html>
  )}
</Suspense>
      <Avatar position={[-1, 0, -1]} rotation={[0, 0.3, 0]}/>  
      <AvatarStudent  position={[1.5, 0, 2.6]} rotation={[0, 3, 0]} />
      <ContactShadows opacity={0.7} />
    </>
  );
};