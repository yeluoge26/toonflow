import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { listMarketTemplates } from "@/lib/commercialEngine";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    category: z.string().optional(),
    sortBy: z.enum(["popular", "viral", "newest", "price"]).optional(),
    page: z.number().optional().default(1),
    pageSize: z.number().optional().default(20),
    free: z.boolean().optional(),
  }),
  async (req, res) => {
    try {
      const result = await listMarketTemplates(req.body);
      res.status(200).send(success(result));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  },
);
