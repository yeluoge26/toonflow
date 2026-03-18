import express from "express";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import scheduler from "@/lib/scheduler";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    intervalHours: z.number().optional().default(6),
    batchSize: z.number().optional(),
    dailyBatchCount: z.number().optional(),
    style: z.string().optional(),
    scoreThreshold: z.number().optional(),
    evolutionEnabled: z.boolean().optional(),
  }),
  async (req, res) => {
    const { intervalHours, batchSize, dailyBatchCount, style, scoreThreshold, evolutionEnabled } = req.body;

    if (batchSize) scheduler.setConfig({ batchSize });
    if (dailyBatchCount) scheduler.setConfig({ dailyBatchCount });
    if (style) scheduler.setConfig({ defaultStyle: style });
    if (scoreThreshold) scheduler.setConfig({ scoreThreshold });
    if (evolutionEnabled !== undefined) scheduler.setConfig({ evolutionEnabled });

    scheduler.start(intervalHours);

    res.status(200).send(success({
      message: `生产线已启动，每${intervalHours}小时运行一次`,
      config: scheduler.getConfig(),
    }));
  }
);
