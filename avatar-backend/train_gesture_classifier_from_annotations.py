import os
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "annotations", "gesture_annotations.csv")
MODEL_PATH = os.path.join(BASE_DIR, "annotation_gesture_classifier.pkl")

TEXT_COLUMNS = ["user_input", "ai_response", "pedagogical_context", "gesture_function"]

def build_text(row):
    return " ".join(str(row[col]) for col in TEXT_COLUMNS if col in row and pd.notna(row[col])).strip()

def main():
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Dataset anotasi tidak ditemukan: {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)
    df = df.dropna(subset=["gold_gesture_label"])
    df = df[df["gold_gesture_label"].astype(str).str.strip() != ""]
    df["training_text"] = df.apply(build_text, axis=1)
    df = df[df["training_text"].str.len() > 0]

    if len(df) < 10:
        print("PERINGATAN: Data anotasi masih sedikit. Tambahkan data validasi agar evaluasi lebih stabil.")

    X = df["training_text"].astype(str)
    y = df["gold_gesture_label"].astype(str)
    stratify = y if y.nunique() > 1 and y.value_counts().min() >= 2 else None

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=stratify)

    model = Pipeline([
        ("tfidf", TfidfVectorizer(lowercase=True, ngram_range=(1, 2), max_features=8000)),
        ("clf", LogisticRegression(max_iter=1500, class_weight="balanced")),
    ])
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    print("Jumlah data:", len(df))
    print("Jumlah label:", y.nunique())
    print("Accuracy:", accuracy_score(y_test, y_pred))
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, zero_division=0))
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))
    joblib.dump(model, MODEL_PATH)
    print(f"\nModel tersimpan di: {MODEL_PATH}")

if __name__ == "__main__":
    main()
