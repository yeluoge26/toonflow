import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
  }),
  async (req, res) => {
    const { projectId } = req.body;
    const characters = await u
      .db("t_assets")
      .where("projectId", projectId)
      .where("type", "role")
      .select("*");

    // Also get their reference images
    const result = await Promise.all(
      characters.map(async (char: any) => {
        const images = await u
          .db("t_image")
          .where("assetsId", char.id)
          .select("filePath");
        return {
          ...char,
          referenceImages: images.map((img: any) => img.filePath),
        };
      }),
    );

    res.status(200).send(success(result));
  },
);
