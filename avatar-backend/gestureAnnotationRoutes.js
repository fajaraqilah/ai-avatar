import express from "express";
import {
  saveGestureAnnotation,
  listGestureAnnotations,
  getGestureAnnotationCSVPath
} from "./gestureAnnotationStore.js";

const router = express.Router();

router.post("/gesture-log", (req, res) => {
  try {
    const saved = saveGestureAnnotation({
      ...req.body,
      validation_status: req.body?.validation_status || "system-log"
    });

    res.json({
      success: true,
      message: "Log gesture guru virtual berhasil disimpan.",
      data: saved
    });
  } catch (error) {
    console.error("gesture-log error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal menyimpan log gesture.",
      error: error.message
    });
  }
});

router.post("/gesture-annotate", (req, res) => {
  try {
    const saved = saveGestureAnnotation({
      ...req.body,
      validation_status: req.body?.validation_status || "validated"
    });

    res.json({
      success: true,
      message: "Anotasi gesture berhasil disimpan.",
      data: saved
    });
  } catch (error) {
    console.error("gesture-annotate error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal menyimpan anotasi gesture.",
      error: error.message
    });
  }
});

router.get("/gesture-annotations", (req, res) => {
  try {
    const limit = Number(req.query.limit || 100);
    res.json({
      success: true,
      data: listGestureAnnotations(limit)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal membaca data anotasi gesture.",
      error: error.message
    });
  }
});

router.get("/gesture-annotations/export", (req, res) => {
  try {
    res.download(getGestureAnnotationCSVPath(), "gesture_annotations.csv");
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengekspor dataset anotasi gesture.",
      error: error.message
    });
  }
});

export default router;
