# lihat_dataset.py
# Menampilkan kalimat gesture yang digunakan untuk training.
# Simpan file ini di folder utama proyek:
# C:\Users\user\Documents\gesture_guru_virtual_integrated_ready

import pandas as pd
from pathlib import Path

FILE_EXCEL = Path("dataset") / "Dataset_Gesture_Guru_Virtual_Pedagogik.xlsx"
SHEET_NAME = "Korpus Dataset Pedagogik"

if not FILE_EXCEL.exists():
    raise FileNotFoundError(
        f"File Excel tidak ditemukan: {FILE_EXCEL}\n"
        "Pastikan file berada di folder dataset/."
    )

# Pada file ini, header tabel berada di baris Excel ke-5.
# Dalam Python, index baris dimulai dari 0, jadi header=4.
df = pd.read_excel(FILE_EXCEL, sheet_name=SHEET_NAME, header=4)

# Bersihkan baris kosong
df = df.dropna(how="all").reset_index(drop=True)

kolom_yang_ditampilkan = [
    "ID_DATASET",
    "KATEGORI PEDAGOGIK",
    "INPUT TEKS PENGAJARAN (KALIMAT GURU)",
    "TARGET FILE ANIMASI (.FBX)",
    "DIMENSI ANALISIS PEDAGOGIS",
    "TIPE DATA MODEL",
]

print("\n=== DATASET KALIMAT GESTURE YANG DIGUNAKAN UNTUK TRAINING ===\n")
print(f"File  : {FILE_EXCEL}")
print(f"Sheet : {SHEET_NAME}")
print(f"Total data: {len(df)} baris\n")

for i, row in df.iterrows():
    print(f"{i+1}. ID       : {row.get('ID_DATASET', '-')}")
    print(f"   Kalimat  : {row.get('INPUT TEKS PENGAJARAN (KALIMAT GURU)', '-')}")
    print(f"   Gesture  : {row.get('TARGET FILE ANIMASI (.FBX)', '-')}")
    print(f"   Kategori : {row.get('KATEGORI PEDAGOGIK', '-')}")
    print(f"   Analisis : {row.get('DIMENSI ANALISIS PEDAGOGIS', '-')}")
    print("-" * 90)

# Simpan juga ke CSV agar mudah dibuka
output_csv = Path("output") / "daftar_kalimat_gesture_training.csv"
output_csv.parent.mkdir(exist_ok=True)

df[kolom_yang_ditampilkan].to_csv(output_csv, index=False, encoding="utf-8-sig")
print(f"\nCSV berhasil dibuat: {output_csv}")
