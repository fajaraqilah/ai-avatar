# Copilot / AI Agent Instructions (project-specific)

Purpose: Help an AI coding agent become productive quickly in this repository.

- **Big picture**: This project is a local, Mixamo-based 3D avatar app with two main parts:
  - `avatar-backend/` — Express server that talks to a local LLM (Ollama), generates TTS (Python `tts.py`), runs `ffmpeg` and `Rhubarb` to produce audio and lip-sync JSON, and returns a consolidated payload to the frontend.
  - `avatar-frontend/` — Vite + React + react-three-fiber UI that loads GLB models and animation clips, applies morph-target lip-sync and facial expressions, and sequences Mixamo animations.

- **Key files to inspect when changing behavior**:
  - Backend: `avatar-backend/index.js`, `avatar-backend/animationSequencer.js`, `avatar-backend/tts.py`
  - Frontend: `avatar-frontend/src/components/Avatar.jsx`, `avatar-frontend/src/components/AvatarStudent.jsx`, `avatar-frontend/src/components/gestureManager.js`, `avatar-frontend/src/hooks/useChat.jsx`
  - Model assets: `avatar-frontend/public/models/*` (e.g. `untitled.glb`, `animasi_mengajar.glb`, `67a47721736ce9f3e126d847.glb`)

- **Run / dev workflow (Windows)**:
  - Start backend: open PowerShell at `avatar-backend/` and run `npm install` then `npm run dev` (uses `nodemon`) or `npm start` to run once.
  - Ensure Ollama is running on `http://localhost:11434` (backend will call `/api/generate` and `/api/tags`).
  - Ensure Python dependencies for TTS: repository uses `gtts` in `avatar-backend/tts.py` (run `pip install gTTS` in your Python environment).
  - Ensure `ffmpeg` and `Rhubarb` executables are available in repository-relative paths used by `index.js`: `..\ffmpeg\bin\ffmpeg.exe` and `..\Rhubarb-Lip-Sync\bin\rhubarb.exe`. On Windows run backend from `avatar-backend` so relative paths resolve.
  - Start frontend: open PowerShell at `avatar-frontend/` and run `npm install` then `npm run dev` to start Vite.

- **Backend ↔ Frontend contract (important)**
  - POST `/chat` request body: `{ message: string }` (sent by `avatar-frontend/src/hooks/useChat.jsx`).
  - Response shape (JSON) expected by frontend: {
      success: boolean,
      text: string,
      subtitles: string[],
      audio: string,            // base64 MP3 (or empty string)
      lipsync: { mouthCues: [{start:number,end:number,value:string}, ...] },
      gestureLabels: string[],  // labels the frontend maps to Mixamo clips
      audioDuration: number
    }
  - Frontend code assumes `audio` may be raw base64 or prefixed `data:` — both handled.

- **Animation & naming conventions**
  - Animation clip names come from GLB files and are matched with a tolerant strategy:
    - Exact name match preferred (e.g. `Idle`, `Talking_0`).
    - Partial, case-insensitive contains-match falls back to the closest clip.
    - If none found, code will try to find any `idle`-like clip or use the first animation available.
  - Gesture management (looping vs single-play) is defined in `gestureManager.js` via `loopingAnimations` and `singlePlayAnimations`. If you add new gestures, update that list.

- **Frontend patterns to preserve**
  - `useChat` (context) drives the message queue and exposes `message` and `onMessagePlayed` used by `Avatar.jsx` and `AvatarStudent.jsx`.
  - `Avatar.jsx` uses `useGLTF` to load model + two animation GLBs; it builds `actionsRef` and a mixer and relies on event listeners (`mixer.addEventListener('finished', ...)`) plus `animationCallbacksRef` to sequence gestures.
  - Lip-sync mapping: phoneme-to-viseme mapping is in `Avatar.jsx` (object `corresponding`). The backend produces `lipsync.mouthCues` used to set morph targets during audio playback.

- **Common edits and gotchas**
  - When modifying backend commands that call external executables, prefer relative paths used in `index.js` (Windows path separators) or update to a configurable env var (e.g. `FFMPEG_PATH`, `RHUBARB_PATH`).
  - `avatar-backend/index.js` expects to run from `avatar-backend` so `..\ffmpeg\bin\ffmpeg.exe` resolves. If you change launch directory, update paths.
  - `animationSequencer.js` is CommonJS (`module.exports`) — backend is ESM (`type: module`) but `animationSequencer` is used on the backend only for sequencing logic; watch module interop if you move it.
  - The frontend uses `@react-three/drei` `useGLTF.preload(...)` for models; keep filenames stable or update preload calls.

- **Useful quick examples**
  - To test the pipeline manually: `curl -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d '{"message":"Hi, can you explain photosynthesis?"}'`
  - Example response fragment frontend expects: `{"text":"...","audio":"<base64>","lipsync":{"mouthCues":[{"start":0,"end":0.1,"value":"A"}]},"gestureLabels":["menjelaskan_normal"],"audioDuration":3.2}`

If anything here is unclear or you'd like more detail on one area (model naming, build scripts, runtime env, or increasing robustness of subprocess calls), tell me which section to expand and I'll iterate.
