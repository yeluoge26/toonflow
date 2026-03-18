// Trending topics and content recommendations
import u from "@/utils";

export interface TrendingTopic {
  keyword: string;
  heat: number; // 0-100
  platform: string;
  category: string;
  relatedTags: string[];
  fetchedAt: number;
}

export interface ContentRecommendation {
  topic: string;
  angle: string; // suggested creative angle
  matchedIPs: string[]; // character IPs that could be used
  estimatedEngagement: "high" | "medium" | "low";
}

// Fetch trending - uses AI to suggest trending topics based on category
export async function fetchTrending(platform: string): Promise<TrendingTopic[]> {
  try {
    // Try to use AI for trending topic generation
    const aiConfig = await u.db("t_aiModelMap")
      .leftJoin("t_config", "t_config.id", "t_aiModelMap.configId")
      .whereNotNull("t_aiModelMap.configId")
      .where("t_config.type", "<>", "video")
      .select("t_config.model", "t_config.apiKey", "t_config.baseUrl as baseURL", "t_config.manufacturer")
      .first();

    if (aiConfig?.apiKey) {
      const result = await u.ai.text.invoke(
        {
          system: "你是短视频热点分析师。根据当前社交媒体趋势，生成10个热门话题建议。输出JSON数组格式：[{\"keyword\":\"话题\",\"heat\":85,\"category\":\"情感\",\"relatedTags\":[\"标签1\",\"标签2\"]}]",
          prompt: `平台: ${platform}\n请生成当前${platform}上最火的10个短视频话题方向，涵盖情感、搞笑、悬疑、AI相关等类别。`,
        },
        aiConfig
      );

      const text = result?.text || String(result);
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const topics = JSON.parse(jsonMatch[0]);
        return topics.map((t: any) => ({
          keyword: t.keyword || "",
          heat: t.heat || 50,
          platform,
          category: t.category || "其他",
          relatedTags: t.relatedTags || [],
          fetchedAt: Date.now(),
        }));
      }
    }
  } catch (err) {
    console.error("[Trending] AI trending fetch failed:", err);
  }

  // Fallback: return curated default trending topics
  return getDefaultTrending(platform);
}

function getDefaultTrending(platform: string): TrendingTopic[] {
  const now = Date.now();
  return [
    { keyword: "AI恋人", heat: 95, platform, category: "AI", relatedTags: ["AI", "科技", "情感"], fetchedAt: now },
    { keyword: "霸总逆袭", heat: 90, platform, category: "剧情", relatedTags: ["霸总", "逆袭", "爽文"], fetchedAt: now },
    { keyword: "重生复仇", heat: 88, platform, category: "剧情", relatedTags: ["重生", "复仇", "爽剧"], fetchedAt: now },
    { keyword: "甜宠日常", heat: 85, platform, category: "情感", relatedTags: ["甜宠", "恋爱", "日常"], fetchedAt: now },
    { keyword: "职场反击", heat: 82, platform, category: "职场", relatedTags: ["职场", "逆袭", "打脸"], fetchedAt: now },
    { keyword: "悬疑反转", heat: 80, platform, category: "悬疑", relatedTags: ["悬疑", "烧脑", "反转"], fetchedAt: now },
    { keyword: "古风虐恋", heat: 78, platform, category: "古风", relatedTags: ["古风", "虐恋", "仙侠"], fetchedAt: now },
    { keyword: "校园暗恋", heat: 75, platform, category: "青春", relatedTags: ["校园", "暗恋", "青春"], fetchedAt: now },
    { keyword: "末日生存", heat: 72, platform, category: "科幻", relatedTags: ["末日", "科幻", "生存"], fetchedAt: now },
    { keyword: "闺蜜反目", heat: 70, platform, category: "情感", relatedTags: ["友情", "背叛", "反转"], fetchedAt: now },
  ];
}

// Match trending topics with available character IPs
export async function recommendContent(
  topics: TrendingTopic[],
  availableIPs: Array<{ name: string; tags: string[] }>,
): Promise<ContentRecommendation[]> {
  const recommendations: ContentRecommendation[] = [];

  for (const topic of topics.slice(0, 5)) {
    const matchedIPs = availableIPs.filter(ip =>
      ip.tags.some(tag =>
        topic.relatedTags.includes(tag) || topic.keyword.includes(tag) || tag.includes(topic.category)
      )
    );

    recommendations.push({
      topic: topic.keyword,
      angle: `围绕"${topic.keyword}"创作${topic.category}类短视频`,
      matchedIPs: matchedIPs.map(ip => ip.name),
      estimatedEngagement: topic.heat >= 85 ? "high" : topic.heat >= 70 ? "medium" : "low",
    });
  }

  return recommendations;
}
