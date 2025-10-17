import {
  CameraControls,
  ContactShadows,
  Environment,
  Html,
  Text,
  useGLTF,
} from "@react-three/drei";
import { Suspense, useEffect, useRef, useState } from "react";
import { useChat } from "../hooks/useChat";
import { Avatar } from "./Avatar";

const Dots = (props) => {
  const { loading } = useChat();
  const [loadingText, setLoadingText] = useState("");
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingText((loadingText) => {
          if (loadingText.length > 2) {
            return ".";
          }
          return loadingText + ".";
        });
      }, 800);
      return () => clearInterval(interval);
    } else {
      setLoadingText("");
    }
  }, [loading]);
  if (!loading) return null;
  return (
    <group {...props}>
      <Text fontSize={0.14} anchorX={"left"} anchorY={"bottom"}>
        {loadingText}
        <meshBasicMaterial attach="material" color="black" />
      </Text>
    </group>
  );
};

export const Experience = () => {
  const cameraControls = useRef();
  const { cameraZoomed, message, audio, onMessagePlayed } = useChat();

  const { scene: ruangKelas } = useGLTF("/models/classroom_default.glb");

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

  // Display subtitles properly without duplication
  const [currentSubtitle, setCurrentSubtitle] = useState("");

  // Update subtitle when message changes
  useEffect(() => {
    if (!message) {
      setCurrentSubtitle("");
      return;
    }

    // Use the subtitles array from the backend if available, otherwise fallback to text
    if (message.subtitles && message.subtitles.length > 0) {
      // Join all subtitles with line breaks for proper display
      setCurrentSubtitle(message.subtitles.join("\n"));
    } else {
      setCurrentSubtitle(message.text || "");
    }
  }, [message]);

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
  <Dots position={[-1.1, 1.8, -1.1]} rotation={[0, 0.3, 0]} />

  
  {/* Subtitle UI - Display subtitles properly without duplication */}
  {currentSubtitle && (
 <Html
  position={[0.15, 1.5, -1]} // 🧭 Sesuaikan dengan posisi papan tulis
  transform
  distanceFactor={1.5}
  occlude
>
  <div
    style={{
      background: "#ffffffcc", // putih semi transparan
      padding: "12px 18px",
      borderRadius: "10px",
      fontSize: "12px", // kecilkan sedikit biar muat
      maxWidth: "500px", // ➕ Lebarkan area teks
      boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
      lineHeight: 1.5,
      color: "#111", // agar lebih kontras
      wordWrap: "break-word",
      whiteSpace: "pre-wrap",
      textAlign: "justify",
    }}
  >
    {currentSubtitle}
  </div>
</Html>
  )}
</Suspense>
      <Avatar position={[-1, 0, -1]} rotation={[0, 0.3, 0]}/>  
      <ContactShadows opacity={0.7} />
    </>
  );
};