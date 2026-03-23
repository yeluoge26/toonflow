import u from "@/utils";

/**
 * Character Identity — loaded from t_character_identity
 */
export interface CharacterIdentity {
  id: number;
  projectId: number;
  assetsId?: number | null;
  name: string;
  // Visual identity
  faceDescription?: string | null;
  bodyType?: string | null;
  hairStyle?: string | null;
  clothingDefault?: string | null;
  colorPalette?: string | null; // JSON: { primary, secondary, accent, skin }
  // Generation control
  consistencySeed?: number | null;
  referenceImagePath?: string | null;
  loraModel?: string | null;
  ipAdapterWeight?: number | null;
  // Voice identity
  voiceType?: string | null;
  voiceEmotion?: string | null;
  voiceSpeed?: number | null;
  // Metadata
  appearances?: string | null; // JSON array of episode ids
  createdAt?: number | null;
}

export interface ShotContext {
  shotPrompt: string;
  emotion?: string;
  action?: string;
  lighting?: string;
  cameraAngle?: string;
}

/**
 * Build a CHARACTER LOCK prompt block for a single character.
 * This locked block is injected before any image generation prompt
 * so the AI model keeps the character visually consistent.
 */
export function buildCharacterPrompt(character: CharacterIdentity, shotContext?: ShotContext): string {
  const lines: string[] = [];
  lines.push(`[CHARACTER LOCK: ${character.name}]`);

  if (character.faceDescription) {
    lines.push(`- Face: ${character.faceDescription}`);
  }
  if (character.hairStyle) {
    lines.push(`- Hair: ${character.hairStyle}`);
  }
  if (character.bodyType) {
    lines.push(`- Body: ${character.bodyType}`);
  }
  if (character.clothingDefault) {
    lines.push(`- Clothing: ${character.clothingDefault}`);
  }
  if (character.colorPalette) {
    try {
      const palette = JSON.parse(character.colorPalette);
      const entries = Object.entries(palette)
        .map(([k, v]) => `${v} (${k})`)
        .join(", ");
      if (entries) lines.push(`- Color palette: ${entries}`);
    } catch {
      lines.push(`- Color palette: ${character.colorPalette}`);
    }
  }
  if (character.consistencySeed) {
    lines.push(`- Seed: ${character.consistencySeed}`);
  }
  if (shotContext?.emotion) {
    lines.push(`- Emotion: ${shotContext.emotion}`);
  }
  if (shotContext?.action) {
    lines.push(`- Action: ${shotContext.action}`);
  }
  lines.push(`[/CHARACTER LOCK]`);

  return lines.join("\n");
}

/**
 * Build a full scene consistency prompt with all character locks +
 * optional background lock and style notes.
 */
export function buildSceneConsistencyPrompt(
  characters: CharacterIdentity[],
  shotContexts?: Map<string, ShotContext>,
): string {
  if (characters.length === 0) return "";

  const parts: string[] = [];
  parts.push("=== CHARACTER CONSISTENCY LOCKS ===");

  for (const char of characters) {
    const ctx = shotContexts?.get(char.name);
    parts.push(buildCharacterPrompt(char, ctx));
  }

  parts.push("=== END CHARACTER LOCKS ===");
  parts.push("");
  parts.push(
    "IMPORTANT: You MUST strictly follow the CHARACTER LOCK descriptions above. " +
    "Every character must match their locked visual identity exactly — face, hair, body, clothing, and colors. " +
    "Do NOT deviate from these descriptions under any circumstances.",
  );

  return parts.join("\n");
}

/**
 * Load all character identities for a project from t_character_identity.
 */
export async function loadCharacterIdentities(projectId: number): Promise<CharacterIdentity[]> {
  const rows = await u.db("t_character_identity").where("projectId", projectId);
  return rows as CharacterIdentity[];
}

/**
 * Find which character identities are referenced in a prompt text (by name).
 */
export function matchIdentitiesInPrompt(
  promptText: string,
  identities: CharacterIdentity[],
): CharacterIdentity[] {
  return identities.filter((id) => promptText.includes(id.name));
}

/**
 * Build the full consistency injection for a set of shot prompts.
 * Returns { consistencyPrompt, matchedIdentities, seedMap }.
 */
export async function buildConsistencyInjection(
  projectId: number,
  shotPrompts: string[],
): Promise<{
  consistencyPrompt: string;
  matchedIdentities: CharacterIdentity[];
  seedMap: Map<string, number>;
}> {
  const allIdentities = await loadCharacterIdentities(projectId);
  if (allIdentities.length === 0) {
    return { consistencyPrompt: "", matchedIdentities: [], seedMap: new Map() };
  }

  const combinedText = shotPrompts.join(" ");
  const matched = matchIdentitiesInPrompt(combinedText, allIdentities);

  if (matched.length === 0) {
    return { consistencyPrompt: "", matchedIdentities: [], seedMap: new Map() };
  }

  const seedMap = new Map<string, number>();
  for (const m of matched) {
    if (m.consistencySeed) {
      seedMap.set(m.name, m.consistencySeed);
    }
  }

  const consistencyPrompt = buildSceneConsistencyPrompt(matched);

  return { consistencyPrompt, matchedIdentities: matched, seedMap };
}
