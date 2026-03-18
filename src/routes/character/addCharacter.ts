import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    name: z.string(),
    description: z.string().optional().default(""),
    projectId: z.number().nullable().optional(), // null = global IP
    artStyle: z.string().optional().default(""),
    personality: z.string().optional().default(""),
    isPublic: z.number().optional().default(0),
  }),
  async (req, res) => {
    try {
      const { name, description, projectId, artStyle, personality, isPublic } = req.body;
      const [id] = await u.db("t_character").insert({
        name,
        description,
        projectId: projectId || null,
        artStyle,
        personality,
        isPublic,
        referenceImages: JSON.stringify([]),
        stateHistory: JSON.stringify([]),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      res.status(200).send(success({ id, message: "角色创建成功" }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  },
);
