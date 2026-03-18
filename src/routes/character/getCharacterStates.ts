import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

export default router.post(
  "/",
  validateFields({ characterId: z.number() }),
  async (req, res) => {
    const char = await u.db("t_character").where("id", req.body.characterId).first();
    if (!char) return res.status(404).send(error("角色不存在"));

    const states = char.stateHistory ? JSON.parse(char.stateHistory as string) : [];
    const refs = char.referenceImages ? JSON.parse(char.referenceImages as string) : [];

    res.status(200).send(success({
      id: char.id,
      name: char.name,
      states,
      referenceImages: refs,
      currentLoRA: char.loraId || null,
      currentVoice: char.voiceId || null,
    }));
  }
);
