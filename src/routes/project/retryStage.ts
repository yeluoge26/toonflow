import express from "express";
import { success, error } from "@/lib/responseFormat";
import { loadPipelineState, transitionStage, savePipelineState, canRetry, PipelineStage } from "@/lib/stateMachine";
import { z } from "zod";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

export default router.post("/", validateFields({ projectId: z.number(), stage: z.string() }), async (req, res) => {
  const { projectId, stage } = req.body;
  const state = await loadPipelineState(projectId);
  if (!state) return res.status(404).send(error("Pipeline state not found"));
  if (!canRetry(state, stage as PipelineStage)) return res.status(400).send(error("该阶段无法重试"));
  const updated = transitionStage(state, stage as PipelineStage, "pending");
  await savePipelineState(updated);
  res.status(200).send(success({ message: `${stage} 已重置为待处理`, state: updated }));
});
