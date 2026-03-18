import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

// Import a role asset into the character IP system
export default router.post(
  "/",
  validateFields({
    assetsId: z.number(),
    makeGlobal: z.boolean().optional().default(false),
  }),
  async (req, res) => {
    try {
      const { assetsId, makeGlobal } = req.body;

      const asset = await u.db("t_assets").where("id", assetsId).where("type", "role").first();

      if (!asset) return res.status(404).send(error("角色资产不存在"));

      // Get reference images
      const images = await u.db("t_image").where("assetsId", assetsId).select("filePath");
      const imagePaths = images.map((img: any) => img.filePath).filter(Boolean);

      // Get project art style
      const project = await u.db("t_project").where("id", asset.projectId).first();

      const [id] = await u.db("t_character").insert({
        name: asset.name,
        description: (asset as any).describe || asset.intro || "",
        projectId: makeGlobal ? null : asset.projectId,
        artStyle: project?.artStyle || "",
        referenceImages: JSON.stringify(imagePaths),
        stateHistory: JSON.stringify([]),
        isPublic: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      res.status(200).send(
        success({
          id,
          message: `角色 "${asset.name}" 已导入IP系统${makeGlobal ? "（全局）" : ""}`,
        }),
      );
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  },
);
