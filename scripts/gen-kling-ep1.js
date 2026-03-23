// Generate 5-second Kling videos for all Episode 1 storyboard shots
// Uses native fetch + retry to handle DNS flakiness
const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const db = new Database('./db.sqlite');
const AK = 'A8CB4MtHf8pMCCMtCR9Jy8Dr8FDHLJC8';
const SK = 'bDf3PTB3pkpL3bPJTJt9hETAmfeK383t';
const KLING_BASE = 'https://api-beijing.klingai.com';
const videoDir = path.join(process.cwd(), 'uploads', '1', 'video');

function token() {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign({ iss: AK, exp: now + 1800, nbf: now - 30, iat: now }, SK, {
    algorithm: 'HS256', header: { alg: 'HS256', typ: 'JWT' },
  });
}

async function fetchRetry(url, opts, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try { return await fetch(url, opts); }
    catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 5000 * (i + 1)));
    }
  }
}

// Get Episode 1 shots with Gemini images
const shots = db.prepare(`
  SELECT id, name, filePath, videoPrompt, segmentId, shotIndex
  FROM t_assets
  WHERE type = '分镜' AND projectId = 1 AND scriptId = 1
    AND filePath LIKE '%gemini%'
  ORDER BY segmentId, shotIndex
`).all();

console.log(`Episode 1: ${shots.length} shots with Gemini images\n`);

(async () => {
  let ok = 0, fail = 0;
  const submitted = []; // {shot, taskId}

  // Phase 1: Submit all tasks (with rate limiting)
  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    const imgPath = path.join(process.cwd(), 'uploads', shot.filePath);
    if (!fs.existsSync(imgPath)) { console.log(`[${i+1}] ${shot.name} - no image, skip`); fail++; continue; }

    const b64 = fs.readFileSync(imgPath).toString('base64');
    process.stdout.write(`[${i+1}/${shots.length}] ${shot.name} submitting...`);

    try {
      const res = await fetchRetry(KLING_BASE + '/v1/videos/image2video', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_name: 'kling-v1', image: b64,
          prompt: (shot.videoPrompt || shot.name).substring(0, 500),
          duration: '5', mode: 'std',
        }),
      });
      const data = await res.json();
      if (data.code === 0 && data.data?.task_id) {
        console.log(' task=' + data.data.task_id.substring(0, 12));
        submitted.push({ shot, taskId: data.data.task_id });
      } else {
        console.log(' FAIL:', data.message);
        fail++;
      }
    } catch (e) {
      console.log(' ERROR:', e.message?.substring(0, 50));
      fail++;
    }

    // Rate limit: 5 sec between submits
    await new Promise(r => setTimeout(r, 5000));
  }

  console.log(`\nSubmitted ${submitted.length} tasks. Polling...\n`);

  // Phase 2: Poll all tasks
  const pending = [...submitted];
  for (let round = 0; round < 90 && pending.length > 0; round++) {
    await new Promise(r => setTimeout(r, 15000));

    for (let j = pending.length - 1; j >= 0; j--) {
      const { shot, taskId } = pending[j];
      try {
        const p = await fetchRetry(KLING_BASE + '/v1/videos/image2video/' + taskId, {
          headers: { Authorization: 'Bearer ' + token() },
        });
        const pd = await p.json();
        const s = pd.data?.task_status;

        if (s === 'succeed') {
          const url = pd.data.task_result?.videos?.[0]?.url;
          const vidName = `kling_ep1_s${shot.segmentId}_sh${shot.shotIndex}.mp4`;
          try {
            const v = await fetchRetry(url);
            const buf = Buffer.from(await v.arrayBuffer());
            fs.writeFileSync(path.join(videoDir, vidName), buf);
            db.prepare("INSERT INTO t_video_gen (assetsId, taskId, videoUrl, status, createdAt) VALUES (?,?,?,?,?)")
              .run(shot.id, 'kling-' + taskId, '/1/video/' + vidName, 'success', Date.now());
            ok++;
            console.log(`  ✓ ${shot.name} -> ${vidName} (${Math.round(buf.length/1024)}KB)`);
          } catch (de) {
            console.log(`  ✓ ${shot.name} video ready but download failed`);
            fail++;
          }
          pending.splice(j, 1);
        } else if (s === 'failed') {
          console.log(`  ✗ ${shot.name}: ${pd.data?.task_status_msg}`);
          pending.splice(j, 1);
          fail++;
        }
      } catch (e) { /* network error, retry next round */ }
    }

    if (pending.length > 0) {
      process.stdout.write(`  [round ${round + 1}] ${pending.length} pending, ${ok} done\r`);
    }
  }

  console.log(`\n=== Done: ${ok} OK, ${fail} FAIL out of ${shots.length} ===`);
  db.close();
})();
