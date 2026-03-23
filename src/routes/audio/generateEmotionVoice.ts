import express from "express";
import { success, error } from "@/lib/responseFormat";
import { generateVoice, loadVoiceProfile, detectEmotion } from "@/lib/voiceEngine";
const router = express.Router();
export default router.post("/", async (req, res) => {
  const { text, characterId, emotion: emotionOverride } = req.body;
  if (!text || !characterId) return res.status(400).send(error("text and characterId required"));
  const profile = await loadVoiceProfile(characterId);
  if (!profile) return res.status(404).send(error("Voice profile not found"));
  const emotion = emotionOverride || detectEmotion(text);
  const audio = await generateVoice(text, profile, emotion);
  if (!audio) return res.status(500).send(error("Voice generation failed"));
  res.set({ "Content-Type": "audio/mpeg", "Content-Length": audio.length.toString() });
  res.send(audio);
});
