import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import costTracker from "@/lib/costControl";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
  }),
  async (req, res) => {
    try {
      const { projectId } = req.body;
      const costData = await costTracker.getProjectCost(projectId);

      res.status(200).send(success(costData));
    } catch (err: any) {
      res.status(500).send(error(err.message || "获取项目成本失败"));
    }
  }
);
