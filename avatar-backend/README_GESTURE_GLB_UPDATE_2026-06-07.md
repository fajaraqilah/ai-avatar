# Update Gesture GLB Guru Virtual - 2026-06-07

## Ringkasan perubahan

Paket ini sudah diperbarui agar backend dan frontend memakai label gesture pedagogik yang sama untuk 17 file animasi GLB terbaru.

## File gesture terbaru yang ditambahkan

1. Thinking.glb -> THINKING
2. Bashful.glb -> BASHFUL
3. Clapping.glb -> CLAPPING
4. Counting.glb -> COUNTING
5. HandRaising.glb -> HAND_RAISING
6. HeadNo.glb -> SHAKING_HEAD_NO
7. HeadNodding.glb -> HEAD_NOD_YES
8. Looking.glb -> LOOKING
9. Patting.glb -> PATTING
10. Pointing.glb -> POINTING
11. StandingGreeting.glb -> STANDING_GREETING
12. Talking_Argumen.glb -> TALKING_ARGUMEN
13. Talking_Comparing.glb -> TALKING_COMPARING
14. Talking_Explaining.glb -> TALKING_EXPLAINING
15. Talking_OpenHand.glb -> TALKING_OPEN_HAND
16. Talking_Presenting.glb -> TALKING_PRESENTING
17. Thankful.glb -> THANKFUL

File telah disalin ke:

- `avatar-backend/ml/gesture_pedagogik/gestures/`
- `avatar-frontend/public/animations/gesture_pedagogik/`

## Dataset dan model

Dataset aktif ada di:

- `avatar-backend/ml/gesture_pedagogik/dataset/Dataset_Gesture_Guru_Virtual_Pedagogik.xlsx`
- `avatar-frontend/public/dataset/Dataset_Gesture_Guru_Virtual_Pedagogik.xlsx`

Dataset berisi:

- 17 gesture GLB
- 5 kalimat training per gesture
- total 85 kalimat training
- sheet utama: `Korpus Dataset Pedagogik`

Model sudah dilatih ulang melalui:

```bash
cd avatar-backend
python ml/train_pedagogic_gesture_from_excel.py
```

Output model:

- `avatar-backend/ml/gesture_pedagogik/models/gesture_classifier_model.joblib`
- `avatar-backend/ml/gesture_pedagogik/models/gesture_mapping.json`

## Validasi prediksi

Pengujian prediksi Python menunjukkan 17/17 gesture berhasil mengarah ke label dan file GLB yang sesuai.

Contoh uji:

```bash
cd avatar-backend
python ml/predict_pedagogic_gesture.py --text "Jika dibandingkan dengan metode manual, pendekatan ini lebih adaptif."
```

Output utama yang diharapkan:

```json
{
  "frontend_animation_clip": "TALKING_COMPARING",
  "animation_file": "Talking_Comparing.glb",
  "frontend_animation_path": "/animations/gesture_pedagogik/Talking_Comparing.glb"
}
```

## Integrasi frontend

File yang diperbarui:

- `avatar-frontend/src/components/Avatar.jsx`
- `avatar-frontend/src/components/gestureManager.js`
- `avatar-frontend/public/gestureToClip.json`
- `avatar-frontend/public/gesturePedagogikMap.json`

Frontend sekarang memuat 17 file GLB baru melalui `useGLTF()` dan menormalisasi nama clip sesuai label backend. Overlay prosedural tetap disediakan sebagai fallback visual agar avatar tidak kembali ke `Talking_1` atau `Idle` ketika clip browser tidak cukup jelas.

## Cara menjalankan

Backend:

```bash
cd avatar-backend
npm install
npm start
```

Frontend:

```bash
cd avatar-frontend
npm install
npm run dev
```

Validasi build frontend sudah dilakukan dengan `npm run build` dan berhasil. Catatan: build Vite menampilkan warning ukuran chunk besar, tetapi bukan error.

## Catatan kritis

Integrasi label backend dan frontend sudah diselaraskan. Namun kualitas visual akhir tetap bergantung pada kompatibilitas skeleton GLB terhadap avatar ReadyPlayerMe di browser. Jika salah satu gerakan masih tampak kurang natural, masalahnya kemungkinan berada pada retargeting/rigging animasi, bukan pada model klasifikasi atau mapping label.
