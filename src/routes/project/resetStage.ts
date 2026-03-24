import express from "express";
import { success, error } from "@/lib/responseFormat";
import { loadPipelineState, transitionStage, savePipelineState, PipelineStage } from "@/lib/stateMachine";
import { z } from "zod";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

export default router.post("/", validateFields({ projectId: z.number(), stage: z.string() }), async (req, res) => {
  const { projectId, stage } = req.body;
  const state = await loadPipelineState(projectId);
  if (!state) return res.status(404).send(error("Pipeline state not found"));
  const s = state.stages[stage as PipelineStage];
  s.status = "pending";
  s.retryCount = 0;
  s.error = undefined;
  s.startedAt = undefined;
  s.completedAt = undefined;
  state.updatedAt = Date.now();
  await savePipelineState(state);
  res.status(200).send(success({ message: `${stage} 已重置`, state }));
});
