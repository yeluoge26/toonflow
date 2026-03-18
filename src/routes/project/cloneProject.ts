import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    newName: z.string().optional(),
  }),
  async (req, res) => {
    try {
      const { projectId, newName } = req.body;

      const project = await u.db("t_project").where("id", projectId).first();
      if (!project) return res.status(404).send(error("项目不存在"));

      // Clone project
      const [newProjectId] = await u.db("t_project").insert({
        name: newName || `${project.name} (副本)`,
        intro: project.intro,
        type: project.type,
        artStyle: project.artStyle,
        videoRatio: project.videoRatio,
        userId: project.userId,
        createTime: Date.now(),
      });

      // Clone novels
      const novels = await u.db("t_novel").where("projectId", projectId).select("*");
      if (novels.length > 0) {
        await u.db("t_novel").insert(
          novels.map((n: any) => ({
            projectId: newProjectId,
            reel: n.reel,
            chapter: n.chapter,
            chapterData: n.chapterData,
            chapterIndex: n.chapterIndex,
          }))
        );
      }

      // Clone assets
      const assets = await u.db("t_assets").where("projectId", projectId).select("*");
      if (assets.length > 0) {
        await u.db("t_assets").insert(
          assets.map((a: any) => ({
            projectId: newProjectId,
            name: a.name,
            type: a.type,
            intro: a.intro,
            filePath: a.filePath,
            prompt: a.prompt,
            remark: a.remark,
          }))
        );
      }

      // Clone storyline
      const storylines = await u.db("t_storyline").where("projectId", projectId).select("*");
      if (storylines.length > 0) {
        await u.db("t_storyline").insert(
          storylines.map((s: any) => ({
            projectId: newProjectId,
            name: s.name,
            content: s.content,
            novelIds: s.novelIds,
          }))
        );
      }

      res.status(200).send(success({
        id: newProjectId,
        message: `项目已克隆为 "${newName || project.name + ' (副本)'}"`,
      }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  }
);
