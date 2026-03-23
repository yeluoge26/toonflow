/**
 * Batch generate storyboard images via ToonFlow API (uses configured image model)
 * Generates 2 at a time to avoid overloading
 */
const http = require("http");
const Database = require("better-sqlite3");

const TOKEN = process.argv[2];
const BASE = "http://localhost:60000";
const CONCURRENCY = 2;

function generateOne(asset) {
  const body = JSON.stringify({
    id: asset.id,
    type: "storyboard",
    projectId: 1,
    name: asset.name,
    prompt: asset.prompt,
  });

  return new Promise((resolve) => {
    const req = http.request(BASE + "/assets/generateAssets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + TOKEN,
      },
      timeout: 300000,
    }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          const p = JSON.parse(data);
          resolve({ id: asset.id, name: asset.name, ok: p.code === 200 });
        } catch (e) {
          resolve({ id: asset.id, name: asset.name, ok: false, err: data.substring(0, 100) });
        }
      });
    });
    req.on("error", (e) => resolve({ id: asset.id, name: asset.name, ok: false, err: e.message }));
    req.on("timeout", () => { req.destroy(); resolve({ id: asset.id, name: asset.name, ok: false, err: "timeout" }); });
    req.write(body);
    req.end();
  });
}

async function main() {
  const db = new Database("./db.sqlite");

  // Get storyboard assets without images
  const assets = db.prepare(
    "SELECT a.id, a.name, a.prompt FROM t_assets a WHERE a.projectId = 1 AND a.type = '分镜' AND a.filePath IS NULL ORDER BY a.scriptId, a.segmentId, a.shotIndex"
  ).all();
  db.close();

  const total = assets.length;
  console.log(`=== Generating ${total} storyboard images (concurrency=${CONCURRENCY}) ===\n`);

  let done = 0, success = 0, fail = 0;

  for (let i = 0; i < total; i += CONCURRENCY) {
    const batch = assets.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(a => generateOne(a)));

    results.forEach(r => {
      done++;
      if (r.ok) success++;
      else fail++;
      const status = r.ok ? "OK" : "FAIL";
      // Only log failures or every 10th
      if (!r.ok || done % 10 === 0 || done === total) {
        console.log(`[${done}/${total}] ${r.name} -> ${status}${r.err ? " (" + r.err + ")" : ""}`);
      }
    });
  }

  console.log(`\n=== DONE === Success: ${success}/${total}, Failed: ${fail}/${total}`);
}

main().catch(console.error);
