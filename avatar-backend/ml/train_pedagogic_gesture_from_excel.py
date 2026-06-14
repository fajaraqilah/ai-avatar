# train_pedagogic_gesture_from_excel.py
# Flexible + multiclass-safe training script untuk Dataset Gesture Guru Virtual.
#
# Perbaikan:
# - Mendukung kolom TARGET FILE ANIMASI (.FBX) dan TARGET FILE ANIMASI (.FBX/.GLB)
# - Deteksi header Excel otomatis
# - Menggunakan LogisticRegression solver="lbfgs" agar mendukung multiclass
# - Mapping gesture baru tetap terbaca
# - Patch 2026-06-06: GLB terbaru Pointing/HandRaising/HeadNodding/Looking diprioritaskan

import json
import re
from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline


BASE_DIR = Path(__file__).resolve().parent
DATASET_PATH = BASE_DIR / "gesture_pedagogik" / "dataset" / "Dataset_Gesture_Guru_Virtual_Pedagogik.xlsx"
MODEL_DIR = BASE_DIR / "gesture_pedagogik" / "models"
MODEL_PATH = MODEL_DIR / "gesture_classifier_model.joblib"
MAPPING_PATH = MODEL_DIR / "gesture_mapping.json"
SHEET_NAME = "Korpus Dataset Pedagogik"

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


def clean_col(value):
    text = str(value).strip()
    text = re.sub(r"\s+", " ", text)
    return text


def read_dataset_auto_header(path):
    if not path.exists():
        raise FileNotFoundError(f"Dataset tidak ditemukan: {path}")

    xl = pd.ExcelFile(path)
    sheet = SHEET_NAME if SHEET_NAME in xl.sheet_names else xl.sheet_names[0]

    for header in range(0, 8):
        try:
            df = pd.read_excel(path, sheet_name=sheet, header=header)
            df.columns = [clean_col(c) for c in df.columns]
            cols = " | ".join([str(c).lower() for c in df.columns])
            if ("input teks" in cols or "kalimat guru" in cols or "jawaban guru" in cols) and (
                "target file animasi" in cols or "animasi" in cols
            ):
                return df, sheet, header
        except Exception:
            continue

    df = pd.read_excel(path, sheet_name=sheet)
    df.columns = [clean_col(c) for c in df.columns]
    return df, sheet, 0


def find_column(df, candidates, keyword_sets=None):
    col_map = {clean_col(c).lower(): c for c in df.columns}

    for candidate in candidates:
        key = clean_col(candidate).lower()
        if key in col_map:
            return col_map[key]

    for col in df.columns:
        col_low = clean_col(col).lower()
        for candidate in candidates:
            cand_low = clean_col(candidate).lower()
            if cand_low in col_low:
                return col

    keyword_sets = keyword_sets or []
    for keywords in keyword_sets:
        for col in df.columns:
            col_low = clean_col(col).lower()
            if all(k.lower() in col_low for k in keywords):
                return col

    raise KeyError(
        "\nKolom tidak ditemukan.\n"
        f"Kolom tersedia: {list(df.columns)}\n"
        f"Kandidat dicari: {candidates}\n"
    )


def canonicalize_from_filename(filename):
    name = str(filename).strip()
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

def frontend_path(animation_file, gesture_label=""):
    fname = str(animation_file).strip()
    if fname.lower().endswith(".glb"):
        return f"/animations/gesture_pedagogik/{fname}"
    label = str(gesture_label or "").upper()
    preferred = {
        "POINTING": "Pointing.glb",
        "HAND_RAISING": "HandRaising.glb",
        "HEAD_NOD_YES": "HeadNodding.glb",
        "HEAD_NODDING": "HeadNodding.glb",
        "NOD_YES": "HeadNodding.glb",
        "SHAKING_HEAD_NO": "HeadNo.glb",
        "SHAKE_NO": "HeadNo.glb",
        "LOOKING": "Looking.glb",
        "THINKING": "Thinking.glb",
        "CLAPPING": "Clapping.glb",
        "COUNTING": "Counting.glb",
        "THANKFUL": "Thankful.glb",
        "BASHFUL": "Bashful.glb",
        "PATTING": "Patting.glb",
        "STANDING_GREETING": "StandingGreeting.glb",
        "TALKING_ARGUMEN": "Talking_Argumen.glb",
        "TALKING_COMPARING": "Talking_Comparing.glb",
        "TALKING_EXPLAINING": "Talking_Explaining.glb",
        "TALKING_OPEN_HAND": "Talking_OpenHand.glb",
        "TALKING_PRESENTING": "Talking_Presenting.glb",
    }.get(label)
    if preferred:
        return f"/animations/gesture_pedagogik/{preferred}"
    return f"/animations/gesture_pedagogik/{fname}"


def safe_value(row, col):
    if not col:
        return ""
    value = row.get(col, "")
    if pd.isna(value):
        return ""
    return str(value).strip()


