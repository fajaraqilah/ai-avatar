import { createContext, useContext, useEffect, useState } from "react";

const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => { 
  const [userInput, setUserInput] = useState(""); // New state to track user input
  
  const chat = async (message) => { 
    // Store the user's input
    setUserInput(message);
    
    setLoading(true);

    try {
      // Kirim pertanyaan ke backend: Ollama + TTS + Rhubarb + Gesture AI
      const replyRes = await fetch(`${backendUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      console.log("Response status:", replyRes.status);
      console.log("Response headers:", [...replyRes.headers.entries()]);

      if (!replyRes.ok) {
        throw new Error(`HTTP error! status: ${replyRes.status}`);
      }
      
      const replyData = await replyRes.json();
      
      console.log("Response data:", replyData);
      
      if (!replyData.success) {
        throw new Error(replyData.message || "Failed to get response");
      }
      
      const replyText = replyData.text;
      const subtitles = replyData.subtitles || [replyText];

      // Determine animation based on user message keywords (similar to backend logic)
      let selectedAnimation = "Idle";
      let secondaryAnimation = null;
      
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
      const lowerUserMsg = message.toLowerCase();
      for (const [keyword, animations] of Object.entries(doubleAnimationKeywords)) {
        if (lowerUserMsg.includes(keyword)) {
          selectedAnimation = animations[0];
          secondaryAnimation = animations[1];
          console.log(`🎯 Double animation triggered: ${keyword} -> Primary: ${selectedAnimation}, Secondary: ${secondaryAnimation}`);
          break;
        }
      }
      
      // If no keyword matched but there's a message, use a random talking animation
      if (message.trim() && selectedAnimation === "Idle" && !secondaryAnimation) {
        const talkingAnimations = ["Talking_0", "Talking_1", "Talking_2", "Talking_1", "Talking_4", "Talking_5", "Talking_6", "Talking_7"];
        const randomIndex = Math.floor(Math.random() * talkingAnimations.length);
        selectedAnimation = talkingAnimations[randomIndex];
        console.log(`🎲 Random talking animation selected: ${selectedAnimation}`);
      }

      setMessages((prev) => [
        ...prev,
        {
          text: replyText,
          subtitles: subtitles,
          animation: selectedAnimation,
          secondaryAnimation: secondaryAnimation,
          facialExpression: "neutral", // Default expression
          audio: replyData.audio || "",
          lipsync: replyData.lipsync || { mouthCues: [] },
          gesture: replyData.gesture || { compressed: { bones: [], frames: [] } } // Add gesture data
        },
      ]);
    } catch (err) {
      console.error("TTS or LLM ERROR:", err);
      // Display error to user
      // Determine animation based on user message keywords (similar to backend logic)
      let selectedAnimation = "Idle";
      let secondaryAnimation = null;
      
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
      const lowerUserMsg = userInput.toLowerCase();
      for (const [keyword, animations] of Object.entries(doubleAnimationKeywords)) {
        if (lowerUserMsg.includes(keyword)) {
          selectedAnimation = animations[0];
          secondaryAnimation = animations[1];
          console.log(`🎯 Double animation triggered: ${keyword} -> Primary: ${selectedAnimation}, Secondary: ${secondaryAnimation}`);
          break;
        }
      }
      
      // If no keyword matched but there's a message, use a random talking animation
      if (userInput.trim() && selectedAnimation === "Idle" && !secondaryAnimation) {
        const talkingAnimations = ["Talking_0", "Talking_1", "Talking_2", "Talking_1", "Talking_4", "Talking_5", "Talking_6", "Talking_7"];
        const randomIndex = Math.floor(Math.random() * talkingAnimations.length);
        selectedAnimation = talkingAnimations[randomIndex];
        console.log(`🎲 Random talking animation selected: ${selectedAnimation}`);
      }
      
      setMessages((prev) => [
        ...prev,
        {
          text: `Error: ${err.message}`,
          subtitles: [`Error: ${err.message}`],
          animation: selectedAnimation,
          secondaryAnimation: secondaryAnimation,
          facialExpression: "neutral",
          audio: "",
          lipsync: { mouthCues: [] },
          gesture: { compressed: { bones: [], frames: [] } } // Add empty gesture data
        },
      ]);
    }

    setLoading(false);
  };

  const [messages, setMessages] = useState([]); 
  const [message, setMessage] = useState(); 
  const [loading, setLoading] = useState(false); 
  const [cameraZoomed, setCameraZoomed] = useState(true); 
  
  const onMessagePlayed = () => { 
    setMessages((messages) => messages.slice(1)); 
  };

  useEffect(() => { 
    if (messages.length > 0) {
      setMessage(messages[0]); 
    } else { 
      setMessage(null); 
    } 
  }, [messages]);

  return ( 
    <ChatContext.Provider value={{ 
      chat, 
      message, 
      onMessagePlayed, 
      loading, 
      cameraZoomed, 
      setCameraZoomed,
      userInput, // Expose userInput to context
      setUserInput // Expose setUserInput to context
    }} > 
      {children} 
    </ChatContext.Provider> 
  ); 
};

export const useChat = () => { 
  const context = useContext(ChatContext); 
  if (!context) { 
    throw new Error("useChat must be used within a ChatProvider"); 
  } 
  return context; 
};