import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

// Save structured storyboard data (typed shot parameters)
export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
    segmentId: z.number(),
    shots: z.array(z.object({
      id: z.number(),
      shotType: z.string().optional(),
      cameraAngle: z.string().optional(),
      cameraMove: z.string().optional(),
      composition: z.string().optional(),
      duration: z.number().optional(),
      emotion: z.string().optional(),
      mood: z.string().optional(),
      colorTone: z.string().optional(),
      dialogue: z.object({
        character: z.string(),
        line: z.string(),
        emotion: z.string().optional(),
      }).optional(),
    })),
  }),
  async (req, res) => {
    try {
      const { projectId, scriptId, segmentId, shots } = req.body;

      // Store structured shot data alongside the existing storyboard
      // Use t_chatHistory or a dedicated field
      const existing = await u.db("t_chatHistory")
        .where({ projectId, type: "storyboard" })
        .first();

      const existingRaw = existing as any;
      const structuredData = existingRaw?.structuredData
        ? JSON.parse(existingRaw.structuredData)
        : {};

      structuredData[`segment_${segmentId}`] = {
        shots,
        updatedAt: Date.now(),
      };

      if (existing) {
        await u.db("t_chatHistory")
          .where({ projectId, type: "storyboard" })
          .update({ structuredData: JSON.stringify(structuredData) } as any);
      }

      res.status(200).send(success({ message: "结构化分镜保存成功" }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  }
);
