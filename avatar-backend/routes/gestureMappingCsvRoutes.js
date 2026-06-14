import express from "express";
import { appendMappingSegments, overwriteMappingSegments, getMappingCsvPath, getMappingJsonPath } from "../services/gestureMappingCsvStore.js";
const router = express.Router();
router.post("/gesture-mapping/save-csv", (req,res)=>{ try{ const { segments, meta, mode }=req.body; const result=mode==="overwrite" ? overwriteMappingSegments(segments || [], meta || {}) : appendMappingSegments(segments || [], meta || {}); res.json({ success:true, message:"Hasil mapping gesture berhasil disimpan ke CSV.", count:result.count, csvPath:result.csvPath, jsonPath:result.jsonPath, data:result.data }); }catch(error){ console.error("save gesture mapping csv error:", error); res.status(500).json({ success:false, message:"Gagal menyimpan hasil mapping gesture ke CSV.", error:error.message }); }});
router.get("/gesture-mapping/export-csv", (req,res)=>{ try{ res.download(getMappingCsvPath(), "gesture_mapping_timeline.csv"); }catch(error){ res.status(500).json({ success:false, message:"Gagal mengekspor gesture mapping CSV.", error:error.message }); }});
router.get("/gesture-mapping/export-json", (req,res)=>{ try{ res.download(getMappingJsonPath(), "gesture_mapping_timeline.json"); }catch(error){ res.status(500).json({ success:false, message:"Gagal mengekspor gesture mapping JSON.", error:error.message }); }});
export default router;
