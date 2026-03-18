import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { extractDialogues } from "@/utils/ai/audio";
const router = express.Router();

// Extract dialogues from script and prepare for batch TTS
export default router.post(
  "/",
  validateFields({
    scriptId: z.number(),
    projectId: z.number(),
  }),
  async (req, res) => {
    try {
      const { scriptId, projectId } = req.body;
      const u = (await import("@/utils")).default;

      const script = await u.db("t_script").where("id", scriptId).select("content").first();
      if (!script?.content) return res.status(400).send(error("剧本内容为空"));

      const dialogues = extractDialogues(script.content);

      // Match characters with their voice IDs from assets
      const characters = await u.db("t_assets")
        .where("projectId", projectId)
        .where("type", "role")
        .select("name", "voiceId");

      const voiceMap = new Map(characters.map((c: any) => [c.name, c.voiceId]));

      const enrichedDialogues = dialogues.map((d) => ({
        ...d,
        voiceId: voiceMap.get(d.character) || null,
        hasVoice: voiceMap.has(d.character),
      }));

      res.status(200).send(success({
        dialogues: enrichedDialogues,
        totalLines: enrichedDialogues.length,
        charactersWithVoice: enrichedDialogues.filter((d) => d.hasVoice).length,
        charactersWithoutVoice: enrichedDialogues.filter((d) => !d.hasVoice).length,
      }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  }
);
