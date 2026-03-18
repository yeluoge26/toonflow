import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { extractDialogues } from "@/utils/ai/audio";
const router = express.Router();

// Generate SRT subtitles from script dialogues
export default router.post(
  "/",
  validateFields({
    scriptId: z.number(),
    projectId: z.number(),
    durationPerLine: z.number().optional().default(3),
  }),
  async (req, res) => {
    try {
      const { scriptId, projectId, durationPerLine } = req.body;

      const script = await u.db("t_script").where("id", scriptId).first();
      if (!script?.content) return res.status(400).send(error("剧本内容为空"));

      const dialogues = extractDialogues(script.content as string);

      // Generate SRT format
      let srtContent = "";
      let currentTime = 0;

      for (let i = 0; i < dialogues.length; i++) {
        const startTime = currentTime;
        const endTime = currentTime + durationPerLine;

        const startStr = formatSRTTime(startTime);
        const endStr = formatSRTTime(endTime);

        srtContent += `${i + 1}\n`;
        srtContent += `${startStr} --> ${endStr}\n`;
        srtContent += `${dialogues[i].character}：${dialogues[i].line}\n\n`;

        currentTime = endTime + 0.5; // 0.5s gap between lines
      }

      // Save SRT file
      const fileName = `${projectId}/subtitles/${scriptId}.srt`;
      await u.oss.writeFile(fileName, Buffer.from(srtContent, "utf-8"));

      res.status(200).send(success({
        filePath: fileName,
        lineCount: dialogues.length,
        totalDuration: currentTime,
        srtContent,
      }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  }
);

function formatSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad3(ms)}`;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function pad3(n: number): string {
  return n.toString().padStart(3, "0");
}
