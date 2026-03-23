/**
 * Direct storyboard generation — bypasses WebSocket Agent,
 * calls Qwen directly per script to produce segments + shots,
 * then writes results into t_assets.
 */
const Database = require("better-sqlite3");
const axios = require("axios");

const QWEN_KEY = "sk-159e09c50bca4bf5980d19cf345d32ae";
const QWEN_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
const PROJECT_ID = 1;

async function callQwen(systemPrompt, userPrompt) {
  const { data } = await axios.post(QWEN_URL, {
    model: "qwen-plus",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 16384,
    temperature: 0.7,
  }, {
    headers: { Authorization: `Bearer ${QWEN_KEY}`, "Content-Type": "application/json" },
    timeout: 120000,
  });
  return data.choices[0].message.content;
}

async function generateForScript(db, scriptId) {
  const script = db.prepare("SELECT content, name FROM t_script WHERE id = ? AND projectId = ?").get(scriptId, PROJECT_ID);
  if (!script || !script.content) {
    console.log(`  Script ${scriptId}: no content, skipping`);
    return { segments: 0, shots: 0 };
  }

  const outline = db.prepare("SELECT data FROM t_outline WHERE id = ?").get(scriptId);
  const outlineData = outline ? JSON.parse(outline.data) : {};

  // Step 1: Generate segments + shots in one call
  const systemPrompt = `你是专业的短剧分镜师。请为给定的剧本生成分镜脚本。

要求：
1. 将剧本拆解为5-8个片段(segment)，每个片段对应一个场景或连续动作
2. 为每个片段生成3-4个镜头(shot)，每个镜头包含详细的画面描述提示词

镜头提示词要求：
- 中文描述
- 包含：景别(大远景/全景/中景/近景/特写)、机位(俯拍/仰拍/平拍/侧拍)、构图法则(三分法/对角线/中心)
- 包含：角色位置、表情、动作、服装细节
- 包含：环境光线、氛围、道具
- 每条提示词100-150字

请严格按照以下JSON格式输出，不要输出其他内容：
{
  "segments": [
    {
      "index": 1,
      "description": "片段描述",
      "emotion": "情绪氛围",
      "shots": [
        {
          "prompt": "详细的镜头画面提示词..."
        }
      ]
    }
  ]
}`;

  const userPrompt = `剧本《${script.name}》：

${script.content}

请为这个剧本生成完整的分镜脚本（JSON格式）。`;

  console.log(`  Calling Qwen for script ${scriptId}...`);
  const raw = await callQwen(systemPrompt, userPrompt);

  // Extract JSON from response
  let result;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    result = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.log(`  Parse error for script ${scriptId}:`, e.message);
    console.log(`  Raw (first 300):`, raw.substring(0, 300));
    return { segments: 0, shots: 0 };
  }

  if (!result.segments || !result.segments.length) {
    console.log(`  No segments in result for script ${scriptId}`);
    return { segments: 0, shots: 0 };
  }

  // Step 2: Save to t_assets as storyboard entries
  let totalShots = 0;
  const insertStmt = db.prepare(`
    INSERT INTO t_assets (name, intro, prompt, type, projectId, scriptId, segmentId, shotIndex, state)
    VALUES (?, ?, ?, '分镜', ?, ?, ?, ?, 'pending')
  `);

  for (const seg of result.segments) {
    if (!seg.shots) continue;
    for (let i = 0; i < seg.shots.length; i++) {
      const shot = seg.shots[i];
      const name = `第${scriptId}集-S${seg.index}-镜头${i + 1}`;
      const intro = `[${seg.emotion || seg.description}] ${shot.prompt.substring(0, 100)}`;
      insertStmt.run(name, intro, shot.prompt, PROJECT_ID, scriptId, seg.index, i + 1);
      totalShots++;
    }
  }

  return { segments: result.segments.length, shots: totalShots };
}

async function main() {
  const db = new Database("./db.sqlite");

  console.log("=== Direct Storyboard Generation ===\n");

  let totalSegs = 0, totalShots = 0;

  for (let i = 1; i <= 10; i++) {
    console.log(`--- Episode ${i} ---`);
    try {
      const r = await generateForScript(db, i);
      totalSegs += r.segments;
      totalShots += r.shots;
      console.log(`  OK: ${r.segments} segments, ${r.shots} shots\n`);
    } catch (e) {
      console.log(`  ERROR: ${e.message}\n`);
    }
  }

  console.log(`\n=== DONE === ${totalSegs} segments, ${totalShots} shots total`);

  // Summary
  const count = db.prepare("SELECT count(*) as c FROM t_assets WHERE projectId = ? AND type = '分镜'").get(PROJECT_ID);
  console.log(`t_assets storyboard entries: ${count.c}`);

  db.close();
}

main().catch(console.error);
