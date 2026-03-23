import u from "@/utils";

// ============================================================
// Series Production Mode (系列生产模式)
// Manages multi-episode series with shared world/characters/style
// ============================================================

export interface Series {
  id?: number;
  projectId: number;
  name: string;                // "TWhisky 情绪剧"

  // World building
  worldView: {
    setting: string;           // "现代都市酒吧"
    tone: string;              // "温暖治愈，微酸"
    rules: string[];           // ["所有故事发生在同一个酒吧", "男主永远是调酒师"]
  };

  // Shared assets
  sharedCharacters: number[];  // character identity IDs
  sharedScenes: number[];      // scene asset IDs
  sharedStyle: {
    artStyle: string;
    colorGrading: string;
    musicTheme: string;
  };

  // Episodes
  episodes: SeriesEpisode[];

  // Series arc
  seriesArc: {
    theme: string;             // "从孤独到释怀"
    emotionCurve: string[];    // ["孤独", "相遇", "心动", "误解", "和解", "释怀"]
  };

  status: string;
  createdAt: number;
}

export interface SeriesEpisode {
  number: number;
  title: string;               // "Ep1: 孤独"
  variation: string;           // "lonely"
  status: string;              // "draft" | "scripted" | "storyboarded" | "produced"
  projectId?: number;          // linked project for this episode
  viralTemplate?: string;      // which viral template to use
}

// ============================================================
// Create a new series
// ============================================================
export async function createSeries(series: Series): Promise<number> {
  const [id] = await u.db("t_series").insert({
    projectId: series.projectId,
    name: series.name,
    worldView: JSON.stringify(series.worldView),
    sharedCharacters: JSON.stringify(series.sharedCharacters),
    sharedScenes: JSON.stringify(series.sharedScenes),
    sharedStyle: JSON.stringify(series.sharedStyle),
    episodes: JSON.stringify(series.episodes || []),
    seriesArc: JSON.stringify(series.seriesArc),
    status: series.status || "draft",
    createdAt: Date.now(),
  });
  return id;
}

// ============================================================
// Generate episode plan from series arc
// ============================================================
export function generateEpisodePlan(series: Series, episodeCount: number): SeriesEpisode[] {
  const emotionCurve = series.seriesArc.emotionCurve;
  const episodes: SeriesEpisode[] = [];

  // Map viral templates to emotions
  const emotionTemplateMap: Record<string, string> = {
    "孤独": "emotion_bar",
    "相遇": "mystery_encounter",
    "心动": "confession_fail",
    "误解": "breakup_moment",
    "和解": "healing_journey",
    "释怀": "silent_love",
    "觉醒": "power_awakening",
    "复仇": "revenge_calm",
    "悲伤": "breakup_moment",
    "希望": "healing_journey",
    "愤怒": "revenge_calm",
    "神秘": "mystery_encounter",
    "告白": "confession_fail",
    "温暖": "silent_love",
  };

  // Variation keywords for each emotion
  const emotionVariations: Record<string, string> = {
    "孤独": "lonely",
    "相遇": "encounter",
    "心动": "heartbeat",
    "误解": "misunderstanding",
    "和解": "reconciliation",
    "释怀": "release",
    "觉醒": "awakening",
    "复仇": "revenge",
    "悲伤": "sorrow",
    "希望": "hope",
    "愤怒": "rage",
    "神秘": "mystery",
    "告白": "confession",
    "温暖": "warmth",
  };

  for (let i = 0; i < episodeCount; i++) {
    // Distribute emotions across episodes
    const emotionIndex = Math.floor((i / episodeCount) * emotionCurve.length);
    const emotion = emotionCurve[Math.min(emotionIndex, emotionCurve.length - 1)];

    episodes.push({
      number: i + 1,
      title: `Ep${i + 1}: ${emotion}`,
      variation: emotionVariations[emotion] || emotion,
      status: "draft",
      viralTemplate: emotionTemplateMap[emotion] || "emotion_bar",
    });
  }

  return episodes;
}

