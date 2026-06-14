import { createContext, useContext, useEffect, useState } from "react";

const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
const ChatContext = createContext();

const cleanFrontendText = (text = "") => {
  return String(text || "")
    .replace(/\[GESTURES:\s*[^\]]+\]/gim, "")
    .replace(/GESTURES\s*:\s*.*$/gim, "")
    .replace(/gesture_label\s*:\s*.*$/gim, "")
    .replace(/animation_clip\s*:\s*.*$/gim, "")
    .replace(/animation_file\s*:\s*.*$/gim, "")
    .replace(/backend_animation_path\s*:\s*.*$/gim, "")
    .replace(/frontend_animation_path\s*:\s*.*$/gim, "")
    .replace(/pedagogic_analysis\s*:\s*.*$/gim, "")
    .replace(/pedagogic_category\s*:\s*.*$/gim, "")
    .replace(/```json[\s\S]*?```/gim, "")
    .replace(/```[\s\S]*?```/gim, "")
    .replace(/\s+/g, " ")
    .trim();
};

export const ChatProvider = ({ children }) => {
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState();
  const [persistentMessage, setPersistentMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cameraZoomed, setCameraZoomed] = useState(true);

  const chat = async (inputText) => {
    setUserInput(inputText);
    setLoading(true);
    try {
      const replyRes = await fetch(`${backendUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: inputText })
      });
      if (!replyRes.ok) throw new Error(`HTTP error! status: ${replyRes.status}`);
      const data = await replyRes.json();
      if (!data.success) throw new Error(data.message || "Failed to get response");

      const replyText = cleanFrontendText(data.text || "");
      if (data.gestureLabels && !Array.isArray(data.gestureLabels)) data.gestureLabels = [];

      const newMessage = {
        ...data,
        user_input: inputText,
        text: replyText,
        subtitles: data.subtitles || [replyText],
        facialExpression: "neutral",
        audio: data.audio || "",
        lipsync: data.lipsync || { mouthCues: [] },
        gestureLabels: data.gestureLabels || [],
        audioDuration: data.audioDuration || data.audio_duration || data.lipsync?.metadata?.duration || 0,
        sentenceGestureMapping: data.sentenceGestureMapping || [],
        mlGesture: data.mlGesture || null,
        predictedGestureLabel: data.predictedGestureLabel || "",
        predictedAnimationClip: data.predictedAnimationClip || "",
        mappedTeacherSentence: data.mappedTeacherSentence || "",
        annotation_id: data.annotation_id || data.session_id || `ANN-${Date.now()}`,
        session_id: data.session_id || data.annotation_id || `SES-${Date.now()}`
      };
      setMessages((prev) => [...prev, newMessage]);
      setPersistentMessage(newMessage);
    } catch (err) {
      console.error("TTS or LLM ERROR:", err);
      const errorMessage = {
        text: `Error: ${err.message}`,
        subtitles: [`Error: ${err.message}`],
        facialExpression: "neutral",
        audio: "",
        lipsync: { mouthCues: [] },
        gestureLabels: ["Idle"],
        audioDuration: 0,
        user_input: inputText,
        annotation_id: `ERR-${Date.now()}`
      };
      setMessages((prev) => [...prev, errorMessage]);
      setPersistentMessage(errorMessage);
    }
    setLoading(false);
  };

  const onMessagePlayed = () => {
    setMessages((messages) => messages.slice(1));
  };

  useEffect(() => {
    if (messages.length > 0) setMessage(messages[0]);
    else setMessage(null);
  }, [messages]);

  return (
    <ChatContext.Provider value={{
      chat,
      message,
      persistentMessage,
      onMessagePlayed,
      loading,
      cameraZoomed,
      setCameraZoomed,
      userInput,
      setUserInput,
      backendUrl
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within ChatProvider");
  return context;
};
