# tts.py
# Fixed TTS for Guru Virtual AI
# Perbaikan:
# 1. Default bahasa dipaksa ke Indonesia (id), karena sistem guru virtual memakai Bahasa Indonesia.
# 2. Deteksi bahasa otomatis lama sering salah membaca teks Indonesia sebagai "en".
# 3. Tetap menyediakan fallback sederhana jika suatu saat ingin mode auto.
# 4. Output tetap: audios/generated.mp3

from gtts import gTTS
import sys
import os
import re


DEFAULT_LANGUAGE = "id"


def normalize_text(text: str) -> str:
    """Membersihkan teks agar aman dibaca TTS."""
    if text is None:
        return ""

    text = str(text)

    # Hilangkan karakter kontrol yang tidak perlu
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", " ", text)

    # Rapikan spasi
    text = re.sub(r"\s+", " ", text).strip()

    return text


def detect_language(text: str) -> str:
    """
    Deteksi bahasa yang lebih aman untuk proyek Guru Virtual.

    Catatan:
    Sistem ini mayoritas memakai Bahasa Indonesia, sehingga default = 'id'.
    Deteksi otomatis lama terlalu lemah dan sering mengembalikan 'en'
    untuk kalimat Indonesia seperti:
    'Saya melihat Anda telah hadir di kelas...'
    """

    text_norm = normalize_text(text).lower()

    # Kata/frasa umum Bahasa Indonesia dalam konteks guru virtual
    indonesian_keywords = [
        "saya", "anda", "kamu", "kalian", "siswa", "guru",
        "silakan", "tolong", "mohon", "perhatikan", "amati", "cermati",
        "lihat", "bagian", "visual", "diagram", "grafik", "materi",
        "kelas", "pembelajaran", "pertanyaan", "jawaban", "benar",
        "salah", "setuju", "tidak", "belum", "sudah", "kurang",
        "tepat", "lanjut", "lanjutkan", "diskusi", "pembahasan",
        "dengan", "yang", "dan", "atau", "untuk", "pada", "ini", "itu",
        "berikut", "sebelum", "sesudah", "pertama", "kedua", "ketiga",
        "angkat tangan", "ingin menjawab", "selamat", "terima kasih"
    ]

    hits = sum(1 for word in indonesian_keywords if word in text_norm)

    # Jika teks mengandung minimal 1-2 kata Indonesia, paksa id.
    # Threshold dibuat rendah karena output guru kadang pendek: "Ya, saya setuju."
    if hits >= 1:
        return "id"

    # Karakter non-ASCII sering muncul pada teks Indonesia formal atau tanda kutip tertentu.
    if re.search(r"[^\x00-\x7F]", text_norm):
        return "id"

    # Default proyek tetap Indonesia.
    return DEFAULT_LANGUAGE


def read_text_file(file_path):
    """Read text file with multiple encoding attempts."""
    encodings = ["utf-8", "utf-16", "cp1252", "iso-8859-1"]

    for encoding in encodings:
        try:
            with open(file_path, "r", encoding=encoding) as file:
                return file.read()
        except UnicodeDecodeError:
            continue

    # If all encodings fail, try with errors='ignore'
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as file:
            return file.read()
    except Exception as e:
        raise Exception(f"Could not read file with any encoding: {str(e)}")


def generate_speech(text: str, output_path: str = "audios/generated.mp3", force_lang: str | None = None):
    """
    Generate speech menggunakan gTTS.

    force_lang:
    - None  : memakai detect_language(), tetapi default tetap id.
    - "id"  : paksa Bahasa Indonesia.
    - "en"  : paksa English jika benar-benar dibutuhkan.
    """
    text = normalize_text(text)

    if not text:
        raise ValueError("Empty text provided")

    lang = force_lang or detect_language(text)

    # Safety guard: proyek ini default Indonesia.
    if lang not in {"id", "en"}:
        lang = DEFAULT_LANGUAGE

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

    print("Detecting language...")
    print(f"Detected language: {lang}")

    print("Generating speech...")
    tts = gTTS(text=text, lang=lang)
    tts.save(output_path)

    return output_path, lang


def main():
    text_file_path = None

    try:
        if len(sys.argv) < 2:
            print("Error: No text file path provided")
            sys.exit(1)

        text_file_path = sys.argv[1]

        # Optional argument:
        # python tts.py audios/temp_text.txt --lang id
        force_lang = None
        if "--lang" in sys.argv:
            idx = sys.argv.index("--lang")
            if idx + 1 < len(sys.argv):
                force_lang = sys.argv[idx + 1].strip().lower()

        # Read text from file with proper encoding
        text = read_text_file(text_file_path)
        text = normalize_text(text)

        print(f"Text length: {len(text)} characters")
        print(f"Text preview: {text[:100]}...")

        if not text:
            print("Warning: Empty text provided")
            sys.exit(1)

        generate_speech(text, output_path="audios/generated.mp3", force_lang=force_lang)

        print("Speech generated successfully")

        # Clean up temporary text file
        try:
            os.remove(text_file_path)
        except OSError:
            pass

        print("Audio generated successfully")

    except IndexError:
        print("Error: No text file path provided")
        sys.exit(1)
    except FileNotFoundError:
        if text_file_path:
            print(f"Error: Text file not found at {text_file_path}")
        else:
            print("Error: Text file not found")
        sys.exit(1)
    except Exception as e:
        print(f"Error generating audio: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
