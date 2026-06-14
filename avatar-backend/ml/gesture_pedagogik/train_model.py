# -*- coding: utf-8 -*-
"""Compatibility wrapper.
Jalankan file ini jika ingin training dari folder ml/gesture_pedagogik.
Script utama yang dipakai backend adalah ../train_pedagogic_gesture_from_excel.py.
"""
from __future__ import annotations

import runpy
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "train_pedagogic_gesture_from_excel.py"
runpy.run_path(str(SCRIPT), run_name="__main__")
