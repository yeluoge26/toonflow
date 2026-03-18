import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

// Batch generate shot descriptions for all segments in a script
export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
    shotsPerSegment: z.number().optional().default(4),
  }),
  async (req, res) => {
    try {
      const { projectId, scriptId, shotsPerSegment } = req.body;

      const script = await u.db("t_script").where("id", scriptId).first();
      if (!script?.content) return res.status(400).send(error("剧本内容为空"));

      const promptAi = await u.getPromptAi("storyboardAgent") as any;
      if (!promptAi?.apiKey) return res.status(400).send(error("未配置分镜AI模型"));

      // Get project art style
      const project = await u.db("t_project").where("id", projectId).first();

      const result = await u.ai.text.invoke(
        {
          system: `你是专业分镜师。将剧本拆分为分镜片段，每个片段生成${shotsPerSegment}个镜头。

输出JSON格式：
[
  {
    "segmentTitle": "片段标题",
    "shots": [
      {
        "title": "镜头标题",
        "description": "详细画面描述",
        "shotType": "medium",
        "cameraMove": "static",
        "emotion": "紧张",
        "duration": 3
      }
    ]
  }
]

画风: ${project?.artStyle || "电影感"}
只输出JSON，不要其他内容。`,
          prompt: (script.content as string).slice(0, 4000),
        },
        promptAi
      );

      const text = result?.text || String(result);
      let segments: any[] = [];
      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) segments = JSON.parse(jsonMatch[0]);
      } catch {}

      // Save to chat history
      await u.db("t_chatHistory").where({ projectId, type: "storyboard" }).delete();
      await u.db("t_chatHistory").insert({
        projectId,
        type: "storyboard",
        data: JSON.stringify(segments),
        createdAt: Date.now(),
      } as any);

      const totalShots = segments.reduce((sum: number, seg: any) => sum + (seg.shots?.length || 0), 0);

      res.status(200).send(success({
        segmentCount: segments.length,
        totalShots,
        segments,
      }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  }
);
