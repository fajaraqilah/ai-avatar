# Update Gesture Pedagogik 2026-06-06

Perubahan utama:

1. File GLB terbaru telah disinkronkan ke backend:
   - `ml/gesture_pedagogik/gestures/Pointing.glb`
   - `ml/gesture_pedagogik/gestures/HandRaising.glb`
   - `ml/gesture_pedagogik/gestures/HeadNodding.glb`
   - `ml/gesture_pedagogik/gestures/Looking.glb`

2. Dataset `Dataset_Gesture_Guru_Virtual_Pedagogik.xlsx` tetap berisi 95 kalimat training untuk 19 kelas gesture dan metadata update sudah diperbarui.

3. Model telah dilatih ulang dengan script:

```bash
python ml/train_pedagogic_gesture_from_excel.py
```

Atau melalui wrapper kompatibilitas:

```bash
python ml/gesture_pedagogik/train_model.py
```

4. Script prediksi utama:

```bash
python ml/predict_pedagogic_gesture.py --text "Perhatikan diagram pada layar"
```

5. Patch penting:
   - `HAND_RAISING` sekarang mengarah ke `HandRaising.glb`.
   - `POINTING` sekarang mengarah ke `Pointing.glb`.
   - `LOOKING` sekarang mengarah ke `Looking.glb`.
   - Afirmasi/anggukan `HEAD_NOD_YES` sekarang diprioritaskan ke `HeadNodding.glb`.
   - Backend mengirim `frontend_animation_clip` agar frontend tidak salah memilih animasi.

Catatan: jalankan backend dengan `npm install` bila folder `node_modules` belum ada, lalu `npm start`.
