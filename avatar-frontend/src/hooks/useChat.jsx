import { createContext, useContext, useEffect, useState } from "react";

const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:3007";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => { 
  const chat = async (message) => { 
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

      // Tambahkan ke antrian message
      setMessages((prev) => [
        ...prev,
        {
          text: replyText,
          subtitles: subtitles,
          animation: "Talking_4", // Default animation
          facialExpression: "neutral", // Default expression
          audio: replyData.audio || "",
          lipsync: replyData.lipsync || { mouthCues: [] },
        },
      ]);
    } catch (err) {
      console.error("TTS or LLM ERROR:", err);
      // Display error to user
      setMessages((prev) => [
        ...prev,
        {
          text: `Error: ${err.message}`,
          subtitles: [`Error: ${err.message}`],
          animation: "Talking_4",
          facialExpression: "neutral",
          audio: "",
          lipsync: { mouthCues: [] },
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
      setCameraZoomed 
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