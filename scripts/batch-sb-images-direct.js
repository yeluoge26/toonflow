/**
 * Direct storyboard image generation:
 * 1. Use Qwen to batch-translate Chinese prompts to English
 * 2. Call SD WebUI directly with English prompts
 * 3. Save images to uploads/ and update t_image
 */
const Database = require("better-sqlite3");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const QWEN_KEY1 = "sk-159e09c50bca4bf5980d19cf345d32ae";
const QWEN_KEY2 = "sk-882a72229e3441ebaf304c9f749086b6";
const QWEN_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
const SD_URL = "http://127.0.0.1:7860";
const UPLOADS_DIR = path.join(process.cwd(), "uploads");

let keyIndex = 0;
function getKey() {
  keyIndex = (keyIndex + 1) % 2;
  return keyIndex === 0 ? QWEN_KEY1 : QWEN_KEY2;
}

async function translateBatch(prompts) {
  const numbered = prompts.map((p, i) => `[${i + 1}] ${p}`).join("\n\n");
  const { data } = await axios.post(QWEN_URL, {
    model: "qwen-plus",
    messages: [
      { role: "system", content: "Translate each numbered Chinese image prompt to English. Keep the cinematic details (camera angle, composition, lighting). Output each with [number] prefix. No extra text." },
      { role: "user", content: numbered },
    ],
    max_tokens: 8192,
    temperature: 0.3,
  }, {
    headers: { Authorization: `Bearer ${getKey()}`, "Content-Type": "application/json" },
    timeout: 60000,
  });
  const raw = data.choices[0].message.content;
  // Parse [n] entries
  const result = {};
  const parts = raw.split(/\[(\d+)\]/);
  for (let i = 1; i < parts.length; i += 2) {
    const idx = parseInt(parts[i]);
    const text = (parts[i + 1] || "").trim().replace(/^\s*[:：]\s*/, "").trim();
    if (text) result[idx] = text;
  }
  return result;
}

async function generateSD(prompt, width = 1024, height = 576) {
  const { data } = await axios.post(`${SD_URL}/sdapi/v1/txt2img`, {
    prompt: prompt + ", best quality, highly detailed, cinematic lighting",
    negative_prompt: "lowres, bad anatomy, text, watermark, signature, blurry, worst quality",
    width,
    height,
    steps: 20,
    cfg_scale: 7,
    sampler_name: "DPM++ 2M SDE",
  }, { timeout: 120000 });

  if (!data.images || !data.images[0]) throw new Error("SD returned no image");
  return Buffer.from(data.images[0], "base64");
}

async function main() {
  const db = new Database("./db.sqlite");

  // Get all storyboard assets that need images
  const assets = db.prepare(
    "SELECT id, name, prompt, scriptId, segmentId, shotIndex FROM t_assets WHERE projectId = 1 AND type = '分镜' AND id NOT IN (SELECT assetsId FROM t_image WHERE state = '生成成功' AND type = '分镜') ORDER BY scriptId, segmentId, shotIndex"
  ).all();

  console.log(`=== ${assets.length} storyboard images to generate ===\n`);
  if (!assets.length) { db.close(); return; }

  // Batch translate in groups of 10
  const BATCH = 10;
  let done = 0, success = 0;

  for (let i = 0; i < assets.length; i += BATCH) {
    const batch = assets.slice(i, i + BATCH);

    // Step 1: Translate
    console.log(`Translating batch ${Math.floor(i/BATCH)+1}/${Math.ceil(assets.length/BATCH)}...`);
    let translations;
    try {
      translations = await translateBatch(batch.map(a => a.prompt));
    } catch (e) {
      console.log(`  Translation error: ${e.message}`);
      done += batch.length;
      continue;
    }

    // Step 2: Generate images one at a time
    for (let j = 0; j < batch.length; j++) {
      const asset = batch[j];
      const enPrompt = translations[j + 1] || asset.prompt;
      done++;

      try {
        const buf = await generateSD(enPrompt);

        // Save to uploads
        const imgDir = path.join(UPLOADS_DIR, "1", "storyboard");
        if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
        const fileName = `${uuidv4()}.jpg`;
        const filePath = `/${1}/storyboard/${fileName}`;
        fs.writeFileSync(path.join(imgDir, fileName), buf);

        // Insert t_image record
        db.prepare("INSERT INTO t_image (assetsId, filePath, state, type) VALUES (?, ?, '生成成功', '分镜')").run(asset.id, filePath);

        success++;
        if (done % 10 === 0 || done === assets.length) {
          console.log(`[${done}/${assets.length}] ${asset.name} -> OK (${success} total)`);
        }
      } catch (e) {
        console.log(`[${done}/${assets.length}] ${asset.name} -> FAIL (${e.message.substring(0, 60)})`);
      }
    }
  }

  console.log(`\n=== DONE === ${success}/${assets.length} generated`);
  db.close();
}

main().catch(console.error);
