# Integrasi Gesture Mapping pada Avatar Frontend

Fitur yang sudah ditambahkan:

1. Komponen grafik timeline mapping gesture:
   - `src/components/GestureMappingTimeline.jsx`
2. Utility pembentuk timeline:
   - `src/utils/gestureTimelineUtils.js`
3. Utility export CSV lokal:
   - `src/utils/csvExportUtils.js`
4. `src/hooks/useChat.jsx` sudah menerima:
   - `gestureTimeline`
   - `gesture_mapping`
5. `src/components/UI.jsx` sudah menampilkan panel grafik mapping gesture.

## Cara Menjalankan

```bash
cd avatar-frontend
yarn install
yarn dev
```

Setelah guru virtual menjawab, akan muncul:
- panel anotasi gesture,
- panel grafik mapping gesture,
- tombol download CSV lokal,
- tombol simpan CSV backend,
- tombol export CSV backend.

## Catatan

Jika grafik tidak muncul, pastikan backend `/chat` sudah mengirim field `gestureTimeline`.
