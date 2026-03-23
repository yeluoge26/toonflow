import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    id: z.number(),
    configId: z.number(),
    configId2: z.number().optional().nullable(),
    configId3: z.number().optional().nullable(),
  }),
  async (req, res) => {
    const { id, configId, configId2, configId3 } = req.body;
    if (id) {
      const update: Record<string, any> = { configId };
      if (configId2 !== undefined) update.configId2 = configId2 || null;
      if (configId3 !== undefined) update.configId3 = configId3 || null;
      await u.db("t_aiModelMap").where("id", id).update(update);
    }
    res.status(200).send(success("配置成功"));
  },
);
