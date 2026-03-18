import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    id: z.number(),
    name: z.string().optional(),
    description: z.string().optional(),
    personality: z.string().optional(),
    artStyle: z.string().optional(),
    loraId: z.string().optional(),
    embeddingId: z.string().optional(),
    voiceId: z.string().optional(),
    isPublic: z.number().optional(),
    referenceImages: z.array(z.string()).optional(),
    stateHistory: z
      .array(
        z.object({
          label: z.string(),
          description: z.string(),
          imageUrl: z.string().optional(),
          timestamp: z.number().optional(),
        }),
      )
      .optional(),
  }),
  async (req, res) => {
    try {
      const { id, referenceImages, stateHistory, ...fields } = req.body;
      const updateData: Record<string, any> = { ...fields, updatedAt: Date.now() };
      if (referenceImages) updateData.referenceImages = JSON.stringify(referenceImages);
      if (stateHistory) updateData.stateHistory = JSON.stringify(stateHistory);

      await u.db("t_character").where("id", id).update(updateData);
      res.status(200).send(success({ message: "角色更新成功" }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  },
);
