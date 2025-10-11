
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
  const { cameraZoomed, message, audio } = useChat();

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

const [displayedText, setDisplayedText] = useState("");

useEffect(() => {
  if (!message || !message.segments || !audio) return;

  let currentIndex = 0;
  const interval = setInterval(() => {
    if (currentIndex < message.segments.length) {
      setDisplayedText((prev) => prev + " " + message.segments[currentIndex]);
      currentIndex++;
    } else {
      clearInterval(interval);
    }
  }, 1500); // 1.5 detik per kalimat (tune sesuai panjang suara)

  return () => clearInterval(interval);
}, [message, audio]);

const [subtitleChunks, setSubtitleChunks] = useState([]);
const [currentChunkIndex, setCurrentChunkIndex] = useState(0);


// Auto pindah ke potongan berikutnya per 5 detik
  useEffect(() => {
    if (!audio || subtitleChunks.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentChunkIndex((i) => {
        if (i + 1 < subtitleChunks.length) return i + 1;
        return i;
      });
    }, 5000); // ⏱ 5 detik per chunk, bisa disesuaikan

    audio.onended = () => {
      setCurrentChunkIndex(0);
      setSubtitleChunks([]);
      onMessagePlayed(); // reset state
    };

    return () => clearInterval(interval);
  }, [audio, subtitleChunks]);

useEffect(() => {
  if (!message || !message.text) return;

  const chunks = [];
  const maxLength = 400;
  let text = message.text.trim();

  while (text.length > 0) {
    chunks.push(text.slice(0, maxLength));
    text = text.slice(maxLength);
  }

  setSubtitleChunks(chunks);
  setCurrentChunkIndex(0);
}, [message]);

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

  
  {/* Subtitle UI */}
  {message?.text && (
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
    {message.text}
    {displayedText}
    {subtitleChunks[currentChunkIndex]}
  </div>
</Html>
  )}
</Suspense>
      <Avatar position={[-1, 0, -1]} rotation={[0, 0.3, 0]}/>  
      <ContactShadows opacity={0.7} />
    </>
  );
};