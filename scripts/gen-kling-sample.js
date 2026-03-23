/**
 * Generate sample Kling videos for comparison with Wan2.5
 * Uses first 5 storyboard images
 */
const Database = require("better-sqlite3");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const AK = "A8CB4MtHf8pMCCMtCR9Jy8Dr8FDHLJC8";
const SK = "bDf3PTB3pkpL3bPJTJt9hETAmfeK383t";
const UPLOADS = path.join(process.cwd(), "uploads");

function getToken() {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign({ iss: AK, exp: now + 1800, nbf: now - 5 }, SK, { algorithm: "HS256", header: { alg: "HS256", typ: "JWT" } });
}

async function submitKling(imagePath, prompt) {
  const imgBuf = fs.readFileSync(path.join(UPLOADS, imagePath));
  const b64 = imgBuf.toString("base64");
  const token = getToken();

  const { data } = await axios.post("https://api-beijing.klingai.com/v1/videos/image2video", {
    model_name: "kling-v1-6",
    mode: "std",
    duration: "5",
    prompt: prompt.substring(0, 200),
    aspect_ratio: "16:9",
    image: b64,
  }, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    timeout: 30000,
  });

  if (data.code !== 0) throw new Error(data.message);
  return data.data?.task_id;
}

async function pollKling(taskId) {
  const token = getToken();
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const { data } = await axios.get(`https://api-beijing.klingai.com/v1/videos/image2video/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const status = data.data?.task_status;
    if (status === "succeed") return data.data?.task_result?.videos?.[0]?.url;
    if (status === "failed") throw new Error(data.data?.task_status_msg || "failed");
  }
  throw new Error("timeout");
}

async function main() {
  const db = new Database("./db.sqlite");

  const assets = db.prepare(`
    SELECT id, name, filePath, videoPrompt, scriptId
    FROM t_assets WHERE projectId = 1 AND type = '分镜' AND filePath IS NOT NULL AND videoPrompt IS NOT NULL
    ORDER BY scriptId, segmentId, shotIndex LIMIT 5
  `).all();

  console.log(`=== Kling Video Generation (${assets.length} samples) ===\n`);

  for (const asset of assets) {
    console.log(`${asset.name}...`);
    try {
      const taskId = await submitKling(asset.filePath, asset.videoPrompt);
      console.log(`  Submitted: ${taskId}`);
      const url = await pollKling(taskId);
      console.log(`  OK: ${url.substring(0, 100)}...\n`);

      // Save to t_video_gen for comparison
      db.prepare("INSERT INTO t_video_gen (assetsId, taskId, videoUrl, status, createdAt) VALUES (?, ?, ?, 'success', ?)").run(
        asset.id, "kling-" + taskId, url, Date.now()
      );
    } catch (e) {
      console.log(`  FAIL: ${e.message}\n`);
    }
  }

  // Show comparison summary
  console.log("=== Comparison Summary ===");
  const wanVideos = db.prepare("SELECT count(*) as c FROM t_video_gen WHERE status = 'success' AND taskId NOT LIKE 'kling-%'").get().c;
  const klingVideos = db.prepare("SELECT count(*) as c FROM t_video_gen WHERE status = 'success' AND taskId LIKE 'kling-%'").get().c;
  console.log(`Wan2.5 videos: ${wanVideos}`);
  console.log(`Kling videos: ${klingVideos}`);

  db.close();
}

main().catch(console.error);
