/**
 * Batch generate videos from storyboard images using Wan2.5 (wanx2.1-i2v-plus)
 * Uses base64 image input (local images, no public URL needed)
 * Dual API key rotation for higher throughput
 */
const Database = require("better-sqlite3");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const KEYS = [
  "sk-159e09c50bca4bf5980d19cf345d32ae",
  "sk-882a72229e3441ebaf304c9f749086b6",
];
const MODEL = "wanx2.1-i2v-plus";
const SUBMIT_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis";
const QUERY_URL = "https://dashscope.aliyuncs.com/api/v1/tasks/";
const UPLOADS = path.join(process.cwd(), "uploads");

let keyIdx = 0;
function getKey() { keyIdx = (keyIdx + 1) % KEYS.length; return KEYS[keyIdx]; }

async function submitVideo(imagePath, prompt, key) {
  const fullPath = path.join(UPLOADS, imagePath);
  if (!fs.existsSync(fullPath)) throw new Error("Image not found: " + imagePath);
  const b64 = "data:image/jpeg;base64," + fs.readFileSync(fullPath).toString("base64");

  const { data } = await axios.post(SUBMIT_URL, {
    model: MODEL,
    input: { prompt: prompt.substring(0, 300), img_url: b64 },
    parameters: { resolution: "480P", duration: 5 },
  }, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "X-DashScope-Async": "enable" },
    timeout: 60000,
  });
  if (data.code) throw new Error(`[${data.code}] ${data.message}`);
  return data.output?.task_id;
}

async function pollVideo(taskId, key) {
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    try {
      const { data } = await axios.get(QUERY_URL + taskId, { headers: { Authorization: `Bearer ${key}` }, timeout: 15000 });
      const status = data.output?.task_status;
      if (status === "SUCCEEDED") return data.output?.video_url;
      if (status === "FAILED") throw new Error(data.output?.message || "failed");
    } catch (e) {
      if (e.message.includes("failed")) throw e;
    }
  }
  throw new Error("timeout 5min");
}

async function main() {
  const db = new Database("./db.sqlite");

  db.prepare(`CREATE TABLE IF NOT EXISTS t_video_gen (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assetsId INTEGER,
    taskId TEXT,
    videoUrl TEXT,
    status TEXT DEFAULT 'pending',
    errorMsg TEXT,
    createdAt INTEGER
  )`).run();

  const doneIds = db.prepare("SELECT assetsId FROM t_video_gen WHERE status = 'success'").all().map(r => r.assetsId);

  const assets = db.prepare(`
    SELECT id, name, filePath, videoPrompt, scriptId, segmentId, shotIndex
    FROM t_assets WHERE projectId = 1 AND type = '分镜' AND filePath IS NOT NULL AND videoPrompt IS NOT NULL
    ORDER BY scriptId, segmentId, shotIndex
  `).all().filter(a => !doneIds.includes(a.id));

  console.log(`=== Wan2.5 Video Gen: ${assets.length} to process (${doneIds.length} already done) ===\n`);

  // Submit 2 at a time (1 per key), poll in parallel
  const CONCURRENT = 2;
  let success = 0, fail = 0, total = assets.length;

  for (let i = 0; i < total; i += CONCURRENT) {
    const batch = assets.slice(i, i + CONCURRENT);

    // Submit all in batch
    const tasks = [];
    for (const asset of batch) {
      const key = getKey();
      try {
        const taskId = await submitVideo(asset.filePath, asset.videoPrompt, key);
        tasks.push({ asset, taskId, key });
        db.prepare("INSERT INTO t_video_gen (assetsId, taskId, status, createdAt) VALUES (?, ?, 'pending', ?)").run(asset.id, taskId, Date.now());
      } catch (e) {
        fail++;
        db.prepare("INSERT INTO t_video_gen (assetsId, status, errorMsg, createdAt) VALUES (?, 'failed', ?, ?)").run(asset.id, e.message.substring(0, 200), Date.now());
        console.log(`[${success+fail}/${total}] ${asset.name} SUBMIT FAIL: ${e.message.substring(0, 60)}`);
      }
    }

    // Poll all
    const results = await Promise.all(tasks.map(async (t) => {
      try {
        const url = await pollVideo(t.taskId, t.key);
        db.prepare("UPDATE t_video_gen SET videoUrl = ?, status = 'success' WHERE taskId = ?").run(url, t.taskId);
        success++;
        return { name: t.asset.name, ok: true };
      } catch (e) {
        fail++;
        db.prepare("UPDATE t_video_gen SET status = 'failed', errorMsg = ? WHERE taskId = ?").run(e.message.substring(0, 200), t.taskId);
        return { name: t.asset.name, ok: false, err: e.message.substring(0, 60) };
      }
    }));

    results.forEach(r => {
      console.log(`[${success+fail}/${total}] ${r.name} -> ${r.ok ? 'OK' : 'FAIL: ' + r.err}`);
    });
  }

  console.log(`\n=== DONE === Success: ${success}/${total}, Failed: ${fail}`);
  db.close();
}

main().catch(console.error);
