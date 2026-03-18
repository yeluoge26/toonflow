import express from "express";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { validateScript } from "@/lib/scriptValidator";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    content: z.string(),
  }),
  async (req, res) => {
    const result = validateScript(req.body.content);
    res.status(200).send(success(result));
  }
);
