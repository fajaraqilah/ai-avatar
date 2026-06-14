# -*- coding: utf-8 -*-
"""Compatibility wrapper untuk prediksi gesture pedagogik.
Contoh:
    python ml/gesture_pedagogik/predict_gesture.py "Perhatikan diagram pada layar"
"""
from __future__ import annotations

import runpy
import sys
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "predict_pedagogic_gesture.py"
# Script utama menerima positional text maupun --text, sehingga argumen diteruskan apa adanya.
sys.argv[0] = str(SCRIPT)
runpy.run_path(str(SCRIPT), run_name="__main__")
