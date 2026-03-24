import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { getAgentHistory } from "@/lib/orchestrator";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    limit: z.number().min(1).max(500).optional(),
  }),
  async (req, res) => {
    try {
      const { limit } = req.body;
      const records = await getAgentHistory(limit || 50);
      res.status(200).send(success(records));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  },
);
