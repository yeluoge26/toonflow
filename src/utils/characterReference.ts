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
