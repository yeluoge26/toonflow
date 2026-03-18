import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { extractDialogues } from "@/utils/ai/audio";
import taskQueue from "@/lib/taskQueue";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    scriptId: z.number(),
    projectId: z.number(),
  }),
  async (req, res) => {
    try {
      const { scriptId, projectId } = req.body;

      const script = await u.db("t_script").where("id", scriptId).select("content").first();
      if (!script?.content) return res.status(400).send(error("剧本内容为空"));

      const dialogues = extractDialogues(script.content);
      if (dialogues.length === 0) return res.status(400).send(error("未检测到对白内容"));

      // Get character voice mappings
      const characters = await u.db("t_assets")
        .where("projectId", projectId)
        .where("type", "role")
        .select("name", "remark");

      const voiceMap = new Map<string, string>();
      for (const char of characters) {
        try {
          if (char.remark) {
            const meta = JSON.parse(char.remark);
            if (meta.voiceId && char.name) voiceMap.set(char.name, meta.voiceId);
          }
        } catch {}
      }

      // Enqueue each dialogue as a task
      const taskIds: number[] = [];
      for (const dialogue of dialogues) {
        const taskId = await taskQueue.enqueue({
          type: "audio",
          projectId,
          scriptId,
          data: {
            text: dialogue.line,
            character: dialogue.character,
            voiceId: voiceMap.get(dialogue.character) || undefined,
            emotion: dialogue.emotion || "neutral",
          },
        });
        taskIds.push(taskId);
      }

      res.status(200).send(success({
        message: `已提交 ${taskIds.length} 条对白生成任务`,
        taskIds,
        dialogueCount: dialogues.length,
      }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  }
);
