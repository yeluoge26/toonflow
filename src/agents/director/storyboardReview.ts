// AI Director: Storyboard rhythm and quality review
// This extends the existing outline director to also review storyboards

export const storyboardDirectorPrompt = `# AI导演 - 分镜审查模块

你是一位资深影视导演，负责审查分镜序列的专业质量。

## 审查维度

### 1. 节奏控制（Pacing）
- 景别变化是否合理（避免连续相同景别）
- 情绪递进是否平滑（远→中→近→特写）
- 是否有足够的"呼吸空间"（不要全是密集镜头）
- 对话场景是否使用正反打技法

### 2. 视觉连贯性（Visual Continuity）
- 180度轴线法则是否遵守
- 人物视线方向是否一致
- 场景光照是否统一
- 服装道具是否前后一致

### 3. 情感表达（Emotional Impact）
- 高潮点是否有特写强调
- 转折处是否有视觉暗示
- 开场是否建立环境（远景/大远景）
- 结尾是否有收束感

### 4. 技术可行性（Technical Feasibility）
- AI生图的复杂度是否合理
- 多人场景是否过于复杂
- 特效要求是否可实现

## 输出格式

对每个片段给出：
- 整体评分：A/B/C/D
- 具体建议（最多3条）
- 建议调整的镜头编号和修改方向

示例：
{
  "segmentId": 1,
  "score": "B",
  "issues": [
    {"shotIndex": 2, "type": "pacing", "suggestion": "建议改为近景，当前与前一镜头景别重复"},
    {"shotIndex": 4, "type": "emotion", "suggestion": "此处为情绪高点，建议加特写强调表情"}
  ],
  "overall": "节奏整体流畅，建议在第2-3镜之间增加一个过渡镜头"
}
`;

export interface DirectorReviewResult {
  segmentId: number;
  score: "A" | "B" | "C" | "D";
  issues: Array<{
    shotIndex: number;
    type: "pacing" | "continuity" | "emotion" | "technical";
    suggestion: string;
  }>;
  overall: string;
}

import u from "@/utils";

// Execute a director review of storyboard shots
export async function reviewStoryboardShots(
  projectId: number,
  scriptId: number,
  segmentId: number,
  shots: Array<{ title: string; cells: any[]; fragmentContent: string }>
): Promise<DirectorReviewResult> {
  // Get AI config for the storyboard agent (reuse same model)
  const promptConfig = await u.getPromptAi("storyboardAgent");
  if (!promptConfig || Object.keys(promptConfig).length === 0) {
    return {
      segmentId,
      score: "B",
      issues: [],
      overall: "未配置AI模型，跳过导演审查",
    };
  }

  // Build review input
  const shotsDescription = shots.map((shot, i) =>
    `镜头${i + 1}: ${shot.title}\n内容: ${shot.fragmentContent}\n格数: ${shot.cells.length}`
  ).join("\n\n");

  try {
    const result = await u.ai.text.invoke(
      {
        messages: [
          {
            role: "system",
            content: storyboardDirectorPrompt,
          },
          {
            role: "user",
            content: `请审查以下分镜序列（片段ID: ${segmentId}）：\n\n${shotsDescription}\n\n请以JSON格式返回审查结果，包含 score, issues, overall 字段。`,
          },
        ],
      },
      promptConfig,
    );

    // Parse the AI response
    if (result?.text) {
      try {
        // Try to extract JSON from the response
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            segmentId,
            score: parsed.score || "B",
            issues: parsed.issues || [],
            overall: parsed.overall || "审查完成",
          };
        }
      } catch {
        // If JSON parsing fails, use the text as the overall comment
        return {
          segmentId,
          score: "B",
          issues: [],
          overall: result.text.slice(0, 500),
        };
      }
    }
  } catch (err) {
    console.error("Director review failed:", err);
  }

  return { segmentId, score: "B", issues: [], overall: "审查过程出错，使用默认评分" };
}
