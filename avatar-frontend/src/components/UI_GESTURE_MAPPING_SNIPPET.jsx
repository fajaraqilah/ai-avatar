/*
TEMPEL SNIPPET INI KE FILE:
src/components/UI.jsx

1. Tambahkan import di bagian atas:
*/
import SentenceGestureMappingPanel from "./SentenceGestureMappingPanel";

/*
2. Pastikan useChat mengambil persistentMessage:
*/
const { chat, message, persistentMessage, onMessagePlayed, loading } = useChat();

/*
3. Letakkan komponen ini di dalam return JSX UI.jsx:
*/
<SentenceGestureMappingPanel
  message={message}
  persistentMessage={persistentMessage}
  audioUrl="http://localhost:3000/audios/generated.mp3"
  apiBaseUrl="http://localhost:3000/api"
/>
