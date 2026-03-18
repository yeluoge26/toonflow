import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

// Add a state entry to character's history (costume change, expression, age, etc.)
export default router.post(
  "/",
  validateFields({
    characterId: z.number(),
    label: z.string(),           // e.g. "婚纱造型", "少年时期", "受伤状态"
    description: z.string(),
    imageUrl: z.string().optional(),
  }),
  async (req, res) => {
    try {
      const { characterId, label, description, imageUrl } = req.body;

      const char = await u.db("t_character").where("id", characterId).first();
      if (!char) return res.status(404).send(error("角色不存在"));

      const history = char.stateHistory ? JSON.parse(char.stateHistory as string) : [];
      history.push({
        label,
        description,
        imageUrl: imageUrl || null,
        timestamp: Date.now(),
      });

      await u.db("t_character").where("id", characterId).update({
        stateHistory: JSON.stringify(history),
        updatedAt: Date.now(),
      });

      res.status(200).send(success({ message: "角色状态已更新", stateCount: history.length }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  }
);
