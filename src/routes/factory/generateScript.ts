import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { autoGenerateScript } from "@/lib/autoScriptGenerator";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    prompt: z.string(),
    style: z.enum(["shuangwen", "emotion", "suspense"]).optional(),
    maxRewrites: z.number().optional().default(2),
  }),
  async (req, res) => {
    try {
      const result = await autoGenerateScript({
        promptText: req.body.prompt,
        style: req.body.style,
        maxRewrites: req.body.maxRewrites,
      });
      res.status(200).send(success(result));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  }
);
