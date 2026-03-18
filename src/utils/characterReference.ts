import u from "@/utils";

export interface CharacterRef {
  name: string;
  referenceImage: string; // file path in OSS
  description: string;
}

/**
 * Get all character (role-type) references for a project.
 * Queries t_assets for role assets and their associated images from t_image.
 */
export async function getProjectCharacterRefs(projectId: number): Promise<CharacterRef[]> {
  const assets = await u
    .db("t_assets")
    .where("projectId", projectId)
    .where("type", "role")
    .select("id", "name", "intro", "filePath");

  const refs: CharacterRef[] = [];
  for (const asset of assets) {
    try {
      // Try to get image from t_image table first
      const image = await u
        .db("t_image")
        .where("assetsId", asset.id)
        .select("filePath")
        .first();

      const imagePath = image?.filePath || asset.filePath;
      if (!imagePath) continue;

      refs.push({
        name: asset.name as string,
        referenceImage: imagePath as string,
        description: (asset.intro as string) || "",
      });
    } catch (e) {
      // Skip if image not found
    }
  }
  return refs;
}

/**
 * Find which characters from refs are mentioned in a prompt string.
 */
export function matchCharactersInPrompt(prompt: string, refs: CharacterRef[]): CharacterRef[] {
  return refs.filter((ref) => prompt.includes(ref.name));
}

/**
 * Load character reference images as base64 for injection into image generation.
 * Checks t_character table first (IP system), then falls back to t_assets.
 */
export async function getCharacterRefBase64(projectId: number, characterName: string): Promise<string | null> {
  // First try t_character table
  const character = await u
    .db("t_character")
    .where(function () {
      this.where("projectId", projectId).orWhereNull("projectId");
    })
    .where("name", characterName)
    .first();

  if (character?.referenceImages) {
    const images = JSON.parse(character.referenceImages);
    if (images.length > 0) {
      try {
        return await u.oss.getImageBase64(images[0]);
      } catch {
        // Fall through to asset fallback
      }
    }
  }

  // Fallback to t_assets
  const refs = await getProjectCharacterRefs(projectId);
  const matched = refs.find((r) => r.name === characterName);
  if (matched) {
    try {
      return await u.oss.getImageBase64(matched.referenceImage);
    } catch {
      // Return null if image cannot be loaded
    }
  }

  return null;
}