// ============================================================
// Auto-create projects for each episode
// ============================================================
export async function materializeEpisodes(seriesId: number): Promise<void> {
  const seriesRow = await u.db("t_series").where("id", seriesId).first();
  if (!seriesRow) throw new Error(`Series ${seriesId} not found`);

  const series = deserializeSeries(seriesRow);
  const style = series.sharedStyle;

  for (const episode of series.episodes) {
    if (episode.projectId) continue; // Already materialized

    // Create a project for this episode
    const [projectId] = await u.db("t_project").insert({
      name: `${series.name} - ${episode.title}`,
      intro: `系列「${series.name}」第${episode.number}集\n世界观: ${series.worldView.setting}\n基调: ${series.worldView.tone}\n情绪: ${episode.variation}`,
      type: "short_video",
      artStyle: style.artStyle,
      videoRatio: "9:16",
      userId: 1,
      createTime: Date.now(),
    });

    episode.projectId = projectId;
    episode.status = "scripted";

    // Copy shared characters to the new project
    for (const charId of series.sharedCharacters) {
      const charIdentity = await u.db("t_character_identity").where("id", charId).first();
      if (charIdentity) {
        await u.db("t_character").insert({
          name: charIdentity.name || "角色",
          description: charIdentity.faceDescription || "",
          projectId,
          referenceImages: charIdentity.referenceImagePath || "",
          personality: "",
          artStyle: style.artStyle,
          isPublic: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }

    // Copy shared scenes as assets to the new project
    for (const sceneId of series.sharedScenes) {
      const sceneAsset = await u.db("t_assets").where("id", sceneId).first();
      if (sceneAsset) {
        await u.db("t_assets").insert({
          name: sceneAsset.name,
          intro: sceneAsset.intro,
          prompt: sceneAsset.prompt,
          type: sceneAsset.type,
          projectId,
          state: "ready",
        });
      }
    }
  }

  // Update the series with materialized episode data
  await u.db("t_series").where("id", seriesId).update({
    episodes: JSON.stringify(series.episodes),
    status: "materialized",
  });
}

// ============================================================
// Get series with all episode statuses
// ============================================================
export async function getSeriesDetail(seriesId: number): Promise<Series> {
  const row = await u.db("t_series").where("id", seriesId).first();
  if (!row) throw new Error(`Series ${seriesId} not found`);

  const series = deserializeSeries(row);

  // Refresh episode statuses from linked projects
  for (const episode of series.episodes) {
    if (episode.projectId) {
      // Check storyboards, scripts, etc.
      const storyboardCount = await u.db("t_assets")
        .where("projectId", episode.projectId)
        .where("type", "storyboard")
        .count("id as cnt")
        .first();
      const videoCount = await u.db("t_video")
        .where("scriptId", episode.projectId)
        .count("id as cnt")
        .first();

      if (videoCount && Number(videoCount.cnt) > 0) {
        episode.status = "produced";
      } else if (storyboardCount && Number(storyboardCount.cnt) > 0) {
        episode.status = "storyboarded";
      } else {
        episode.status = "scripted";
      }
    }
  }

  return series;
}

// ============================================================
// List all series
// ============================================================
export async function listSeries(userId?: number): Promise<Series[]> {
  let query = u.db("t_series").orderBy("createdAt", "desc");
  // userId filter could be used if t_series had a userId column in future
  const rows = await query;
  return rows.map(deserializeSeries);
}

// ============================================================
// Helper: deserialize DB row to Series object
// ============================================================
function deserializeSeries(row: any): Series {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    worldView: safeParseJSON(row.worldView, { setting: "", tone: "", rules: [] }),
    sharedCharacters: safeParseJSON(row.sharedCharacters, []),
    sharedScenes: safeParseJSON(row.sharedScenes, []),
    sharedStyle: safeParseJSON(row.sharedStyle, { artStyle: "", colorGrading: "", musicTheme: "" }),
    episodes: safeParseJSON(row.episodes, []),
    seriesArc: safeParseJSON(row.seriesArc, { theme: "", emotionCurve: [] }),
    status: row.status,
    createdAt: row.createdAt,
  };
}

function safeParseJSON<T>(val: any, fallback: T): T {
  if (!val) return fallback;
  if (typeof val === "object") return val;
  try { return JSON.parse(val); } catch { return fallback; }
}
