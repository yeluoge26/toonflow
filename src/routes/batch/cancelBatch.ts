import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

export default router.post(
  "/",
  validateFields({ batchId: z.string() }),
  async (req, res) => {
    const { batchId } = req.body;
    await u
      .db("t_pipelineTask")
      .where("batchId", batchId)
      .whereIn("status", ["pending", "waiting"])
      .update({ status: "failed", errorMsg: "Batch cancelled" });
    await u.db("t_batch").where("batchId", batchId).update({ status: "failed", updatedAt: Date.now() });
    res.status(200).send(success({ message: "批次已取消" }));
  }
);
