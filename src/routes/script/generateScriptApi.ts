import express from "express";
import u from "@/utils";
import { z } from "zod";
import { error, success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { generateScript } from "@/utils/generateScript";
const router = express.Router();
interface NovelChapter {
  id: number;
  reel: string;
  chapter: string;
  chapterData: string;
  projectId: number;
}
function mergeNovelText(novelData: NovelChapter[]): string {
  if (!Array.isArray(novelData)) return "";
  return novelData
    .map((chap) => {
      return `${chap.chapter.trim()}\n\n${chap.chapterData.trim().replace(/\r?\n/g, "\n")}\n`;
    })
    .join("\n");
}

// 生成剧本
export default router.post(
  "/",
  validateFields({
    outlineId: z.number(),
    scriptId: z.number(),
    style: z.enum(["shuangwen", "emotion", "suspense"]).optional(),
  }),
  async (req, res) => {
    const { outlineId, scriptId, style } = req.body;
    const outlineData = await u.db("t_outline").where("id", outlineId).select("*").first();
    if (!outlineData) return res.status(400).send(error("大纲为空"));
    const parameter = JSON.parse(outlineData.data!);

    const novelData = (await u
      .db("t_novel")
      .whereIn("chapterIndex", parameter.chapterRange)
      .where("projectId", outlineData.projectId)
      .select("*")) as NovelChapter[];

    if (novelData.length == 0) return res.status(400).send(error("原文为空"));

    const result: string = mergeNovelText(novelData);
    try {
      const data = await generateScript(parameter ?? "", result ?? "", style);
      if (!data) return res.status(500).send({ message: "生成剧本失败" });

      await u.db("t_script").where("id", scriptId).update({
        content: data,
      });

      res.status(200).send(success({ message: "生成剧本成功" }));
    } catch (e) {
      const errMsg = u.error(e).message || "生成剧本失败";
      res.status(500).send(error(errMsg));
    }
  },
);
