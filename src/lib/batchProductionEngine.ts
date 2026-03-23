import u from "@/utils";

export interface ProductionTemplate {
  id?: number;
  name: string;
  genre: string;
  artStyle: string;
  storyStructure: {
    acts: number;
    episodesPerAct: number;
    minutesPerEpisode: number;
    shotsPerScene: number;
  };
  characterSlots: Array<{ role: string; archetype: string; voiceType: string }>;
  sceneSlots: Array<{ role: string; type: string }>;
  variationAxes: Array<{ name: string; values: string[] }>;
}

export interface BatchJob {
  id?: number;
  templateId: number;
  projectId: number;
  status: string; // pending|running|paused|completed|failed
  totalEpisodes: number;
  completedEpisodes: number;
  variations: string; // JSON
  stages: string; // JSON of stage statuses
  createdAt: number;
  updatedAt: number;
}

export async function createBatchFromTemplate(templateId: number, projectId: number, variations: Record<string, string>, episodeCount: number): Promise<BatchJob> {
  const stages = JSON.stringify({ script: "pending", storyboard: "pending", images: "pending", videos: "pending", audio: "pending", compose: "pending" });
  const [id] = await u.db("t_batch_job").insert({
    templateId, projectId, status: "pending",
    totalEpisodes: episodeCount, completedEpisodes: 0,
    variations: JSON.stringify(variations), stages,
    createdAt: Date.now(), updatedAt: Date.now(),
  });
  return { id, templateId, projectId, status: "pending", totalEpisodes: episodeCount, completedEpisodes: 0, variations: JSON.stringify(variations), stages, createdAt: Date.now(), updatedAt: Date.now() };
}

export async function updateJobStage(jobId: number, stage: string, status: string) {
  const job = await u.db("t_batch_job").where("id", jobId).first();
  if (!job) return;
  const stages = JSON.parse(job.stages || "{}");
  stages[stage] = status;
  await u.db("t_batch_job").where("id", jobId).update({ stages: JSON.stringify(stages), updatedAt: Date.now() });
}

export async function updateJobProgress(jobId: number, completed: number, status?: string) {
  const update: any = { completedEpisodes: completed, updatedAt: Date.now() };
  if (status) update.status = status;
  await u.db("t_batch_job").where("id", jobId).update(update);
}

export async function getBatchProgress(jobId: number) {
  const job = await u.db("t_batch_job").where("id", jobId).first();
  if (!job) return null;
  return { ...job, variations: JSON.parse(job.variations || "{}"), stages: JSON.parse(job.stages || "{}"), progress: job.totalEpisodes > 0 ? Math.round(job.completedEpisodes / job.totalEpisodes * 100) : 0 };
}

export async function listTemplates() {
  return u.db("t_production_template").select("*");
}

export async function saveTemplate(template: ProductionTemplate) {
  const data = {
    name: template.name, genre: template.genre, artStyle: template.artStyle,
    storyStructure: JSON.stringify(template.storyStructure),
    characterSlots: JSON.stringify(template.characterSlots),
    sceneSlots: JSON.stringify(template.sceneSlots),
    variationAxes: JSON.stringify(template.variationAxes),
    createdAt: Date.now(),
  };
  if (template.id) {
    await u.db("t_production_template").where("id", template.id).update(data);
    return template.id;
  }
  const [id] = await u.db("t_production_template").insert(data);
  return id;
}
