# Update Frontend Gesture Pedagogik 2026-06-06

Perubahan utama:

1. File GLB terbaru telah disinkronkan ke frontend:
   - `public/animations/gesture_pedagogik/Pointing.glb`
   - `public/animations/gesture_pedagogik/HandRaising.glb`
   - `public/animations/gesture_pedagogik/HeadNodding.glb`
   - `public/animations/gesture_pedagogik/Looking.glb`

2. `src/components/Avatar.jsx` telah diperbarui agar memuat clip GLB terbaru secara eksplisit:
   - `POINTING`
   - `HAND_RAISING`
   - `HEAD_NOD_YES`
   - `LOOKING`

3. Jika clip GLB tidak cocok dengan skeleton avatar, overlay procedural tetap aktif sebagai fallback visual agar avatar tidak blank dan gesture tetap terlihat.

4. `public/gestureToClip.json` dan `public/gesturePedagogikMap.json` sudah diselaraskan dengan mapping backend.

Catatan: jalankan frontend dengan `npm install` bila folder `node_modules` belum ada, lalu `npm run dev`.
