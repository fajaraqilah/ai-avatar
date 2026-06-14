import express from "express";
import { classifyGestureML, fallbackGestureML } from "../services/gestureMLClassifierService.js";

const router = express.Router();

router.post("/gesture-ml-classify", async (req, res) => {
  try {
    const text = req.body.text || req.body.message || "";

    if (!text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Parameter text/message wajib diisi."
      });
    }

    const result = await classifyGestureML(text);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("gesture-ml-classify error:", error);

    res.status(500).json({
      success: false,
      message: "Gagal melakukan klasifikasi gesture ML.",
      error: error.message,
      data: fallbackGestureML(req.body.text || req.body.message || "")
    });
  }
});

export default router;
