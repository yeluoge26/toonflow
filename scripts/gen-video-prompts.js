/**
 * Generate video prompts for all storyboard entries that are missing them
 */
const Database = require("better-sqlite3");
const axios = require("axios");

const QWEN_KEY = "sk-159e09c50bca4bf5980d19cf345d32ae";
const QWEN_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

async function callQwen(systemPrompt, userPrompt) {
  const { data } = await axios.post(QWEN_URL, {
    model: "qwen-plus",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 4096,
    temperature: 0.7,
  }, {
    headers: { Authorization: `Bearer ${QWEN_KEY}`, "Content-Type": "application/json" },
    timeout: 60000,
  });
  return data.choices[0].message.content;
}

async function main() {
  const db = new Database("./db.sqlite");

  // Get all storyboard assets without video prompts
  const assets = db.prepare(
    "SELECT id, name, prompt, scriptId, segmentId, shotIndex FROM t_assets WHERE projectId = 1 AND type = '分镜' AND (videoPrompt IS NULL OR videoPrompt = '') ORDER BY scriptId, segmentId, shotIndex"
  ).all();

  console.log(`=== Generating video prompts for ${assets.length} storyboard entries ===\n`);

  const BATCH_SIZE = 5;
  let done = 0;

  for (let i = 0; i < assets.length; i += BATCH_SIZE) {
    const batch = assets.slice(i, i + BATCH_SIZE);
    const promptList = batch.map((a, idx) => `[${idx + 1}] ${a.name}: ${a.prompt}`).join("\n\n");

    try {
      const result = await callQwen(
        `你是短剧视频提示词专家。将镜头画面描述转换为简洁的视频生成提示词。

要求：
- 英文输出
- 每条50-80词
- 包含：camera movement, scene description, character action, lighting, mood
- 格式：纯文本，每条用 [序号] 开头
- 不要额外解释`,
        `请为以下${batch.length}个镜头生成视频提示词：\n\n${promptList}`
      );

      // Parse results
      const lines = result.split(/\[(\d+)\]/).filter(Boolean);
      for (let j = 0; j < batch.length; j++) {
        const vidPrompt = (lines[j * 2 + 1] || "").trim().replace(/^\s*[:：]\s*/, "").trim();
        if (vidPrompt) {
          db.prepare("UPDATE t_assets SET videoPrompt = ? WHERE id = ?").run(vidPrompt, batch[j].id);
        }
      }

      done += batch.length;
      console.log(`[${done}/${assets.length}] Batch done (scripts ${batch[0].scriptId}-${batch[batch.length - 1].scriptId})`);
    } catch (e) {
      console.log(`[${done}/${assets.length}] Error: ${e.message}`);
      done += batch.length;
    }
  }

  // Verify
  const filled = db.prepare(
    "SELECT count(*) as c FROM t_assets WHERE projectId = 1 AND type = '分镜' AND videoPrompt IS NOT NULL AND videoPrompt != ''"
  ).get();
  console.log(`\n=== DONE === ${filled.c}/${assets.length} video prompts generated`);

  db.close();
}

main().catch(console.error);
