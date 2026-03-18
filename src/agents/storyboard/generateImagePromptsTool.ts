import u from "@/utils";

type AspectRatio = "16:9" | "9:16" | "21:9" | "1:1" | "4:3" | "3:4" | "3:2" | "2:3";

interface GridLayoutResult {
  cols: number;
  rows: number;
  totalCells: number;
  placeholderCount: number;
}

interface GridPromptOptions {
  prompts: string[];
  style: string;
  aspectRatio: AspectRatio;
  assetsName: { name: string; intro: string }[];
}

interface GridPromptResult {
  prompt: string;
  gridLayout: GridLayoutResult;
}

/**
 * 根据prompts数量计算宫格布局
 */
function calculateGridLayout(count: number): GridLayoutResult {
  let cols: number;
  let rows: number;
  if (count <= 0) {
    cols = 1;
    rows = 1;
  } else if (count === 1) {
    cols = 1;
    rows = 1;
  } else if (count === 2) {
    cols = 2;
    rows = 1;
  } else if (count === 3) {
    cols = 3;
    rows = 1;
  } else if (count === 4) {
    cols = 2;
    rows = 2;
  } else if (count <= 9) {
    cols = 3;
    rows = 3;
  } else {
    cols = 3;
    rows = Math.ceil(count / 3);
  }
  const totalCells = cols * rows;
  const placeholderCount = totalCells - count;
  return { cols, rows, totalCells, placeholderCount };
}

/**
 * 获取宽高比描述
 */
function getAspectRatioDescription(aspectRatio: AspectRatio): string {
  const descriptions: Record<AspectRatio, string> = {
    "16:9": "电影宽银幕",
    "9:16": "竖屏短剧",
    "21:9": "超宽银幕史诗感",
    "1:1": "方形构图",
    "4:3": "经典银幕",
    "3:4": "竖版经典",
    "3:2": "摄影标准",
    "2:3": "竖版摄影",
  };
  return descriptions[aspectRatio] || "标准比例";
}

/**
 * 生成电影级宫格分镜提示词
 */
async function generateGridPrompt(options: GridPromptOptions): Promise<GridPromptResult> {
  const { prompts, style, aspectRatio, assetsName } = options;
  const layout = calculateGridLayout(prompts.length);
  const aspectRatioDesc = getAspectRatioDescription(aspectRatio);

  // 构建宫格位置描述
  const gridPositions: string[] = [];
  for (let i = 0; i < layout.totalCells; i++) {
    const row = Math.floor(i / layout.cols) + 1;
    const col = (i % layout.cols) + 1;
    if (i < prompts.length) {
      gridPositions.push(`[第${row}行第${col}列]: ${prompts[i]}`);
    } else {
      gridPositions.push(`[第${row}行第${col}列]: 纯黑图`);
    }
  }

  // 构建资产说明
  const assetsSection =
    assetsName.length > 0
      ? `\n【可用资产】\n${assetsName.map((a) => `- ${a.name}：${a.intro}`).join("\n")}\n\n⚠️ 必须使用完整资产名称，禁止简称或代词。`
      : "";

  const promptsData = await u.db("t_prompts").where("code", "generateImagePrompts").first();
  if (!promptsData) {
    console.error("Failed to load prompts config for code 'generateImagePrompts'");
  }
  const promptAiConfig = await u.getPromptAi("storyboardAgent");
  if (!promptAiConfig) {
    console.error("Failed to load AI config for 'storyboardAgent'");
  }
  const mainPrompts = promptsData?.customValue || promptsData?.defaultValue;
  const errData = `请输出${options.prompts.length}张图片\n提示词如下:\n${options.prompts.map((p, i) => `第${i + 1}格: ${p}`).join("\n")}`;

  if (!mainPrompts) return { prompt: errData, gridLayout: layout };

  const result = await u.ai.text.invoke(
    {
      messages: [
        {
          role: "system",
          content: mainPrompts,
        },
        {
          role: "user",
          content: `请优化以下分镜提示词：\n\n【布局】${layout.cols}列×${layout.rows}行=${
            layout.totalCells
          }格\n【比例】${aspectRatio}（${aspectRatioDesc}）\n【风格】${style}\n${assetsSection}\n\n【原始内容】\n${gridPositions.join("\n")}`,
        },
      ],
    },
    promptAiConfig,
  );

  // const result = await chatModel!.invoke({
  //   messages: [
  //     {
  //       role: "system",
  //       content: mainPrompts,
  //     },
  //     {
  //       role: "user",
  //       content: `请优化以下分镜提示词：\n\n【布局】${layout.cols}列×${layout.rows}行=${
  //         layout.totalCells
  //       }格\n【比例】${aspectRatio}（${aspectRatioDesc}）\n【风格】${style}\n${assetsSection}\n\n【原始内容】\n${gridPositions.join("\n")}`,
  //     },
  //   ],
  // });

  return {
    prompt: result.text ?? errData,
    gridLayout: layout,
  };
}

export default generateGridPrompt;
