import argparse
import json
import os
import joblib
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", default="../dataset/gesture_text_dataset_v1.csv")
    parser.add_argument("--mapping", default="../dataset/gesture_animation_mapping.json")
    parser.add_argument("--output-dir", default="./model")
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)

    if not os.path.exists(args.dataset):
        raise FileNotFoundError(f"Dataset tidak ditemukan: {args.dataset}")

    if not os.path.exists(args.mapping):
        raise FileNotFoundError(f"Mapping gesture tidak ditemukan: {args.mapping}")

    df = pd.read_csv(args.dataset)
    df = df.dropna(subset=["text", "gesture_label"])

    X = df["text"].astype(str)
    y = df["gesture_label"].astype(str)

    if y.nunique() < 2:
        raise ValueError("Dataset harus memiliki minimal 2 label gesture.")

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y
    )

    # FIX:
    # Gunakan solver lbfgs karena dataset gesture memiliki banyak kelas.
    # liblinear bermasalah pada multiclass di konfigurasi scikit-learn tertentu.
    model = Pipeline([
        ("tfidf", TfidfVectorizer(
            lowercase=True,
            ngram_range=(1, 2),
            max_features=10000
        )),
        ("clf", LogisticRegression(
            max_iter=3000,
            class_weight="balanced",
            solver="lbfgs"
        ))
    ])

    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    labels = sorted(y.unique())

    model_path = os.path.join(args.output_dir, "gesture_text_classifier.pkl")
    joblib.dump(model, model_path)

    cm = confusion_matrix(y_test, y_pred, labels=labels)
    pd.DataFrame(cm, index=labels, columns=labels).to_csv(
        os.path.join(args.output_dir, "confusion_matrix.csv"),
        encoding="utf-8"
    )

    report = classification_report(
        y_test,
        y_pred,
        labels=labels,
        output_dict=True,
        zero_division=0
    )

    metrics = {
        "accuracy": accuracy_score(y_test, y_pred),
        "classification_report": report,
        "labels": labels,
        "model_path": model_path
    }

    with open(os.path.join(args.output_dir, "metrics.json"), "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2, ensure_ascii=False)

    with open(args.mapping, "r", encoding="utf-8") as f:
        mapping = json.load(f)

    with open(os.path.join(args.output_dir, "gesture_animation_mapping.json"), "w", encoding="utf-8") as f:
        json.dump(mapping, f, indent=2, ensure_ascii=False)

    print("Training selesai.")
    print("Jumlah data:", len(df))
    print("Jumlah label:", y.nunique())
    print("Label:", ", ".join(labels))
    print("Accuracy:", metrics["accuracy"])
    print("Model saved:", model_path)
    print("Confusion matrix saved:", os.path.join(args.output_dir, "confusion_matrix.csv"))
    print("Metrics saved:", os.path.join(args.output_dir, "metrics.json"))

if __name__ == "__main__":
    main()