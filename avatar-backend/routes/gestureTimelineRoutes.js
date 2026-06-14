import express from "express";
import { buildGestureTimeline } from "../services/gestureTimelineMapper.js";

const router = express.Router();

router.post("/gesture-timeline", (req, res) => {
  try {
    const {
      lipsync,
      gestureSequence,
      audioDuration,
      audioFile,
      sessionId
    } = req.body;

    const timeline = buildGestureTimeline({
      lipsync,
      gestureSequence,
      audioDuration,
      audioFile,
      sessionId
    });

    res.json({
      success: true,
      message: "Timeline mapping gesture berhasil dibuat.",
      data: timeline
    });
  } catch (error) {
    console.error("gesture timeline error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal membuat timeline gesture.",
      error: error.message
    });
  }
});

export default router;
