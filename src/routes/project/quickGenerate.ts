import express from "express";
import u from "@/utils";
import { success, error } from "@/lib/responseFormat";
const router = express.Router();

// 非SSE版本的一句话生成剧本，返回最终JSON结果
export default router.post("/", async (req, res) => {
  const {
    idea,
    episodeCount = 5,
    artStyle = "龙族传说",
    type = "短剧",
    videoRatio = "16:9",
  } = req.body;

  if (!idea) return res.status(400).send(error("请输入创作灵感"));

  try {
    // 1. Create project
    const [projectId] = await u.db("t_project").insert({
      name: idea.substring(0, 50),
      intro: idea,
      type,
      artStyle,
      videoRatio,
      userId: 1,
      createTime: Date.now(),
    });

    // 2. Load AI config
    const promptConfig = await u.getPromptAi("outlineScriptAgent");

    // 3. Generate storyline
    const storylineResult = await u.ai.text.invoke(
      {
        system:
          "你是一位专业的短剧编剧。根据用户的一句话灵感，生成一个完整的故事线。包含：主题、主要角色（3-5个，每个角色要有具体姓名和性格描写）、故事背景、核心冲突、情感线、结局走向。输出800-1500字。",
        messages: [
          {
            role: "user",
            content: `请根据以下灵感生成完整故事线：\n\n${idea}\n\n要求：\n- 类型：${type}\n- 风格：${artStyle}\n- 集数：${episodeCount}集\n- 每集约2分钟`,
          },
        ],
      },
      promptConfig as any,
    );
    const storyline = storylineResult.text;

    await u.db("t_storyline").insert({
      projectId,
      content: storyline,
    });

    // 4. Generate outlines
    const outlineResult = await u.ai.text.invoke(
      {
        system: `你是一位专业的短剧大纲师。根据故事线生成${episodeCount}集短剧大纲。每集大纲包含完整的结构化信息。

输出JSON数组格式，每个元素包含：
{
  "episodeIndex": 集数编号(从1开始),
  "title": "8字以内标题",
  "chapterRange": [关联章节号],
  "scenes": [{"name":"场景名","description":"环境描写"}],
  "characters": [{"name":"角色姓名","description":"人设样貌描写"}],
  "props": [{"name":"道具名","description":"样式描写"}],
  "coreConflict": "核心矛盾",
  "outline": "100-300字剧情主干",
  "openingHook": "开场镜头描写",
  "keyEvents": ["起","承","转","合"],
  "emotionalCurve": "情绪曲线",
  "visualHighlights": ["标志性镜头1","标志性镜头2","标志性镜头3"],
  "endingHook": "结尾悬念",
  "classicQuotes": ["金句1"]
}

直接输出JSON数组，不要有其他内容。`,
        messages: [
          {
            role: "user",
            content: `故事线：\n${storyline}\n\n请生成${episodeCount}集大纲，直接输出JSON数组。`,
          },
        ],
      },
      promptConfig as any,
    );

    let outlines: any[] = [];
    try {
      const jsonMatch = outlineResult.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) outlines = JSON.parse(jsonMatch[0]);
    } catch (e) {
      for (let i = 1; i <= episodeCount; i++) {
        outlines.push({
          episodeIndex: i,
          title: `第${i}集`,
          chapterRange: [i],
          scenes: [],
          characters: [],
          props: [],
          coreConflict: "",
          outline: "",
          openingHook: "",
          keyEvents: ["起", "承", "转", "合"],
          emotionalCurve: "",
          visualHighlights: [],
          endingHook: "",
          classicQuotes: [],
        });
      }
    }

    // Insert outlines
    const outlineInsertList = outlines.map((ep, idx) => ({
      projectId,
      data: JSON.stringify({ ...ep, episodeIndex: idx + 1 }),
      episode: idx + 1,
    }));
    await u.db("t_outline").insert(outlineInsertList);

    const insertedOutlines = await u
      .db("t_outline")
      .where({ projectId })
      .orderBy("episode", "asc")
      .select("id", "episode", "data");

    // Create empty scripts linked to outlines
    for (const ol of insertedOutlines) {
      const data = JSON.parse(ol.data || "{}");
      await u.db("t_script").insert({
        name: data.title || `第${ol.episode}集`,
        content: "",
        projectId,
        outlineId: ol.id,
      });
    }

    // 5. Generate scripts for each episode
    const scripts = await u
      .db("t_script")
      .where({ projectId })
      .orderBy("id", "asc");

    for (let i = 0; i < insertedOutlines.length; i++) {
      const ol = insertedOutlines[i];
      const ep = JSON.parse(ol.data || "{}");

      const scriptResult = await u.ai.text.invoke(
        {
          system: `你是一位专业的短剧编剧。根据大纲生成完整的分集剧本。格式要求：
※ 场景名
$ 出场角色
【环境音】
【BGM】
对白用「」
动作描述用()
旁白用[]
每集800-1500字。`,
          messages: [
            {
              role: "user",
              content: `故事线：\n${storyline}\n\n第${ol.episode}集大纲：\n${JSON.stringify(ep)}\n\n请生成完整剧本。`,
            },
          ],
        },
        promptConfig as any,
      );

      const matchScript = scripts.find((s: any) => s.outlineId === ol.id);
      if (matchScript) {
        await u
          .db("t_script")
          .where({ id: matchScript.id })
          .update({ content: scriptResult.text });
      }
    }

    // 6. Extract assets from outlines
    const allOutlineData = insertedOutlines.map((ol: any) => {
      try {
        return JSON.parse(ol.data || "{}");
      } catch {
        return {};
      }
    });

    const assetMap: Record<string, Map<string, string>> = {
      角色: new Map(),
      场景: new Map(),
      道具: new Map(),
    };

    for (const data of allOutlineData) {
      if (data.characters) {
        for (const c of data.characters) {
          if (c.name && !assetMap["角色"].has(c.name)) {
            assetMap["角色"].set(c.name, c.description || "");
          }
        }
      }
      if (data.scenes) {
        for (const s of data.scenes) {
          if (s.name && !assetMap["场景"].has(s.name)) {
            assetMap["场景"].set(s.name, s.description || "");
          }
        }
      }
      if (data.props) {
        for (const p of data.props) {
          if (p.name && !assetMap["道具"].has(p.name)) {
            assetMap["道具"].set(p.name, p.description || "");
          }
        }
      }
    }

    let assetCount = 0;
    for (const [assetType, items] of Object.entries(assetMap)) {
      for (const [name, description] of items) {
        await u.db("t_assets").insert({
          projectId,
          type: assetType,
          name,
          intro: description,
          prompt: description,
        });
        assetCount++;
      }
    }

    // 7. Return complete result
    const finalScripts = await u
      .db("t_script")
      .where({ projectId })
      .orderBy("id", "asc");
    const finalAssets = await u.db("t_assets").where({ projectId });

    res.status(200).send(
      success({
        projectId,
        storyline,
        episodes: outlines.length,
        outlines: outlines.map((o: any, idx: number) => ({
          episode: idx + 1,
          title: o.title,
        })),
        scripts: finalScripts.map((s: any) => ({
          id: s.id,
          name: s.name,
          contentLength: (s.content || "").length,
        })),
        assets: {
          total: assetCount,
          characters: assetMap["角色"].size,
          scenes: assetMap["场景"].size,
          props: assetMap["道具"].size,
        },
      }),
    );
  } catch (e: any) {
    console.error("[quickGenerate] error:", e);
    res.status(500).send(error(e.message || "生成失败"));
  }
});
