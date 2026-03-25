import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { checkQuota } from "@/lib/commercialEngine";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    userId: z.number(),
    action: z.string().min(1),
  }),
  async (req, res) => {
    try {
      const { userId, action } = req.body;
      const result = await checkQuota(userId, action);
      res.status(200).send(success(result));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  },
);
