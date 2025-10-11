import { createContext, useContext, useEffect, useState } from "react";

const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => { const chat = async (message) => { setLoading(true);

try {
  // Kirim pertanyaan ke backend: Ollama + TTS + Rhubarb + Gesture AI
  const replyRes = await fetch(`${backendUrl}/chat-ollama`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  const replyData = await replyRes.json();
  const replyText = replyData.reply;
// const sentenceSegments = replyText
//   .split(/[.?!]\s+/) // pisahkan berdasarkan kalimat
//   .map(s => s.trim())
  // .filter(Boolean);
  // console.log("💬 AI Gesture animation:", replyData.gesture);
  // console.log("🧠 Expression:", replyData.expression);

  // Tambahkan ke antrian message
  setMessages((prev) => [
    ...prev,
    {
      text: replyText,
      // segments: sentenceSegments,
      animation: replyData.gesture || "Talking_3",
      facialExpression: replyData.expression || "neutral",
      audio: replyData.audio || "",
      lipsync: replyData.lipsync || { mouthCues: [] },
    },
  ]);
} catch (err) {
  console.error("TTS or LLM ERROR:", err);
}

setLoading(false);

};

const [messages, setMessages] = useState([]); 
const [message, setMessage] = useState(); 
const [loading, setLoading] = useState(false); 
const [cameraZoomed, setCameraZoomed] = useState(true); 
const onMessagePlayed = () => { setMessages((messages) => messages.slice(1)); };

useEffect(() => { if (messages.length > 0) 
{ setMessage(messages[0]); } else { setMessage(null); } }, [messages]);

return ( 
<ChatContext.Provider value={{ chat, message, onMessagePlayed, loading, cameraZoomed, setCameraZoomed, }} > {children} </ChatContext.Provider> ); };

export const useChat = () => { const context = useContext(ChatContext); 
if (!context) { throw new Error("useChat must be used within a ChatProvider"); } return context; };