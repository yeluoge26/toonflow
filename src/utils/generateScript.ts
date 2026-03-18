import u from "@/utils";

interface Scene {
  name: string;
  description: string;
}

interface Character {
  name: string;
  description: string;
}

interface Prop {
  name: string;
  description: string;
}

export interface Episode {
  episodeIndex: number;
  title: string;
  chapterRange: number[];
  scenes: Scene[]; // 按 outline 出场顺序排列
  characters: Character[]; // 按 outline 出场顺序排列
  props: Prop[]; // 按 outline 出场顺序排列
  coreConflict: string;
  outline: string; // 最高优先级，剧本生成的唯一权威
  openingHook: string; // outline 第一句话的视觉化，开篇第一个镜头
  keyEvents: string[]; // 4个元素：[起, 承, 转, 合]，严格按 outline 顺序
  emotionalCurve: string; // 对应 keyEvents 各阶段
  visualHighlights: string[]; // 按 outline 顺序排列的标志性镜头
  endingHook: string; // outline 之后的悬念延伸
  classicQuotes: string[];
}

/**
 * 格式化Episode为结构化提示
 */
function formatEpisodePrompt(episode: Episode): string {
  const scenesStr = episode.scenes.map((s, i) => `  场景${i + 1}：${s.name}\n    环境描写：${s.description}`).join("\n");

  const charactersStr = episode.characters.map((c, i) => `  角色${i + 1}：${c.name}\n    人设样貌：${c.description}`).join("\n");

  const propsStr = episode.props.map((p, i) => `  道具${i + 1}：${p.name}\n    样式描写：${p.description}`).join("\n");

  // keyEvents 是数组格式，按顺序对应：起、承、转、合
  const keyEventsLabels = ["起", "承", "转", "合"];
  const keyEventsStr = episode.keyEvents.map((e, i) => `  【${keyEventsLabels[i] || i + 1}】${e}`).join("\n");

  const quotesStr = episode.classicQuotes.map((q, i) => `  金句${i + 1}：「${q}」`).join("\n");

  const highlightsStr = episode.visualHighlights.map((h, i) => `  镜头${i + 1}：${h}`).join("\n");

  return `
═══════════════════════════════════════
第${episode.episodeIndex}集：${episode.title}
关联章节：第${episode.chapterRange.join("、")}章
═══════════════════════════════════════

【场景列表】必须全部使用（按出场顺序排列）
${scenesStr}

【出场角色】必须全部使用（按出场顺序排列），首次出场需完整描述外貌
${charactersStr}

【关键道具】必须全部展示（按出场顺序排列）
${propsStr}

【核心矛盾】贯穿全集的主线冲突
${episode.coreConflict}

【剧情主干】⚠️ 最高优先级，剧本必须严格按此顺序展开
${episode.outline}

【开场镜头】⚠️ 必须作为剧本第一个镜头（outline开头的视觉化）
${episode.openingHook}

【剧情节点】必须严格按顺序呈现（起→承→转→合），顺序与剧情主干一致
${keyEventsStr}

【情绪曲线】必须在对应剧情节点体现情绪强度
${episode.emotionalCurve}

【视觉重点】标志性镜头，必须按剧情主干顺序呈现
${highlightsStr}

【结尾悬念】必须作为收尾，后接【黑屏】
${episode.endingHook}

【黄金金句】必须原文出现在剧本高潮段落
${quotesStr}
`;
}

/**
 * 生成单集剧本
 * @param episode 已解析的Episode对象
 * @param novelData 原文内容
 */
export async function generateScript(episode: Episode, novelData: string): Promise<string> {
  const episodePrompt = formatEpisodePrompt(episode);

  const targetWordCount = Math.max(500, episode.outline.length * 3);
  const userPrompt = `请根据以下结构化大纲生成剧本。

【⚠️ 最高优先级：剧情主干(outline)是唯一权威】
剧本必须严格按照【剧情主干】的叙事顺序展开，不得调整、跳跃或打乱顺序！

【强制要求】
1. ⚠️ 【开场镜头】必须是剧本的第一个镜头（这是outline开头的视觉化）
2. ⚠️ 严格按【剧情主干】顺序展开剧情，这是剧本的唯一权威
3. ⚠️ 【剧情节点】四步必须严格按顺序呈现：起→承→转→合，不输出标记
4. emotionalCurve必须在对应剧情节点体现
5. classicQuotes必须出现在对应keyEvent的高潮段落中作为角色台词
6. endingHook必须作为收尾
7. scenes/characters/props必须全部使用，按出场顺序
8. visualHighlights中的镜头必须按剧情主干顺序全部呈现
9. 目标${targetWordCount}字（${Math.round(targetWordCount * 0.8)}-${Math.round(targetWordCount * 1.2)}字范围内）
10. 以【黑屏】结尾
11. 每段描述应包含场景名称和可视化的动作描述，便于后续分镜拆分

═══════════════════════════════════════
大纲数据
═══════════════════════════════════════
${episodePrompt}

═══════════════════════════════════════
原文参考（仅用于补充细节和对话优化）
═══════════════════════════════════════
${novelData}`;

  const prompts = await u.db("t_prompts").where("code", "script").first();
  const promptConfig = await u.getPromptAi("generateScript");
  const mainPrompts = prompts?.customValue || prompts?.defaultValue || "不论用户说什么，请直接输出AI配置异常";

  const result = await u.ai.text.invoke(
    {
      messages: [
        { role: "system", content: mainPrompts },
        { role: "user", content: userPrompt },
      ],
    },
    promptConfig,
  );

  return result.text ?? "";
}
