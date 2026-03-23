/**
 * Video Generation Constraint System
 * Ensures visual consistency across all generated videos.
 */

import u from "@/utils";
import type { StoryboardShot } from "./storyboardDSL";

// ============================================================
// Types
// ============================================================

export interface VideoConstraints {
  projectId: number;

  globalLock: {
    artStyle: string;
    colorGrading: string;
    cameraLens: string;
    noSubtitle: boolean;
    noRandomCharacters: boolean;
    aspectRatio: string;
  };

  sceneLocks: Map<string, {
    lighting: string;
    architecture: string;
    backgroundSeed: number;
  }>;

  characterLocks: Map<string, {
    seed: number;
    referenceImage: string;
  }>;
}

// Serializable version (Maps -> plain objects) for DB storage
interface VideoConstraintsSerialized {
  projectId: number;
  globalLock: VideoConstraints["globalLock"];
  sceneLocks: Record<string, { lighting: string; architecture: string; backgroundSeed: number }>;
  characterLocks: Record<string, { seed: number; referenceImage: string }>;
}

// ============================================================
// 1. buildVideoConstraintPrompt
// ============================================================

export function buildVideoConstraintPrompt(constraints: VideoConstraints, shot?: StoryboardShot): string {
  const lines: string[] = [];

  lines.push("[GLOBAL STYLE LOCK]");
  if (constraints.globalLock.artStyle) {
    lines.push(`- Art style: ${constraints.globalLock.artStyle}`);
  }
  if (constraints.globalLock.colorGrading) {
    lines.push(`- Color grading: ${constraints.globalLock.colorGrading}`);
  }
  if (constraints.globalLock.cameraLens) {
    lines.push(`- Camera: ${constraints.globalLock.cameraLens}, shallow depth of field`);
  }
  if (constraints.globalLock.noSubtitle) {
    lines.push("- NO subtitles, NO text overlays");
  }
  if (constraints.globalLock.noRandomCharacters) {
    lines.push("- NO random/extra characters not specified");
  }
  if (constraints.globalLock.aspectRatio) {
    lines.push(`- Aspect ratio: ${constraints.globalLock.aspectRatio}`);
  }

  // Camera movement from shot DSL
  if (shot?.camera?.movement && shot.camera.movement !== "static") {
    const movementMap: Record<string, string> = {
      push_in: "push in",
      pull_out: "pull out",
      pan_left: "pan left",
      pan_right: "pan right",
      tilt_up: "tilt up",
      tilt_down: "tilt down",
      dolly: "dolly tracking",
      orbit: "orbit",
      crane: "crane",
      handheld: "handheld",
    };
    lines.push(`- Camera movement: ${movementMap[shot.camera.movement] || shot.camera.movement}`);
  }

  lines.push("[/GLOBAL STYLE LOCK]");

  // Scene-specific locks
  if (shot && constraints.sceneLocks.size > 0) {
    // Try to find matching scene lock by checking character locations or shot context
    for (const [sceneId, lock] of constraints.sceneLocks) {
      lines.push("");
      lines.push(`[SCENE LOCK: ${sceneId}]`);
      if (lock.lighting) lines.push(`- Lighting: ${lock.lighting}`);
      if (lock.architecture) lines.push(`- Architecture: ${lock.architecture}`);
      if (lock.backgroundSeed) lines.push(`- Background seed: ${lock.backgroundSeed}`);
      lines.push(`[/SCENE LOCK]`);
    }
  }

  // Character-specific locks
  if (shot?.characters && constraints.characterLocks.size > 0) {
    for (const char of shot.characters) {
      const lock = constraints.characterLocks.get(char.id) || constraints.characterLocks.get(char.name);
      if (lock) {
        lines.push("");
        lines.push(`[CHARACTER LOCK: ${char.name}]`);
        if (lock.seed) lines.push(`- Consistency seed: ${lock.seed}`);
        if (lock.referenceImage) lines.push(`- Reference image: ${lock.referenceImage}`);
        lines.push(`[/CHARACTER LOCK]`);
      }
    }
  }

  return lines.join("\n");
}

