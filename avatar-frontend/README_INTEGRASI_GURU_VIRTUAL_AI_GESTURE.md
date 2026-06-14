# Integrasi Guru Virtual AI + Gesture Pedagogik

Paket ini menggabungkan proyek `avatar-backend`, `avatar-frontend`, dan folder `gesture_guru_virtual_integrated_ready` terbaru.

## Alur Sistem

1. Siswa memasukkan teks pada frontend.
2. Frontend mengirim teks ke endpoint backend `/chat`.
3. Backend memanggil model klasifikasi gesture pedagogik di `avatar-backend/ml/predict_pedagogic_gesture.py`.
4. Backend mengirim prompt ke Ollama (`llama3`) untuk menghasilkan jawaban guru.
5. Backend membuat audio TTS dan file lipsync Rhubarb.
6. Frontend memutar suara, menjalankan lipsync, dan memberikan overlay gesture pedagogik pada avatar.

## Struktur Integrasi Penting

```text
avatar-backend/
  ml/
    predict_pedagogic_gesture.py
    gesture_pedagogik/
      dataset/Dataset_Gesture_Guru_Virtual_Pedagogik.xlsx
      models/gesture_classifier_model.joblib
      models/gesture_mapping.json
      gestures/*.fbx
  services/gestureMLClassifierService.js

avatar-frontend/
  public/
    animations/gesture_pedagogik/*.fbx
    dataset/Dataset_Gesture_Guru_Virtual_Pedagogik.xlsx
    gesturePedagogikMap.json
    models/avatar_guru.glb
  src/components/Avatar.jsx
```

## Cara Menjalankan Backend

```bash
cd avatar-backend
npm install
pip install -r ml/requirements.txt
npm start
```

Pastikan Ollama sudah aktif:

```bash
ollama serve
ollama pull llama3
```

## Cara Menjalankan Frontend

```bash
cd avatar-frontend
npm install
npm run dev
```

Buka:

```text
http://localhost:5173
```

## Uji Gesture Classifier

```bash
cd avatar-backend
python ml/predict_pedagogic_gesture.py --text "Perhatikan diagram pada layar sebelah kanan" --pretty
python ml/predict_pedagogic_gesture.py --text "Tidak, jawaban tersebut belum sesuai dengan konsep yang benar" --pretty
```

Output yang diharapkan:

- `POINTING` untuk kalimat perhatian/diagram/layar.
- `SHAKING_HEAD_NO` untuk kalimat koreksi negatif.
- `HEAD_NOD_YES` untuk kalimat persetujuan/afirmasi.
- `WRITING` untuk kalimat catat/tulis.
- `THINKING` untuk kalimat pikirkan/renungkan.
- `CLAPPING` untuk kalimat apresiasi.

## Catatan Teknis

File FBX tetap disalin ke backend dan frontend. Namun karena retarget FBX Rokoko/Mixamo ke avatar GLB di browser tidak selalu kompatibel, `Avatar.jsx` diberi procedural gesture overlay. Dengan cara ini, avatar tetap menampilkan gesture sesuai dataset sambil lipsync dan audio tetap berjalan.
