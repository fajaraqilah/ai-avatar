#!/usr/bin/env python
"""
Simple text classifier wrapper.

Usage:
  - Train: `py textClassifier.py --train`
  - Predict from file: `py textClassifier.py --file path/to/text.txt`
  - Predict from arg: `py textClassifier.py --text "Some text"`

Outputs JSON to stdout: {"predictions":[{"label":"...","confidence":0.9}, ...]}
"""
import argparse
import json
import os
import sys

MODEL_PATH = "classifier_model.pkl"
CSV_PATH = "dataset_gesture_training.csv"

def eprint(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)

def train():
    try:
        import pandas as pd
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.linear_model import LogisticRegression
        from sklearn.pipeline import make_pipeline
        from joblib import dump
    except Exception as e:
        eprint("Missing training dependencies:", e)
        sys.exit(2)

    if not os.path.exists(CSV_PATH):
        eprint(f"Training CSV not found at {CSV_PATH}")
        sys.exit(2)

    df = pd.read_csv(CSV_PATH)
    if 'text' not in df.columns or 'label' not in df.columns:
        eprint('CSV must contain `text` and `label` columns')
        sys.exit(2)

    X = df['text'].astype(str).tolist()
    y = df['label'].astype(str).tolist()

    clf = make_pipeline(TfidfVectorizer(max_features=5000, ngram_range=(1,2)), LogisticRegression(max_iter=1000, class_weight="balanced"))
    clf.fit(X, y)
    dump(clf, MODEL_PATH)
    eprint('Model trained and saved to', MODEL_PATH)

def predict_text(text):
    try:
        from joblib import load
    except Exception as e:
        eprint('Missing runtime dependencies:', e)
        sys.exit(2)

    if not os.path.exists(MODEL_PATH):
        eprint('Model not found, run with --train first')
        sys.exit(2)

    clf = load(MODEL_PATH)
    # scikit-learn pipeline: predict_proba may be available
    labels = []
    try:
        probs = clf.predict_proba([text])[0]
        candidates = clf.classes_
        pairs = sorted(zip(candidates, probs), key=lambda x: -x[1])
        for lab, p in pairs[:5]:
            # Only include predictions with reasonable confidence
            if float(p) >= 0.1:  # Minimum confidence threshold
                labels.append({"label": str(lab), "confidence": float(p)})
    except Exception:
        pred = clf.predict([text])[0]
        labels.append({"label": str(pred), "confidence": 1.0})

    print(json.dumps({"predictions": labels}))

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--train', action='store_true')
    parser.add_argument('--file')
    parser.add_argument('--text')
    args = parser.parse_args()

    if args.train:
        train()
        return

    text = None
    if args.file:
        if not os.path.exists(args.file):
            eprint('File not found:', args.file)
            sys.exit(2)
        with open(args.file, 'r', encoding='utf-8', errors='ignore') as f:
            text = f.read()
    elif args.text:
        text = args.text
    else:
        eprint('No input provided; use --file or --text')
        sys.exit(2)

    predict_text(text)

if __name__ == '__main__':
    main()
