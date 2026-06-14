#!/usr/bin/env python
"""
Simple text classifier wrapper.

Usage:
  - Train: `py textClassifier.py --train`
  - Predict from file: `py textClassifier.py --file path/to/text.txt`
  - Predict from arg: `py textClassifier.py --text "Some text"`
  
  File ini mendukung 2 mode:

1. Training model (membangun model dari dataset CSV).
2. Prediction (memprediksi label gesture dari input teks).

Konfigurasi path

1. MODEL_PATH = "classifier_model.pkl" → lokasi model hasil training yang disimpan.
2. CSV_PATH = "dataset_gesture_training.csv" → dataset training wajib berisi kolom text dan labels.

Outputs JSON to stdout: {"predictions":[{"label":"...","confidence":0.9}, ...]}
"""
import argparse
import json
import os
import sys
import numpy as np

MODEL_PATH = "classifier_model.pkl"
CSV_PATH = "dataset_gesture_training.csv"

def eprint(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)

def train():
    try:
        import pandas as pd
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.multioutput import MultiOutputClassifier
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
    if 'text' not in df.columns or 'labels' not in df.columns:
        eprint('CSV must contain `text` and `labels` columns')
        sys.exit(2)

    X = df['text'].astype(str).tolist()
    
    # Process multi-label data
    all_labels = set()
    for labels_str in df['labels']:
        labels = labels_str.split('|')
        all_labels.update(labels)
    
    all_labels = sorted(list(all_labels))
    
    # Create binary matrix for multi-label classification
    y = np.zeros((len(df), len(all_labels)))
    for i, labels_str in enumerate(df['labels']):
        labels = labels_str.split('|')
        for label in labels:
            if label in all_labels:
                y[i, all_labels.index(label)] = 1

    clf = make_pipeline(
        TfidfVectorizer(max_features=5000, ngram_range=(1,2)), 
        MultiOutputClassifier(LogisticRegression(max_iter=1000, class_weight="balanced"))
    )
    clf.fit(X, y)
    dump((clf, all_labels), MODEL_PATH)
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

    clf, all_labels = load(MODEL_PATH)
    labels = []
    
    try:
        preds = clf.predict([text])[0]
        probs = clf.predict_proba([text])
        
        # For MultiOutputClassifier, probs is a list of arrays, one for each label
        # Each array has shape (n_samples, 2) where [:, 1] is probability of positive class
        for i, (pred, prob_array) in enumerate(zip(preds, probs)):
            if pred == 1:
                # prob_array shape is (1, 2), we want the probability of positive class (index 1)
                confidence = prob_array[0][1] if prob_array.shape[1] > 1 else 0.5
                if confidence >= 0.1:  # Minimum confidence threshold
                    labels.append({
                        "label": all_labels[i], 
                        "confidence": float(confidence)
                    })
    except Exception as e:
        eprint('Prediction error:', e)
        # Fallback to single label prediction
        try:
            single_pred = clf.predict([text])[0]
            if isinstance(single_pred, (list, np.ndarray)) and len(single_pred) > 0:
                # If it's a multi-output prediction
                if hasattr(single_pred, '__len__') and len(single_pred) > 1:
                    # Handle multi-output case
                    for i, pred in enumerate(single_pred):
                        if pred == 1 and i < len(all_labels):
                            labels.append({
                                "label": all_labels[i], 
                                "confidence": 0.5  # Default confidence for fallback
                            })
                else:
                    # Single prediction
                    pred_label = single_pred if isinstance(single_pred, str) else str(single_pred)
                    labels.append({
                        "label": pred_label, 
                        "confidence": 1.0
                    })
        except:
            # Final fallback
            labels.append({
                "label": "normal", 
                "confidence": 1.0
            })

    # Sort by confidence
    labels.sort(key=lambda x: x['confidence'], reverse=True)
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