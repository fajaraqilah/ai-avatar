# -*- coding: utf-8 -*-
"""
Predict pedagogic gesture for Guru Virtual AI.

Patch: LOOKING vs POINTING RULE PRIORITY FIX
- Memperbaiki kasus kalimat observasi visual seperti "Amati dengan teliti bagian visual berikut" salah dipetakan ke POINTING.
- LOOKING dicek sebelum POINTING.
- POINTING dibatasi untuk objek/arah spesifik seperti diagram, grafik, slide, layar kanan, atau objek yang ditunjuk.
- Output tetap bersih: tidak mengirim backend_animation_path, teacher_sentence, atau example_sentence.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Dict, Tuple

import joblib

ROOT = Path(__file__).resolve().parent
ASSET_DIR = ROOT / "gesture_pedagogik"
MODEL_PATH = ASSET_DIR / "models" / "gesture_classifier_model.joblib"
MAPPING_PATH = ASSET_DIR / "models" / "gesture_mapping.json"
GESTURE_DIR = ASSET_DIR / "gestures"
OUTPUT_DIR = ROOT.parent / "exports"
OUTPUT_JSON = OUTPUT_DIR / "last_pedagogic_gesture_prediction.json"

RULE_HINTS: Dict[str, list[str]] = {
    "STANDING_GREETING": ["selamat pagi", "selamat datang", "halo", "hai", "assalamu", "mari kita mulai", "awali sesi"],
    "TALKING_EXPLAINING": ["konsep", "dapat dipahami", "secara sederhana", "saya akan menjelaskan", "dalam konteks", "fungsi sistem", "hubungan antara komponen"],
    "TALKING_OPEN_HAND": ["mari kita lihat", "secara terbuka", "menyampaikan pendapat", "saya buka kesempatan", "silakan hubungkan", "diskusi kelas"],
    "TALKING_ARGUMEN": ["alasan utama", "argumen", "secara logis", "bukti", "dasar pemikirannya", "justifikasi", "rasional"],
    "TALKING_COMPARING": ["dibandingkan", "perbedaan utama", "sebagai perbandingan", "membandingkan", "berbeda dengan", "lebih adaptif"],
    "TALKING_PRESENTING": ["mempresentasikan", "poin utama", "berikut saya sajikan", "pada slide ini", "saya tampilkan", "struktur pembelajaran"],
    "POINTING": ["perhatikan diagram", "perhatikan grafik", "yang saya tunjuk", "saya tunjuk", "saya tunjukkan", "sisi kanan", "bagian penting pada slide", "fokuskan perhatian pada"],
    "LOOKING": ["amati dengan teliti", "cermati", "lihat dengan seksama", "fokus pada visual", "observasi terlebih dahulu", "tampilan visual"],
    "COUNTING": ["pertama", "kedua", "ketiga", "tiga langkah", "tahap pertama", "nomor satu", "nomor dua", "urutan pengerjaan"],
    "HAND_RAISING": ["angkat tangan", "ingin menjawab", "siapa yang ingin", "punya pertanyaan", "satu orang siswa", "berpartisipasi"],
    "HEAD_NOD_YES": ["betul", "saya setuju", "tepat sekali", "sudah benar", "saya mengonfirmasi", "sudah sesuai"],
    "SHAKING_HEAD_NO": ["belum tepat", "kurang sesuai", "belum benar", "tidak tepat", "perlu diperbaiki", "perlu kita koreksi", "maaf"],
    "CLAPPING": ["luar biasa", "tepuk tangan", "bagus sekali", "layak mendapatkan apresiasi", "sangat baik", "berhasil menjelaskan"],
    "THANKFUL": ["terima kasih", "berterima kasih", "saya apresiasi", "kehadiran", "kontribusi", "partisipasi aktif"],
    "THINKING": ["coba pikirkan", "renungkan", "apa yang terjadi", "menganalisis", "pikirkan kemungkinan", "berpikir kritis"],
    "BASHFUL": ["tidak apa-apa", "masih ragu", "tidak perlu malu", "terasa sulit", "tidak ada yang merasa tertinggal", "belum sempurna"],
    "PATTING": ["tetap semangat", "saya yakin", "usaha kalian", "jangan menyerah", "jalur yang benar", "dukungan"],
    "CHECK_UNDERSTANDING": ["apakah", "sudah dipahami", "jelas", "paham", "cek pemahaman", "oke"],
}

CANONICAL_ASSET = {
    "STANDING_GREETING": "StandingGreeting.glb",
    "TALKING_EXPLAINING": "Talking_Explaining.glb",
    "TALKING_OPEN_HAND": "Talking_OpenHand.glb",
    "TALKING_ARGUMEN": "Talking_Argumen.glb",
    "TALKING_ARGUMENT": "Talking_Argumen.glb",
    "TALKING_COMPARING": "Talking_Comparing.glb",
    "TALKING_PRESENTING": "Talking_Presenting.glb",
    "TALKING": "Talking_Explaining.glb",
    "POINTING": "Pointing.glb",
    "LOOKING": "Looking.glb",
    "COUNTING": "Counting.glb",
    "HAND_RAISING": "HandRaising.glb",
    "HEAD_NOD_YES": "HeadNodding.glb",
    "HEAD_NODDING": "HeadNodding.glb",
    "NOD_YES": "HeadNodding.glb",
    "SHAKING_HEAD_NO": "HeadNo.glb",
    "SHAKE_NO": "HeadNo.glb",
    "HEAD_NO": "HeadNo.glb",
    "NO_GESTURE": "HeadNo.glb",
    "CLAPPING": "Clapping.glb",
    "THANKFUL": "Thankful.glb",
    "THINKING": "Thinking.glb",
    "BASHFUL": "Bashful.glb",
    "PATTING": "Patting.glb",
    "CHECK_UNDERSTANDING": "Talking_OpenHand.glb",
}

CANONICAL_TO_FRONTEND = {
    "STANDING_GREETING": "STANDING_GREETING",
    "TALKING_EXPLAINING": "TALKING_EXPLAINING",
    "TALKING_OPEN_HAND": "TALKING_OPEN_HAND",
    "TALKING_ARGUMEN": "TALKING_ARGUMEN",
    "TALKING_ARGUMENT": "TALKING_ARGUMEN",
    "TALKING_COMPARING": "TALKING_COMPARING",
    "TALKING_PRESENTING": "TALKING_PRESENTING",
    "TALKING": "TALKING_EXPLAINING",
    "POINTING": "POINTING",
    "LOOKING": "LOOKING",
    "COUNTING": "COUNTING",
    "HAND_RAISING": "HAND_RAISING",
    "HEAD_NOD_YES": "HEAD_NOD_YES",
    "HEAD_NODDING": "HEAD_NOD_YES",
    "NOD_YES": "HEAD_NOD_YES",
    "SHAKING_HEAD_NO": "SHAKING_HEAD_NO",
    "SHAKE_NO": "SHAKING_HEAD_NO",
    "HEAD_NO": "SHAKING_HEAD_NO",
    "NO_GESTURE": "SHAKING_HEAD_NO",
    "CLAPPING": "CLAPPING",
    "THANKFUL": "THANKFUL",
    "THINKING": "THINKING",
    "BASHFUL": "BASHFUL",
    "PATTING": "PATTING",
    "ACKNOWLEDGING": "HEAD_NOD_YES",
    "THUMBS_UP": "CLAPPING",
    "CHECK_UNDERSTANDING": "TALKING_OPEN_HAND",
}


def norm_text(text: str) -> str:
    return re.sub(r"\s+", " ", str(text).lower().strip())


def hint_in_text(hint: str, text: str) -> bool:
    h = hint.lower().strip()
    if len(h) <= 3 and " " not in h:
        return re.search(rf"\b{re.escape(h)}\b", text) is not None
    return h in text


def rule_score(text: str) -> Tuple[str | None, int]:
    t = norm_text(text)
    priority = [
        "SHAKING_HEAD_NO",
        "POINTING",
        "LOOKING",
        "COUNTING",
        "HAND_RAISING",
        "HEAD_NOD_YES",
        "CLAPPING",
        "THANKFUL",
        "THINKING",
        "BASHFUL",
        "PATTING",
        "STANDING_GREETING",
        "TALKING_ARGUMEN",
        "TALKING_COMPARING",
        "TALKING_PRESENTING",
        "TALKING_OPEN_HAND",
        "TALKING_EXPLAINING",
        "CHECK_UNDERSTANDING",
    ]
    for key in priority:
        score = sum(1 for h in RULE_HINTS.get(key, []) if hint_in_text(h, t))
        if score:
            return key, score

    if re.search(r"\b(apakah|apa)\b", t) and re.search(r"\b(benar|paham|jelas|dipahami)\b", t):
        return "CHECK_UNDERSTANDING", 1

    return None, 0

def canonical_from_animation_file(animation_file: str) -> str:
    name = str(animation_file).strip()
    stem = Path(name).stem.lower()
    stem_norm = re.sub(r"[\s\-\(\)]+", "_", stem)
    stem_norm = re.sub(r"_+", "_", stem_norm).strip("_")

    if "standinggreeting" in stem_norm or ("standing" in stem and "greeting" in stem):
        return "STANDING_GREETING"
    if "talking_argumen" in stem_norm or "talking_argument" in stem_norm:
        return "TALKING_ARGUMEN"
    if "talking_comparing" in stem_norm or "comparing" in stem_norm:
        return "TALKING_COMPARING"
    if "talking_explaining" in stem_norm or "explaining" in stem_norm:
        return "TALKING_EXPLAINING"
    if "talking_openhand" in stem_norm or "talking_open_hand" in stem_norm or "openhand" in stem_norm:
        return "TALKING_OPEN_HAND"
    if "talking_presenting" in stem_norm or "presenting" in stem_norm:
        return "TALKING_PRESENTING"
    if "headno" in stem_norm or "head_no" in stem_norm or ("head" in stem and "no" in stem):
        return "SHAKING_HEAD_NO"
    if "headnodding" in stem_norm or ("head" in stem and ("nod" in stem or "nodding" in stem)):
        return "HEAD_NOD_YES"
    if ("hand" in stem and "raising" in stem) or "handraising" in stem_norm:
        return "HAND_RAISING"
    if "pointing" in stem:
        return "POINTING"
    if "looking" in stem:
        return "LOOKING"
    if "counting" in stem:
        return "COUNTING"
    if "clapping" in stem:
        return "CLAPPING"
    if "thankful" in stem:
        return "THANKFUL"
    if "thinking" in stem:
        return "THINKING"
    if "bashful" in stem:
        return "BASHFUL"
    if "patting" in stem:
        return "PATTING"
    if "talking" in stem:
        m = re.search(r"talking\s*\((\d+)\)", stem)
        if m:
            legacy_map = {
                "1": "TALKING_OPEN_HAND",
                "2": "TALKING_ARGUMEN",
                "3": "TALKING_COMPARING",
                "4": "TALKING_PRESENTING",
                "5": "TALKING_EXPLAINING",
                "6": "TALKING_EXPLAINING",
            }
            return legacy_map.get(m.group(1), "TALKING_EXPLAINING")
        return "TALKING_EXPLAINING"
    if "shaking" in stem and "head" in stem:
        return "SHAKING_HEAD_NO"
    if stem == "no" or stem_norm == "no":
        return "SHAKING_HEAD_NO"
    return stem_norm.upper()

def load_assets():
    if not MODEL_PATH.exists() or not MAPPING_PATH.exists():
        raise FileNotFoundError(f"Model/mapping belum tersedia. Cek: {MODEL_PATH} dan {MAPPING_PATH}")
    bundle = joblib.load(MODEL_PATH)
    mapping = json.loads(MAPPING_PATH.read_text(encoding="utf-8"))
    model = bundle["model"] if isinstance(bundle, dict) and "model" in bundle else bundle
    return model, mapping


def get_mapping_info(label_or_file: str, mapping: dict) -> dict:
    alias = {
        "NOD_YES": "HEAD_NOD_YES",
        "HEAD_NODDING": "HEAD_NOD_YES",
        "SHAKE_NO": "SHAKING_HEAD_NO",
        "HEAD_NO": "SHAKING_HEAD_NO",
        "NO_GESTURE": "SHAKING_HEAD_NO",
        "TALKING_ARGUMENT": "TALKING_ARGUMEN",
    }
    key = str(label_or_file or "").strip()
    mapped_key = alias.get(key.upper(), key)
    if mapped_key in mapping:
        return mapping[mapped_key]
    if key in mapping:
        return mapping[key]
    canonical = alias.get(key.upper(), canonical_from_animation_file(key))
    if canonical in mapping:
        return mapping[canonical]
    anim = CANONICAL_ASSET.get(canonical)
    if anim and anim in mapping:
        return mapping[anim]
    return {}


def asset_exists(name: str) -> bool:
    return bool(name) and (GESTURE_DIR / name).exists()


def find_actual_asset(canonical_label: str, predicted_file: str, mapping: dict) -> str:
    canonical_label = str(canonical_label or "").upper()
    preferred = CANONICAL_ASSET.get(canonical_label, "")
    if asset_exists(preferred):
        return preferred

    info = get_mapping_info(canonical_label, mapping) or get_mapping_info(predicted_file, mapping)
    candidates = [
        info.get("animation_file", ""),
        preferred,
        predicted_file,
        "Talking_Explaining.glb",
    ]
    for candidate in candidates:
        if asset_exists(candidate):
            return candidate

    target = (preferred or predicted_file or canonical_label).replace(".fbx", "").replace(".glb", "").lower().replace("_", " ")
    for ext in ("*.glb", "*.fbx"):
        for f in GESTURE_DIR.glob(ext):
            name = f.stem.lower().replace("_", " ")
            if target and (target in name or name in target):
                return f.name
    return candidates[0] or "Talking_Explaining.glb"

def frontend_path_for(canonical_label: str, animation_file: str) -> str:
    if animation_file and str(animation_file).lower().endswith(".glb"):
        return f"/animations/gesture_pedagogik/{animation_file}"
    preferred = CANONICAL_ASSET.get(str(canonical_label or "").upper(), animation_file)
    return f"/animations/gesture_pedagogik/{preferred}"

def predict(text: str) -> dict:
    model, mapping = load_assets()
    ml_prediction = str(model.predict([text])[0])
    ml_canonical = canonical_from_animation_file(ml_prediction)
    confidence = 0.0
    top3 = []

    if hasattr(model, "predict_proba"):
        probs = model.predict_proba([text])[0]
        classes = list(model.classes_)
        ranked = sorted(zip(classes, probs), key=lambda x: x[1], reverse=True)
        confidence = float(ranked[0][1])
        top3 = []
        for c, p in ranked[:3]:
            cc = canonical_from_animation_file(str(c))
            top3.append({
                "gesture_label": CANONICAL_TO_FRONTEND.get(cc, cc),
                "canonical_label": cc,
                "animation_file": str(c),
                "score": round(float(p), 4),
            })

    rule_label, hit = rule_score(text)
    final_canonical = rule_label if hit >= 1 else ml_canonical
    animation_file = find_actual_asset(final_canonical, ml_prediction, mapping)
    info = get_mapping_info(final_canonical, mapping) or get_mapping_info(animation_file, mapping)
    frontend_clip = CANONICAL_TO_FRONTEND.get(final_canonical, final_canonical)

    result = {
        "success": True,
        "input_text": text,
        "gesture_label": frontend_clip,
        "canonical_label": final_canonical,
        "animation_file": animation_file,
        "animation_clip": frontend_clip,
        "frontend_animation_clip": frontend_clip,
        "frontend_animation_path": frontend_path_for(final_canonical, animation_file),
        "confidence": round(confidence, 4),
        "decision_source": "rule+ml" if hit >= 1 else "ml",
        "ml_prediction": ml_prediction,
        "ml_canonical": ml_canonical,
        "rule_hits": hit,
        "top3": top3,
        "pedagogic_category": info.get("pedagogic_category", ""),
        "pedagogic_analysis": info.get("pedagogic_analysis", ""),
        "data_type": info.get("data_type", ""),
        "gesture_function": info.get("pedagogic_analysis", ""),
        "pedagogical_context": info.get("pedagogic_category", ""),
    }

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("text_positional", nargs="*", help="Kalimat input")
    parser.add_argument("--text", default=None, help="Kalimat input")
    parser.add_argument("--pretty", action="store_true", help="Cetak JSON berformat rapi")
    args = parser.parse_args()
    text = args.text or " ".join(args.text_positional)
    if not text.strip():
        raise ValueError("Teks input kosong")
    print(json.dumps(predict(text), ensure_ascii=False, indent=2 if args.pretty else None))


if __name__ == "__main__":
    main()
