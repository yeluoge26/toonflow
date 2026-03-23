// Step 1: Gemini generates Episode 1 storyboard images in "龙族传说" style
// Step 2: Kling generates 5s videos from those images
const Database = require('better-sqlite3');
const { createGoogleGenerativeAI } = require('@ai-sdk/google');
const { generateText } = require('ai');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const db = new Database('./db.sqlite');
const GEMINI_KEY = 'AIzaSyAaPSnrmBjIeoQXgSktssjXPgAgVSA1dME';
const KLING_AK = 'A8CB4MtHf8pMCCMtCR9Jy8Dr8FDHLJC8';
const KLING_SK = 'bDf3PTB3pkpL3bPJTJt9hETAmfeK383t';
const KLING_BASE = 'https://api-beijing.klingai.com';

const google = createGoogleGenerativeAI({ apiKey: GEMINI_KEY });
const uploadsDir = path.join(process.cwd(), 'uploads');
const videoDir = path.join(uploadsDir, '1', 'video');

function getKlingToken() {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign({ iss: KLING_AK, exp: now + 1800, nbf: now - 5, iat: now }, KLING_SK, {
    algorithm: 'HS256', header: { alg: 'HS256', typ: 'JWT' },
  });
}

// Get Episode 1 storyboard shots
const shots = db.prepare(`
  SELECT id, name, prompt, videoPrompt, segmentId, shotIndex
  FROM t_assets
  WHERE type = '分镜' AND projectId = 1 AND scriptId = 1
  ORDER BY segmentId, shotIndex
`).all();

console.log(`Episode 1: ${shots.length} shots\n`);

const STYLE = 'dragon clan legend art, epic fantasy, ancient Chinese mythology style';

async function geminiGenImage(prompt, filePath) {
  const fullPrompt = `${STYLE}, ${prompt}, masterpiece, best quality, highly detailed, cinematic lighting. Output image only.`;
  const result = await generateText({
    model: google.languageModel('gemini-2.5-flash-image'),
    prompt: fullPrompt,
    providerOptions: { google: { imageConfig: { aspectRatio: '16:9' } } },
  });
  if (result.files?.length > 0) {
    const buf = Buffer.from(result.files[0].base64, 'base64');
    fs.writeFileSync(filePath, buf);
    return true;
  }
  return false;
}

async function klingSubmit(imagePath, prompt) {
  const buf = fs.readFileSync(imagePath);
  const b64 = buf.toString('base64');
  const token = getKlingToken();

  const res = await axios.post(KLING_BASE + '/v1/videos/image2video', {
    model_name: 'kling-v1',
    image: b64,
    prompt: prompt.substring(0, 500),
    duration: '5',
    mode: 'std',
    cfg_scale: 0.5,
  }, {
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    timeout: 60000,
    maxBodyLength: 50 * 1024 * 1024,
  });

  if (res.data?.code === 0) return res.data.data?.task_id;
  throw new Error(res.data?.message || 'submit failed');
}

async function klingPoll(taskId) {
  for (let i = 0; i < 90; i++) { // max 15 min
    await new Promise(r => setTimeout(r, 10000));
    try {
      const token = getKlingToken();
      const res = await axios.get(KLING_BASE + '/v1/videos/image2video/' + taskId, {
        headers: { Authorization: 'Bearer ' + token },
        timeout: 15000,
      });
      const d = res.data?.data;
      if (d?.task_status === 'succeed') return d.task_result?.videos?.[0]?.url;
      if (d?.task_status === 'failed') throw new Error(d.task_status_msg || 'failed');
    } catch (e) {
      if (e.message?.includes('failed')) throw e;
    }
  }
  throw new Error('timeout 15min');
}

(async () => {
  let imgOk = 0, vidOk = 0, fail = 0;

  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    const imgName = `gemini_ep1_s${shot.segmentId}_sh${shot.shotIndex}.png`;
    const imgPath = path.join(uploadsDir, '1', 'storyboard', imgName);
    const localImgPath = '/1/storyboard/' + imgName;

    // Step 1: Generate image with Gemini
    process.stdout.write(`[${i + 1}/${shots.length}] ${shot.name} IMG...`);
    try {
      const prompt = shot.videoPrompt || shot.prompt || shot.name;
      await geminiGenImage(prompt, imgPath);
      // Update asset filePath
      db.prepare('UPDATE t_assets SET filePath = ? WHERE id = ?').run(localImgPath, shot.id);
      imgOk++;
      process.stdout.write(' OK | VID...');
    } catch (e) {
      console.log(' IMG FAIL:', e.message?.substring(0, 60));
      fail++;
      continue;
    }

    // Step 2: Generate Kling video from image
    try {
      const taskId = await klingSubmit(imgPath, shot.videoPrompt || shot.name);
      process.stdout.write(` task=${taskId.substring(0, 8)}, polling...`);
      const videoUrl = await klingPoll(taskId);

      // Download video
      const vidName = `kling_ep1_s${shot.segmentId}_sh${shot.shotIndex}.mp4`;
      const vidPath = path.join(videoDir, vidName);
      const res = await axios.get(videoUrl, { responseType: 'arraybuffer', timeout: 60000 });
      fs.writeFileSync(vidPath, res.data);

      // Save to DB
      const localVidPath = '/1/video/' + vidName;
      db.prepare("INSERT INTO t_video_gen (assetsId, taskId, videoUrl, status, createdAt) VALUES (?,?,?,?,?)")
        .run(shot.id, 'kling-' + taskId, localVidPath, 'success', Date.now());

      vidOk++;
      console.log(` OK (${Math.round(res.data.length / 1024)}KB)`);
    } catch (e) {
      console.log(' VID FAIL:', e.message?.substring(0, 60));
      fail++;
    }

    // Rate limit delay
    await new Promise(r => setTimeout(r, 3000));
  }

  console.log(`\n=== Done ===`);
  console.log(`Images: ${imgOk}/${shots.length}`);
  console.log(`Videos: ${vidOk}/${shots.length}`);
  console.log(`Failures: ${fail}`);
  db.close();
})();
