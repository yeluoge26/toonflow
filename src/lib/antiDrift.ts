/**
 * Anti-Drift Rule Engine (工业级防跑偏系统)
 *
 * 6 Lock Rules to ensure AI-generated content stays consistent
 * across all shots in a production.
 */

import u from "@/utils";

// ============================================================
// Types
// ============================================================

export interface LightingLock {
  enabled: boolean;
  globalLighting: string;     // "warm amber side lighting, golden hour"
  timeOfDay: string;          // "night"
  lightSource: string;        // "left side warm lamp + overhead cool fill"
  shadowDirection: string;    // "45 degrees right"
  colorTemperature: string;   // "3200K warm"
}

export interface CharacterEntryRule {
  enabled: boolean;
  maxCharactersPerShot: number;
  allowedCharacters: string[];
  forbiddenElements: string[];
  entryDescription: string;
}

export interface CameraConstraints {
  enabled: boolean;
  allowedTypes: string[];
  forbiddenMovements: string[];
  maxCameraSpeed: string;
  defaultLens: string;
  depthOfField: string;
}

export interface CoreConvergence {
  enabled: boolean;
  alwaysInclude: string[];
  neverInclude: string[];
}

export interface UnifiedPrefix {
  enabled: boolean;
  imagePrefix: string;
  videoPrefix: string;
}

export interface CharacterUniformSetting {
  characterName: string;
  fixedSeed: number;
  fixedClothing: string;
  fixedHairStyle: string;
  fixedAccessories: string;
  postureLock: string;
}

export interface CharacterUniform {
  enabled: boolean;
  settings: CharacterUniformSetting[];
}

export interface AntiDriftConfig {
  projectId: number;
  lightingLock: LightingLock;
  characterEntryRule: CharacterEntryRule;
  cameraConstraints: CameraConstraints;
  coreConvergence: CoreConvergence;
  unifiedPrefix: UnifiedPrefix;
  characterUniform: CharacterUniform;
}

