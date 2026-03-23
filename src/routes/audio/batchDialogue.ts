import express from "express";
import { success, error } from "@/lib/responseFormat";
import { batchGenerateDialogue } from "@/lib/voiceEngine";
const router = express.Router();
export default router.post("/", async (req, res) => {
  const { dialogues } = req.body;
  if (!dialogues || !Array.isArray(dialogues)) return res.status(400).send(error("dialogues array required"));
  const results = await batchGenerateDialogue(dialogues);
  const summary = results.map(r => ({ text: r.text, emotion: r.emotion, hasAudio: !!r.audio }));
  res.status(200).send(success(summary));
});
