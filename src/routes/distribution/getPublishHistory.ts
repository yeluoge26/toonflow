import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

// Get publish history for a project
export default router.post(
  "/",
  validateFields({
    projectId: z.number().optional(),
  }),
  async (req, res) => {
    // TODO: Query from t_publishHistory when table exists
    // For now return empty
    res.status(200).send(success({
      history: [],
      total: 0,
    }));
  }
);
