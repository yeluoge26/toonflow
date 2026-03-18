import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { generateTitle, selectBestCoverFrame } from "@/utils/distribution";
const router = express.Router();

// Auto-generate publish metadata (title, cover, tags) from project
export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
  }),
  async (req, res) => {
    try {
      const { projectId, scriptId } = req.body;

      const script = await u.db("t_script").where("id", scriptId).select("content").first();
      if (!script?.content) return res.status(400).send(error("剧本内容为空"));

      const project = await u.db("t_project").where("id", projectId).first();

      // Generate title
      const title = await generateTitle(script.content);

      // Get storyboard images for cover selection
      const images = await u.db("t_image").where("scriptId", scriptId).select("filePath");
      const imagePaths = images.map((img: any) => img.filePath);
      const coverImage = await selectBestCoverFrame(imagePaths);

      // Auto-generate tags from project metadata
      const tags = [project?.type, project?.artStyle, "AI短剧", "ToonFlow"].filter(Boolean);

      res.status(200).send(
        success({
          title,
          description: `${project?.name || ""} - ${project?.intro || ""}`.trim(),
          coverImage,
          tags,
        }),
      );
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  },
);
