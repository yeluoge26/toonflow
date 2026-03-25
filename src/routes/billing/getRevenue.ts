import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { getRevenueSummary } from "@/lib/commercialEngine";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    userId: z.number(),
  }),
  async (req, res) => {
    try {
      const { userId } = req.body;
      const result = await getRevenueSummary(userId);
      res.status(200).send(success(result));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  },
);
