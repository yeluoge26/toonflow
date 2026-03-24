import express from "express";
import { success } from "@/lib/responseFormat";
import { loadPipelineState, createPipelineState, savePipelineState, PIPELINE_STAGES } from "@/lib/stateMachine";
import { z } from "zod";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

export default router.post("/", validateFields({ projectId: z.number() }), async (req, res) => {
  let state = await loadPipelineState(req.body.projectId);
  if (!state) {
    state = createPipelineState(req.body.projectId);
    await savePipelineState(state);
  }
  res.status(200).send(success({ ...state, stageList: PIPELINE_STAGES }));
});