export interface ValidationIssue {
  rule: string;
  severity: "error" | "warning";
  message: string;
  detail?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

// ============================================================
// Config Types for DB storage
// ============================================================

type ConfigType = "lightingLock" | "characterEntryRule" | "cameraConstraints" | "coreConvergence" | "unifiedPrefix" | "characterUniform";

const CONFIG_TYPES: ConfigType[] = [
  "lightingLock",
  "characterEntryRule",
  "cameraConstraints",
  "coreConvergence",
  "unifiedPrefix",
  "characterUniform",
];

// ============================================================
// Default Config
// ============================================================

export function getDefaultAntiDriftConfig(projectId: number): AntiDriftConfig {
  return {
    projectId,
    lightingLock: {
      enabled: false,
      globalLighting: "warm amber side lighting, golden hour feel",
      timeOfDay: "day",
      lightSource: "natural sunlight from left + soft ambient fill",
      shadowDirection: "45 degrees right, soft edges",
      colorTemperature: "5500K neutral",
    },
    characterEntryRule: {
      enabled: false,
      maxCharactersPerShot: 3,
      allowedCharacters: [],
      forbiddenElements: ["random people", "crowd", "extra characters", "background characters"],
      entryDescription: "Only named characters may appear in shots",
    },
    cameraConstraints: {
      enabled: false,
      allowedTypes: ["close_up", "medium_shot", "wide_shot", "extreme_wide", "over_shoulder"],
      forbiddenMovements: ["whip_pan", "360_orbit", "shake"],
      maxCameraSpeed: "slow to medium",
      defaultLens: "50mm",
      depthOfField: "shallow, f/1.8",
    },
    coreConvergence: {
      enabled: false,
      alwaysInclude: [
        "masterpiece, best quality, cinematic lighting",
        "consistent character design, same outfit throughout",
        "professional color grading, film look",
      ],
      neverInclude: [
        "text, watermark, subtitle, logo, deformed",
        "extra fingers, extra limbs, bad anatomy, mutation",
        "random characters, changing clothes, inconsistent style",
      ],
    },
    unifiedPrefix: {
      enabled: false,
      imagePrefix: "",
      videoPrefix: "",
    },
    characterUniform: {
      enabled: false,
      settings: [],
    },
  };
}

// ============================================================
// Load / Save from DB
// ============================================================

export async function loadAntiDriftConfig(projectId: number): Promise<AntiDriftConfig> {
  const rows = await u.db("t_anti_drift_config").where({ projectId });

  if (!rows || rows.length === 0) {
    return getDefaultAntiDriftConfig(projectId);
  }

  const config = getDefaultAntiDriftConfig(projectId);

  for (const row of rows) {
    const configType = row.configType as ConfigType;
    if (CONFIG_TYPES.includes(configType)) {
      try {
        const data = JSON.parse(row.configData);
        (config as any)[configType] = {
          ...data,
          enabled: row.enabled === 1,
        };
      } catch {
        // Skip malformed rows
      }
    }
  }

  return config;
}

export async function saveAntiDriftConfig(config: AntiDriftConfig): Promise<void> {
  const { projectId } = config;
  const now = Date.now();

  for (const configType of CONFIG_TYPES) {
    const data = (config as any)[configType];
    if (!data) continue;

    const configData = JSON.stringify(data);
    const enabled = data.enabled ? 1 : 0;

    const existing = await u.db("t_anti_drift_config")
      .where({ projectId, configType })
      .first();

    if (existing) {
      await u.db("t_anti_drift_config")
        .where({ id: existing.id })
        .update({ configData, enabled, createdAt: now });
    } else {
      await u.db("t_anti_drift_config").insert({
        projectId,
        configType,
        configData,
        enabled,
        createdAt: now,
      });
    }
  }
}

// ============================================================
// Build Anti-Drift Prompt Block
// ============================================================

export function buildAntiDriftPrompt(config: AntiDriftConfig): string {
  const sections: string[] = [];

  // 1. Lighting Lock
  if (config.lightingLock.enabled) {
    const l = config.lightingLock;
    sections.push(
      `LIGHTING LOCK:\n` +
      `- All shots: ${l.globalLighting}\n` +
      `- Time of day: ${l.timeOfDay}\n` +
      `- Light source: ${l.lightSource}\n` +
      `- Shadow: ${l.shadowDirection}\n` +
      `- Color temperature: ${l.colorTemperature}\n` +
      `- DO NOT change lighting between shots`
    );
  }

  // 2. Character Entry Rules
  if (config.characterEntryRule.enabled) {
    const c = config.characterEntryRule;
    const parts = [
      `CHARACTER ENTRY RULES:\n` +
      `- Maximum ${c.maxCharactersPerShot} characters per shot`,
    ];
    if (c.allowedCharacters.length > 0) {
      parts.push(`- ONLY these characters may appear: ${c.allowedCharacters.join(", ")}`);
    }
    if (c.forbiddenElements.length > 0) {
      parts.push(`- FORBIDDEN: ${c.forbiddenElements.join(", ")}`);
    }
    parts.push(`- ${c.entryDescription}`);
    parts.push(`- Any character not in the list = VIOLATION`);
    sections.push(parts.join("\n"));
  }

  // 3. Camera Constraints
  if (config.cameraConstraints.enabled) {
    const cam = config.cameraConstraints;
    const parts = [`CAMERA CONSTRAINTS:`];
    if (cam.allowedTypes.length > 0) {
      parts.push(`- Allowed shot types: ${cam.allowedTypes.join(", ")} ONLY`);
    }
    if (cam.forbiddenMovements.length > 0) {
      parts.push(`- FORBIDDEN movements: ${cam.forbiddenMovements.join(", ")}`);
    }
    parts.push(`- Camera speed: ${cam.maxCameraSpeed}, NO sudden movements`);
    parts.push(`- Lens: ${cam.defaultLens} cinematic, depth of field ${cam.depthOfField}`);
    sections.push(parts.join("\n"));
  }

  // 4. Core Convergence
  if (config.coreConvergence.enabled) {
    const conv = config.coreConvergence;
    const parts: string[] = [];
    if (conv.alwaysInclude.length > 0) {
      parts.push(`CORE CONVERGENCE (always include):\n${conv.alwaysInclude.map(s => `- ${s}`).join("\n")}`);
    }
    if (conv.neverInclude.length > 0) {
      parts.push(`NEGATIVE (never include):\n${conv.neverInclude.map(s => `- ${s}`).join("\n")}`);
    }
    if (parts.length > 0) sections.push(parts.join("\n\n"));
  }

  // 5. Unified Prefix (handled separately in injection, but include reference)
  if (config.unifiedPrefix.enabled) {
    const u = config.unifiedPrefix;
    const parts = [`UNIFIED PREFIX:`];
    if (u.imagePrefix) parts.push(`- Image prefix: ${u.imagePrefix}`);
    if (u.videoPrefix) parts.push(`- Video prefix: ${u.videoPrefix}`);
    if (parts.length > 1) sections.push(parts.join("\n"));
  }

  // 6. Character Uniform Settings
  if (config.characterUniform.enabled && config.characterUniform.settings.length > 0) {
    const charParts = [`CHARACTER UNIFORM SETTINGS:`];
    for (const s of config.characterUniform.settings) {
      charParts.push(
        `\n[${s.characterName}]\n` +
        `- Fixed clothing: ${s.fixedClothing}\n` +
        `- Hair style: ${s.fixedHairStyle}\n` +
        `- Accessories: ${s.fixedAccessories}\n` +
        `- Posture: ${s.postureLock}` +
        (s.fixedSeed ? `\n- Consistency seed: ${s.fixedSeed}` : "")
      );
    }
    sections.push(charParts.join(""));
  }

  if (sections.length === 0) return "";

  return `[ANTI-DRIFT RULES — MANDATORY]\n\n${sections.join("\n\n")}\n\n[/ANTI-DRIFT RULES]`;
}

// ============================================================
// Validate Prompt Against Rules
// ============================================================

export function validatePromptAgainstRules(prompt: string, config: AntiDriftConfig): ValidationResult {
  const issues: ValidationIssue[] = [];
  const lowerPrompt = prompt.toLowerCase();

  // Check Character Entry Rules
  if (config.characterEntryRule.enabled) {
    for (const forbidden of config.characterEntryRule.forbiddenElements) {
      if (lowerPrompt.includes(forbidden.toLowerCase())) {
        issues.push({
          rule: "characterEntryRule",
          severity: "error",
          message: `Forbidden element detected: "${forbidden}"`,
          detail: `The prompt contains "${forbidden}" which is forbidden by character entry rules.`,
        });
      }
    }
  }

  // Check Camera Constraints
  if (config.cameraConstraints.enabled) {
    for (const forbidden of config.cameraConstraints.forbiddenMovements) {
      if (lowerPrompt.includes(forbidden.toLowerCase().replace(/_/g, " ")) ||
          lowerPrompt.includes(forbidden.toLowerCase())) {
        issues.push({
          rule: "cameraConstraints",
          severity: "error",
          message: `Forbidden camera movement: "${forbidden}"`,
          detail: `The prompt uses "${forbidden}" which is not allowed.`,
        });
      }
    }
  }

  // Check Core Convergence - negative items
  if (config.coreConvergence.enabled) {
    for (const negative of config.coreConvergence.neverInclude) {
      const terms = negative.split(",").map(s => s.trim().toLowerCase());
      for (const term of terms) {
        if (term && lowerPrompt.includes(term)) {
          issues.push({
            rule: "coreConvergence",
            severity: "warning",
            message: `Negative term detected: "${term}"`,
            detail: `The prompt contains "${term}" which should be avoided.`,
          });
        }
      }
    }
  }

  // Check Core Convergence - positive items (warn if missing)
  if (config.coreConvergence.enabled) {
    for (const positive of config.coreConvergence.alwaysInclude) {
      const terms = positive.split(",").map(s => s.trim().toLowerCase());
      const hasAny = terms.some(term => term && lowerPrompt.includes(term));
      if (!hasAny && terms.length > 0 && terms[0]) {
        issues.push({
          rule: "coreConvergence",
          severity: "warning",
          message: `Recommended terms missing: "${positive}"`,
          detail: `Consider including quality terms for consistency.`,
        });
      }
    }
  }

  return {
    valid: issues.filter(i => i.severity === "error").length === 0,
    issues,
  };
}

// ============================================================
// Injection helpers for image/video generation
// ============================================================

/**
 * Get the anti-drift prompt block for a project.
 * Returns empty string if no rules are enabled.
 */
export async function getAntiDriftPromptForProject(projectId: number): Promise<string> {
  try {
    const config = await loadAntiDriftConfig(projectId);
    return buildAntiDriftPrompt(config);
  } catch {
    return "";
  }
}

/**
 * Get the image prefix for a project (from unified prefix rule).
 * Returns empty string if not enabled.
 */
export async function getImagePrefix(projectId: number): Promise<string> {
  try {
    const config = await loadAntiDriftConfig(projectId);
    if (config.unifiedPrefix.enabled && config.unifiedPrefix.imagePrefix) {
      return config.unifiedPrefix.imagePrefix;
    }
    return "";
  } catch {
    return "";
  }
}

/**
 * Get the video prefix for a project (from unified prefix rule).
 * Returns empty string if not enabled.
 */
export async function getVideoPrefix(projectId: number): Promise<string> {
  try {
    const config = await loadAntiDriftConfig(projectId);
    if (config.unifiedPrefix.enabled && config.unifiedPrefix.videoPrefix) {
      return config.unifiedPrefix.videoPrefix;
    }
    return "";
  } catch {
    return "";
  }
}
