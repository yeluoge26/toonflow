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
  }),
  async (req, res) => {
    try {
      const { projectId } = req.body;
      const identities = await u
        .db("t_character_identity")
        .where("projectId", projectId)
        .select("*");

      // Enrich with reference images from t_image if assetsId is present
      const result = await Promise.all(
        identities.map(async (identity: any) => {
          let referenceImages: string[] = [];
          if (identity.assetsId) {
            const images = await u
              .db("t_image")
              .where("assetsId", identity.assetsId)
              .select("filePath");
            referenceImages = images.map((img: any) => img.filePath).filter(Boolean);
          }
          return {
            ...identity,
            referenceImages,
          };
        }),
      );

      res.status(200).send(success(result));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  },
);
