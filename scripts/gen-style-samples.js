// Generate one sample image per art style using SD local
const Database = require('better-sqlite3');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const db = new Database('./db.sqlite');
const SD_URL = 'http://127.0.0.1:7860';

// Get a good storyboard prompt for testing (Episode 1, Shot 1)
const testAsset = db.prepare("SELECT videoPrompt FROM t_assets WHERE type = '分镜' AND projectId = 1 AND scriptId = 1 AND segmentId = 1 AND shotIndex = 1").get();
const basePrompt = testAsset?.videoPrompt || 'A beautiful celestial palace hall with golden pillars, ethereal mist, ancient Chinese fantasy, a young woman in flowing robes standing in moonlight';
console.log('Base prompt:', basePrompt.substring(0, 80) + '...');

// All main styles to test
const styles = [
  { name: '2D动漫风格', en: '2d animation style' },
  { name: '真人写实', en: 'photorealistic, lifelike, ultra detailed' },
  { name: '3D国创', en: 'Chinese 3D animation style' },
  { name: '三渲二', en: 'cel-shaded' },
  { name: '日式少女漫', en: 'shoujo manga style' },
  { name: '龙族传说', en: 'dragon clan legend art' },
  { name: '吉卜力', en: 'Ghibli style, Studio Ghibli aesthetic' },
  { name: '名侦探阿楠', en: 'Detective Conan style' },
  { name: '草帽团', en: 'One Piece style' },
  { name: '木叶村', en: 'Naruto style, Konohagakure' },
  { name: '复古梦幻赛璐璐', en: 'retro dreamlike cel animation' },
  { name: '韩式漫画厚涂', en: 'Korean webtoon style, thick paint' },
  { name: '经典美式漫画', en: 'classic American comic book style' },
  { name: '美式3D', en: 'American 3D animation style, Pixar style' },
  { name: '空灵哥特', en: 'ethereal gothic' },
  { name: '藤本树', en: 'Tatsuki Fujimoto style' },
  { name: '柔光原画厚涂', en: 'key visual style, soft glow, thick paint' },
  { name: '通透光影厚涂', en: 'translucent lighting, thick paint' },
  { name: '可爱抽象涂鸦', en: 'cute abstract doodle' },  // current style for comparison
  { name: '80s年代', en: '1980s retro anime style' },
];

const sampleDir = path.join(process.cwd(), 'uploads', '1', 'sample');
if (!fs.existsSync(sampleDir)) fs.mkdirSync(sampleDir, { recursive: true });

async function generateSD(prompt, fileName) {
  try {
    const res = await axios.post(SD_URL + '/sdapi/v1/txt2img', {
      prompt: prompt + ', masterpiece, best quality, highly detailed',
      negative_prompt: 'nsfw, nude, low quality, blurry, deformed, ugly, text, watermark',
      steps: 25,
      cfg_scale: 7,
      width: 832,
      height: 464,
      sampler_name: 'DPM++ 2M SDE',
    }, { timeout: 120000 });

    if (res.data?.images?.[0]) {
      const buf = Buffer.from(res.data.images[0], 'base64');
      const filePath = path.join(sampleDir, fileName);
      fs.writeFileSync(filePath, buf);
      return true;
    }
    return false;
  } catch (e) {
    console.log('  SD error:', e.message.substring(0, 60));
    return false;
  }
}

(async () => {
  console.log(`Generating ${styles.length} style samples...`);
  let ok = 0;

  for (let i = 0; i < styles.length; i++) {
    const s = styles[i];
    const prompt = `${s.en}, ${basePrompt}`;
    const fileName = `${String(i + 1).padStart(2, '0')}_${s.name}.png`;

    process.stdout.write(`[${i + 1}/${styles.length}] ${s.name}...`);
    const success = await generateSD(prompt, fileName);
    if (success) {
      ok++;
      console.log(' OK');
    } else {
      console.log(' FAIL');
    }
  }

  console.log(`\nDone: ${ok}/${styles.length} samples generated`);
  console.log(`Output: ${sampleDir}`);
  db.close();
})();
