import u from "@/utils";

export const PIPELINE_STAGES = [
  "idea", "storyline", "outline", "script", "assets",
  "storyboard", "image", "video", "audio", "compose", "review", "publish",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];
export const TASK_STATUSES = ["pending", "running", "success", "failed", "cancelled", "skipped"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface StageState {
  status: TaskStatus;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  retryCount: number;
  progress?: number;
  metadata?: string;
}

export interface PipelineState {
  projectId: number;
  currentStage: PipelineStage;
  stages: Record<PipelineStage, StageState>;
  createdAt: number;
  updatedAt: number;
}

function defaultStageState(): StageState {
  return { status: "pending", retryCount: 0 };
}

export function createPipelineState(projectId: number): PipelineState {
  const stages = {} as Record<PipelineStage, StageState>;
  for (const s of PIPELINE_STAGES) stages[s] = defaultStageState();
  return { projectId, currentStage: "idea", stages, createdAt: Date.now(), updatedAt: Date.now() };
}

export function transitionStage(
  state: PipelineState, stage: PipelineStage, status: TaskStatus,
  meta?: { error?: string; progress?: number },
): PipelineState {
  const s = state.stages[stage];
  s.status = status;
  if (status === "running") s.startedAt = Date.now();
  if (status === "success") s.completedAt = Date.now();
  if (status === "failed") { s.retryCount++; s.error = meta?.error; }
  if (meta?.progress !== undefined) s.progress = meta.progress;
  state.currentStage = stage;
  state.updatedAt = Date.now();
  return state;
}

export function canRetry(state: PipelineState, stage: PipelineStage): boolean {
  const s = state.stages[stage];
  return s.status === "failed" && s.retryCount < 5;
}

export function getNextPendingStage(state: PipelineState): PipelineStage | null {
  for (const s of PIPELINE_STAGES) {
    if (state.stages[s].status === "pending") return s;
  }
  return null;
}

export function isComplete(state: PipelineState): boolean {
  return PIPELINE_STAGES.every(s => ["success", "skipped"].includes(state.stages[s].status));
}

export function isStageComplete(state: PipelineState, stage: PipelineStage): boolean {
  return state.stages[stage].status === "success";
}

// Persistence
export async function loadPipelineState(projectId: number): Promise<PipelineState | null> {
  const row = await u.db("t_pipeline_state").where("projectId", projectId).first();
  if (!row) return null;
  try {
    return { projectId, currentStage: row.currentStage, stages: JSON.parse(row.stageData), createdAt: row.createdAt, updatedAt: row.updatedAt };
  } catch { return null; }
}

export async function savePipelineState(state: PipelineState): Promise<void> {
  const data = { projectId: state.projectId, currentStage: state.currentStage, stageData: JSON.stringify(state.stages), createdAt: state.createdAt, updatedAt: Date.now() };
  const existing = await u.db("t_pipeline_state").where("projectId", state.projectId).first();
  if (existing) {
    await u.db("t_pipeline_state").where("projectId", state.projectId).update(data);
  } else {
    await u.db("t_pipeline_state").insert(data);
  }
}

export async function resumeFromFailure(projectId: number): Promise<PipelineStage | null> {
  const state = await loadPipelineState(projectId);
  if (!state) return null;
  for (const s of PIPELINE_STAGES) {
    if (state.stages[s].status === "failed" && canRetry(state, s)) return s;
  }
  return getNextPendingStage(state);
}