// ============================================================
// 2. loadVideoConstraints
// ============================================================

export async function loadVideoConstraints(projectId: number): Promise<VideoConstraints> {
  const rows = await u.db("t_video_constraints").where("projectId", projectId);

  const constraints: VideoConstraints = {
    projectId,
    globalLock: {
      artStyle: "",
      colorGrading: "",
      cameraLens: "",
      noSubtitle: true,
      noRandomCharacters: true,
      aspectRatio: "16:9",
    },
    sceneLocks: new Map(),
    characterLocks: new Map(),
  };

  for (const row of rows) {
    const type = row.constraintType;
    const key = row.constraintKey;
    let value: any;
    try {
      value = JSON.parse(row.constraintValue as string);
    } catch {
      value = row.constraintValue;
    }

    if (type === "global") {
      if (key === "artStyle") constraints.globalLock.artStyle = value;
      else if (key === "colorGrading") constraints.globalLock.colorGrading = value;
      else if (key === "cameraLens") constraints.globalLock.cameraLens = value;
      else if (key === "noSubtitle") constraints.globalLock.noSubtitle = !!value;
      else if (key === "noRandomCharacters") constraints.globalLock.noRandomCharacters = !!value;
      else if (key === "aspectRatio") constraints.globalLock.aspectRatio = value;
    } else if (type === "scene") {
      constraints.sceneLocks.set(key as string, value);
    } else if (type === "character") {
      constraints.characterLocks.set(key as string, value);
    }
  }

  return constraints;
}

// ============================================================
// 3. saveVideoConstraints
// ============================================================

export async function saveVideoConstraints(constraints: VideoConstraints): Promise<void> {
  const projectId = constraints.projectId;

  // Delete existing constraints for this project
  await u.db("t_video_constraints").where("projectId", projectId).del();

  const now = Date.now();
  const rows: any[] = [];

  // Global lock
  const globalKeys: Array<[string, any]> = [
    ["artStyle", constraints.globalLock.artStyle],
    ["colorGrading", constraints.globalLock.colorGrading],
    ["cameraLens", constraints.globalLock.cameraLens],
    ["noSubtitle", constraints.globalLock.noSubtitle],
    ["noRandomCharacters", constraints.globalLock.noRandomCharacters],
    ["aspectRatio", constraints.globalLock.aspectRatio],
  ];

  for (const [key, value] of globalKeys) {
    rows.push({
      projectId,
      constraintType: "global",
      constraintKey: key,
      constraintValue: JSON.stringify(value),
      createdAt: now,
    });
  }

  // Scene locks
  for (const [sceneId, lock] of constraints.sceneLocks) {
    rows.push({
      projectId,
      constraintType: "scene",
      constraintKey: sceneId,
      constraintValue: JSON.stringify(lock),
      createdAt: now,
    });
  }

  // Character locks
  for (const [charId, lock] of constraints.characterLocks) {
    rows.push({
      projectId,
      constraintType: "character",
      constraintKey: charId,
      constraintValue: JSON.stringify(lock),
      createdAt: now,
    });
  }

  // Batch insert
  if (rows.length > 0) {
    // SQLite has a limit on insert variables, batch in groups
    const batchSize = 50;
    for (let i = 0; i < rows.length; i += batchSize) {
      await u.db("t_video_constraints").insert(rows.slice(i, i + batchSize));
    }
  }
}

// ============================================================
// Utility: Get default constraints from project
// ============================================================

export async function getDefaultConstraints(projectId: number): Promise<VideoConstraints> {
  // Try loading from DB first
  const existing = await loadVideoConstraints(projectId);

  // If we have data, return it
  const hasData = existing.globalLock.artStyle || existing.globalLock.colorGrading;
  if (hasData) return existing;

  // Otherwise build defaults from project
  const project = await u.db("t_project").where("id", projectId).first();
  if (project) {
    existing.globalLock.artStyle = project.artStyle || "";
    existing.globalLock.aspectRatio = project.videoRatio || "16:9";
  }

  return existing;
}
