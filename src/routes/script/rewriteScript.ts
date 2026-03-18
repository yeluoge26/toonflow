import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

// Manually request AI to rewrite specific aspects of a script
export default router.post(
  "/",
  validateFields({
    scriptId: z.number(),
    instruction: z.string(),  // e.g. "增强开头冲突" or "加入更多反转"
  }),
  async (req, res) => {
    try {
      const { scriptId, instruction } = req.body;

      const script = await u.db("t_script").where("id", scriptId).first();
      if (!script?.content) return res.status(404).send(error("剧本不存在或内容为空"));

      const promptAi = await u.getPromptAi("generateScript") as any;
      if (!promptAi?.apiKey) return res.status(400).send(error("未配置剧本AI模型"));

      const result = await u.ai.text.invoke(
        {
          system: "你是专业短视频编剧。请根据用户指令改写剧本，保留核心剧情，只修改指定部分。直接输出改写后的完整剧本。",
          prompt: `原始剧本：\n${script.content}\n\n改写要求：${instruction}`,
        },
        promptAi
      );

      const newContent = result?.text || String(result);

      // Save as new version
      const maxVersion = await u.db("t_script")
        .where("projectId", script.projectId)
        .max("version as maxVer")
        .first();
      const newVersion = (Number((maxVersion as any)?.maxVer) || 0) + 1;

      const [newId] = await u.db("t_script").insert({
        projectId: script.projectId,
        outlineId: script.outlineId,
        content: newContent,
        version: newVersion,
        createTime: Date.now(),
      } as any);

      res.status(200).send(success({
        id: newId,
        version: newVersion,
        instruction,
        contentLength: newContent.length,
      }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  }
);
