import u from "@/utils";
import { analyzeScript, generateShotPlan, applyRhythmRules, scoreViralPotential, DirectorConfig, DirectorShotPlan } from "@/agents/director/directorAgent";
import { batchOptimize, PromptOptimizeConfig } from "@/agents/director/promptOptimizer";
import { selectImageModel, selectVideoModel } from "@/lib/modelRouter";

export interface OrchestratorInput {
  projectId: number;
  scriptText: string;
  genre: string;
  artStyle: string;
  targetDuration?: number;
  qualityThreshold?: number; // min viral score (default 70)
  maxIterations?: number;    // max optimization loops (default 3)
}

export interface OrchestratorResult {
  shots: DirectorShotPlan;
  optimizedPrompts: string[];
  viralScore: number;
  iterations: number;
  agentRunIds: number[];
  suggestions: string[];
  modelSelections: { image: string; video: string };
}

// Track an agent run in DB
async function trackAgentRun(agentName: string, input: any, output: any, status: string, duration: number): Promise<number> {
  try {
    const [id] = await u.db("t_agent_runs").insert({
      agentName,
      input: JSON.stringify(input).substring(0, 10000),
      output: JSON.stringify(output).substring(0, 10000),
      status,
      duration,
      createdAt: Date.now(),
    });
    return id;
  } catch { return 0; }
}

// Record feedback for an agent run (for the optimization loop)
async function recordFeedback(runId: number, score: number, feedback: string) {
  try {
    await u.db("t_agent_feedback").insert({ runId, score, feedback, createdAt: Date.now() });
  } catch {}
}

export async function orchestrate(input: OrchestratorInput): Promise<OrchestratorResult> {
  const threshold = input.qualityThreshold || 70;
  const maxIter = input.maxIterations || 3;
  const agentRunIds: number[] = [];

  const directorConfig: DirectorConfig = {
    genre: input.genre,
    targetDuration: input.targetDuration || 30,
    rhythmProfile: "dynamic",
    emotionCurve: "wave",
  };

  const promptConfig: PromptOptimizeConfig = {
    style: input.artStyle,
    genre: input.genre,
    globalLighting: "",
    globalMood: "",
  };

  let bestPlan: DirectorShotPlan | null = null;
  let bestScore = 0;
  let iterations = 0;
  let suggestions: string[] = [];

  for (let i = 0; i < maxIter; i++) {
    iterations++;

    // Step 1: Analyze script
    const t1 = Date.now();
    const analysis = await analyzeScript(input.scriptText, directorConfig);
    const runId1 = await trackAgentRun("analyzeScript", { scriptLength: input.scriptText.length, genre: input.genre }, { emotionBeats: analysis.emotionBeats.length, climaxPoints: analysis.climaxPoints.length }, "success", Date.now() - t1);
    agentRunIds.push(runId1);

    // Step 2: Generate shot plan
    const t2 = Date.now();
    let plan = await generateShotPlan(input.scriptText, analysis, directorConfig);
    plan = applyRhythmRules(plan, directorConfig);
    const runId2 = await trackAgentRun("generateShotPlan", { genre: input.genre, iteration: i }, { shotCount: plan.shots.length, totalDuration: plan.totalDuration }, "success", Date.now() - t2);
    agentRunIds.push(runId2);

    // Step 3: Score
    const scoreResult = scoreViralPotential(plan);
    const runId3 = await trackAgentRun("scoreViralPotential", { iteration: i }, scoreResult, "success", 0);
    agentRunIds.push(runId3);
    await recordFeedback(runId2, scoreResult.score, scoreResult.issues.join("; "));

    if (scoreResult.score > bestScore) {
      bestPlan = plan;
      bestScore = scoreResult.score;
      suggestions = scoreResult.suggestions;
    }

    // If score meets threshold, stop optimizing
    if (scoreResult.score >= threshold) break;

    // Otherwise, adjust config for next iteration
    if (scoreResult.issues.some(s => s.includes("hook") || s.includes("Hook"))) {
      directorConfig.rhythmProfile = "fast";
    }
    if (scoreResult.issues.some(s => s.includes("ending") || s.includes("Ending"))) {
      directorConfig.emotionCurve = "climax_end";
    }
  }

  if (!bestPlan) throw new Error("Failed to generate shot plan");

  // Step 4: Optimize prompts
  const t4 = Date.now();
  const rawPrompts = bestPlan.shots.map(s => s.prompt);
  const optimizedPrompts = await batchOptimize(rawPrompts, promptConfig);
  const runId4 = await trackAgentRun("batchOptimize", { promptCount: rawPrompts.length }, { optimizedCount: optimizedPrompts.length }, "success", Date.now() - t4);
  agentRunIds.push(runId4);

  // Step 5: Select optimal models
  const imageModel = selectImageModel(optimizedPrompts[0] || "", { preferQuality: true, maxCost: 1, maxTime: 60, availableProviders: [] });
  const videoModel = selectVideoModel(optimizedPrompts[0] || "", true, { preferQuality: true, maxCost: 5, maxTime: 300, availableProviders: [] });

  return {
    shots: bestPlan,
    optimizedPrompts,
    viralScore: bestScore,
    iterations,
    agentRunIds,
    suggestions,
    modelSelections: { image: `${imageModel.provider}/${imageModel.model}`, video: `${videoModel.provider}/${videoModel.model}` },
  };
}

// Get agent run history for a project or globally
export async function getAgentHistory(limit: number = 50) {
  return u.db("t_agent_runs").orderBy("createdAt", "desc").limit(limit);
}

export async function getAgentFeedback(runId: number) {
  return u.db("t_agent_feedback").where("runId", runId);
}