def main():
    df, used_sheet, header_row = read_dataset_auto_header(DATASET_PATH)

    text_col = find_column(
        df,
        [
            "INPUT TEKS PENGAJARAN (KALIMAT GURU)",
            "INPUT TEKS PENGAJARAN (KALIMAT GURU / JAWABAN GURU)",
            "JAWABAN GURU / RESPONS AVATAR (SUMBER KLASIFIKASI)",
            "KALIMAT GURU",
            "JAWABAN GURU",
            "INPUT TEKS",
        ],
        keyword_sets=[["input", "teks"], ["kalimat", "guru"], ["jawaban", "guru"]],
    )

    label_col = find_column(
        df,
        [
            "TARGET FILE ANIMASI (.FBX)",
            "TARGET FILE ANIMASI (.FBX/.GLB)",
            "TARGET FILE ANIMASI",
            "FILE ANIMASI",
            "ANIMASI",
        ],
        keyword_sets=[["target", "animasi"], ["file", "animasi"]],
    )

    optional_cols = {}
    for key, candidates in {
        "category": ["KATEGORI PEDAGOGIK", "PEDAGOGIC CATEGORY"],
        "analysis": ["DIMENSI ANALISIS PEDAGOGIS", "ANALISIS PEDAGOGIS", "PEDAGOGIC ANALYSIS"],
        "dtype": ["TIPE DATA MODEL", "DATA TYPE"],
        "gesture_label": ["GESTURE_LABEL", "GESTURE LABEL", "LABEL GESTURE"],
    }.items():
        try:
            optional_cols[key] = find_column(df, candidates)
        except KeyError:
            optional_cols[key] = None

    df = df.dropna(subset=[text_col, label_col]).copy()
    df[text_col] = df[text_col].astype(str).str.strip()
    df[label_col] = df[label_col].astype(str).str.strip()
    df = df[(df[text_col] != "") & (df[label_col] != "")].copy()

    if df.empty:
        raise ValueError("Dataset kosong setelah dibersihkan. Periksa kolom teks dan target animasi.")

    X = df[text_col].tolist()
    y = df[label_col].tolist()

    # Solver lbfgs mendukung multiclass. Liblinear tidak mendukung multiclass multinomial.
    model = Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(
                    lowercase=True,
                    ngram_range=(1, 2),
                    min_df=1,
                    max_features=10000,
                ),
            ),
            (
                "clf",
                LogisticRegression(
                    max_iter=3000,
                    class_weight="balanced",
                    solver="lbfgs",
                    n_jobs=None,
                ),
            ),
        ]
    )

    model.fit(X, y)

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)

    mapping = {}
    for _, row in df.iterrows():
        animation_file = safe_value(row, label_col)

        gesture_label = safe_value(row, optional_cols["gesture_label"])
        if not gesture_label:
            gesture_label = canonicalize_from_filename(animation_file)

        # Normalisasi label penting agar backend dan frontend memakai kosakata yang sama.
        # Contoh: HeadNodding.glb tetap dikirim ke frontend sebagai HEAD_NOD_YES.
        canonical_label = canonicalize_from_filename(animation_file)
        if gesture_label in {"HEAD_NODDING", "NOD_YES"}:
            canonical_label = "HEAD_NOD_YES"
        elif gesture_label in {"SHAKING_HEAD_NO", "SHAKE_NO"}:
            canonical_label = "SHAKING_HEAD_NO"
        elif gesture_label:
            canonical_label = gesture_label

        frontend_clip = CANONICAL_TO_FRONTEND.get(canonical_label, canonical_label)
        if animation_file == "HeadNodding.glb":
            frontend_clip = "HEAD_NOD_YES"
            canonical_label = "HEAD_NOD_YES"
        entry = {
            "gesture_label": frontend_clip,
            "canonical_label": canonical_label,
            "animation_file": animation_file,
            "animation_clip": frontend_clip,
            "frontend_animation_clip": frontend_clip,
            "frontend_animation_path": frontend_path(animation_file, frontend_clip),
            "gesture_function": safe_value(row, optional_cols["analysis"]),
            "pedagogic_analysis": safe_value(row, optional_cols["analysis"]),
            "pedagogic_category": safe_value(row, optional_cols["category"]),
            "pedagogical_context": safe_value(row, optional_cols["category"]),
            "data_type": safe_value(row, optional_cols["dtype"]),
        }
        for key in {animation_file, gesture_label, canonical_label, frontend_clip}:
            if key:
                mapping[key] = entry

    with open(MAPPING_PATH, "w", encoding="utf-8") as f:
        json.dump(mapping, f, ensure_ascii=False, indent=2)

    print("Training selesai.")
    print(f"Dataset: {DATASET_PATH}")
    print(f"Sheet digunakan: {used_sheet}")
    print(f"Header row index: {header_row}")
    print(f"Kolom teks: {text_col}")
    print(f"Kolom label animasi: {label_col}")
    print(f"Total kalimat training: {len(df)}")
    print(f"Total kelas animasi: {df[label_col].nunique()}")
    print(f"Model tersimpan: {MODEL_PATH}")
    print(f"Mapping tersimpan: {MAPPING_PATH}")


if __name__ == "__main__":
    main()
