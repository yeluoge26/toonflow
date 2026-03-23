const { createGoogleGenerativeAI } = require('@ai-sdk/google');
const { generateText } = require('ai');
const fs = require('fs');
const path = require('path');

const google = createGoogleGenerativeAI({ apiKey: 'AIzaSyAaPSnrmBjIeoQXgSktssjXPgAgVSA1dME' });
const sampleDir = path.join(process.cwd(), 'uploads', '1', 'sample');

const baseScene = 'Aerial wide shot over a celestial palace floor with luminous pearl ceiling, left third in deep shadow where a young woman in worn pale blue robes crouches in corner picking at golden brick seams, right two-thirds a proud woman in flowing pink phoenix robes sits on golden phoenix-patterned couch with cranes circling above, warm golden and cold white celestial light, ethereal mist, ancient Chinese fantasy heaven';

const styles = [
  { name: '2D动漫风格', en: '2d animation style' },
  { name: '真人写实', en: 'photorealistic, lifelike, ultra detailed, 8k' },
  { name: '3D国创', en: 'Chinese 3D animation style, CG rendering' },
  { name: '三渲二', en: 'cel-shaded, toon shading, anime 3D hybrid' },
  { name: '日式少女漫', en: 'shoujo manga style, soft romantic tones' },
  { name: '龙族传说', en: 'dragon clan legend art, epic fantasy' },
  { name: '吉卜力', en: 'Studio Ghibli aesthetic, warm painterly' },
  { name: '复古梦幻赛璐璐', en: 'retro dreamlike cel animation, 90s anime' },
  { name: '韩式漫画厚涂', en: 'Korean webtoon style, thick digital paint' },
  { name: '经典美式漫画', en: 'classic American comic book style, bold lines' },
  { name: '美式3D', en: 'Pixar 3D animation style, smooth rendering' },
  { name: '空灵哥特', en: 'ethereal gothic, dark elegant' },
  { name: '柔光原画厚涂', en: 'key visual concept art, soft glow, thick paint' },
  { name: '通透光影厚涂', en: 'translucent lighting, thick digital paint' },
  { name: '80s年代', en: '1980s retro anime style, vintage colors' },
  { name: '水墨国风', en: 'Chinese ink wash painting, traditional brushwork' },
  { name: '赛博朋克', en: 'cyberpunk neon, futuristic dark' },
  { name: '油画风', en: 'oil painting, classical art, rich textures' },
  { name: '可爱Q版', en: 'chibi, super deformed, cute big eyes' },
  { name: '暗黑奇幻', en: 'dark fantasy, dramatic lighting, epic scale' },
];

async function genOne(style, index) {
  const prompt = `${style.en}, ${baseScene}, masterpiece, best quality, highly detailed. Output image only.`;
  const fileName = `gemini_${String(index + 1).padStart(2, '0')}_${style.name}.png`;

  try {
    const result = await generateText({
      model: google.languageModel('gemini-2.5-flash-image'),
      prompt,
      providerOptions: { google: { imageConfig: { aspectRatio: '16:9' } } },
    });

    if (result.files?.length > 0) {
      const buf = Buffer.from(result.files[0].base64, 'base64');
      fs.writeFileSync(path.join(sampleDir, fileName), buf);
      return true;
    }
    return false;
  } catch (e) {
    console.log('  Error:', e.message?.substring(0, 80));
    return false;
  }
}

(async () => {
  console.log(`Generating ${styles.length} Gemini style samples...`);
  let ok = 0;

  for (let i = 0; i < styles.length; i++) {
    process.stdout.write(`[${i + 1}/${styles.length}] ${styles[i].name}...`);
    const success = await genOne(styles[i], i);
    if (success) { ok++; console.log(' OK'); }
    else { console.log(' FAIL'); }
    // Small delay to avoid rate limit
    if (i < styles.length - 1) await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\nDone: ${ok}/${styles.length}`);
  console.log(`Output: ${sampleDir}`);
})();
