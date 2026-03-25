import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { generateTitles } from "@/lib/distributionEngine";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    scriptSummary: z.string(),
    count: z.number().optional().default(3),
  }),
  async (req, res) => {
    try {
      const titles = await generateTitles(req.body.scriptSummary, req.body.count);
      res.status(200).send(success(titles));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  },
);
