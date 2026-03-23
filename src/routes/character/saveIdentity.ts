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
    assetsId: z.number().nullable().optional(),
    name: z.string(),
    faceDescription: z.string().optional().default(""),
    bodyType: z.string().optional().default(""),
    hairStyle: z.string().optional().default(""),
    clothingDefault: z.string().optional().default(""),
    colorPalette: z.string().optional().default(""),
    consistencySeed: z.number().nullable().optional(),
    referenceImagePath: z.string().optional().default(""),
    loraModel: z.string().optional().default(""),
    ipAdapterWeight: z.number().optional().default(0.7),
    voiceType: z.string().optional().default(""),
    voiceEmotion: z.string().optional().default("neutral"),
    voiceSpeed: z.number().optional().default(1.0),
    appearances: z.string().optional().default("[]"),
    id: z.number().optional(), // if provided, update existing
  }),
  async (req, res) => {
    try {
      const { id, ...fields } = req.body;

      if (id) {
        // Update existing identity
        await u.db("t_character_identity").where("id", id).update({
          ...fields,
          updatedAt: Date.now(),
        });
        res.status(200).send(success({ id, message: "角色身份更新成功" }));
      } else {
        // Insert new identity
        const [newId] = await u.db("t_character_identity").insert({
          ...fields,
          createdAt: Date.now(),
        });
        res.status(200).send(success({ id: newId, message: "角色身份创建成功" }));
      }
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  },
);
