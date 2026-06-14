# Dynamic Gesture System - Update Documentation

## Perubahan yang Dilakukan

### 1. **Backend (`avatar-backend/index.js`)**

#### Fitur Baru:
- **LLM-Driven Gestures**: AI (Ollama) sekarang dapat menyarankan gesture langsung dalam responnya
- **Multi-Gesture Support**: Sistem dapat mengirim beberapa gesture sekaligus untuk variasi
- **Smart Gesture Merging**: Menggabungkan gesture dari LLM dan ML classifier

#### Perubahan Spesifik:

##### a. Daftar Gesture yang Tersedia
```javascript
const AVAILABLE_GESTURES = [
  "Greeting", "Waving", "Talking_0", "Talking_1", "Talking_2", "Talking_3",
  "Talking_4", "Talking_5", "Talking_6", "Talking_7", "Laughing", "Sitting",
  "Terrified", "Crying", "Walk_left", "Rumba", "normal", "terbuka", "Idle"
];
```

##### b. Prompt yang Diperbarui
AI sekarang menerima instruksi untuk menyarankan gesture dengan format:
```
[GESTURES: gesture1, gesture2, gesture3]
```

Contoh respons AI:
```
"Halo! Senang bertemu denganmu. Hari ini kita akan belajar tentang AI.
[GESTURES: Greeting, Talking_1]"
```

##### c. Fungsi Ekstraksi Gesture
```javascript
function extractGesturesFromText(text)
```
- Mengekstrak gesture dari tag `[GESTURES: ...]`
- Memvalidasi gesture terhadap daftar yang tersedia
- Menghapus tag dari teks yang akan ditampilkan

##### d. Logika Gesture 3-Tingkat
1. **Rule-based**: Deteksi sapaan (prioritas tertinggi)
2. **LLM-suggested**: Gunakan gesture yang disarankan AI
3. **ML-based**: Fallback ke classifier jika LLM tidak menyarankan

##### e. Gesture Enhancement
Jika hanya ada 1 gesture, sistem akan menambahkan gesture dari ML classifier untuk variasi.

### 2. **Testing (`avatar-backend/test_gesture_generation.js`)**

Script untuk menguji sistem gesture baru:
```bash
node test_gesture_generation.js
```

## Cara Menggunakan

### 1. Restart Backend
```bash
cd avatar-backend
node index.js
```

### 2. Test Sistem
```bash
node test_gesture_generation.js
```

### 3. Contoh Query

**Query Pendek (Sapaan):**
- Input: "Halo"
- Expected: `["Greeting"]`

**Query Panjang (Penjelasan):**
- Input: "Jelaskan tentang AI dengan detail"
- Expected: `["Talking_1", "Talking_3", "Talking_7"]` (variasi)

**Query Lucu:**
- Input: "Ceritakan sesuatu yang lucu"
- Expected: `["Laughing", "Talking_1"]`

## Keuntungan Sistem Baru

1. ✅ **Gesture Lebih Bervariasi**: Avatar tidak lagi mengulang gesture yang sama
2. ✅ **Konteks Lebih Baik**: Gesture dipilih berdasarkan jawaban AI, bukan pertanyaan user
3. ✅ **Intelligent Fallback**: Sistem tetap bekerja meski LLM gagal menyarankan gesture
4. ✅ **Multi-Gesture Sequences**: Avatar dapat melakukan urutan gesture yang berbeda

## Troubleshooting

### Jika gesture tidak bervariasi:
1. Periksa log backend untuk melihat "LLM-suggested gestures"
2. Pastikan model `tinyllama` berjalan dengan baik
3. Coba tingkatkan threshold confidence di ML classifier (saat ini 0.35)

### Jika LLM tidak menyarankan gesture:
- Ini normal untuk model kecil seperti `tinyllama`
- Sistem akan fallback ke ML classifier
- Pertimbangkan upgrade ke model lebih besar (gemma:2b atau llama2)

## Next Steps (Opsional)

1. **Fine-tune Prompt**: Sesuaikan prompt untuk hasil lebih baik
2. **Add More Gestures**: Tambahkan animasi Mixamo baru ke `AVAILABLE_GESTURES`
3. **Improve Dataset**: Tambahkan lebih banyak contoh ke `dataset_gesture_training.csv`
4. **Gesture Timing**: Sesuaikan durasi loop di `gestureManager.js`
