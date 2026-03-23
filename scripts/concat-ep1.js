const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database('./db.sqlite');

// Get Episode 1 videos (Wan only, deduplicated by shot)
const videos = db.prepare(`
  SELECT v.videoUrl, a.name, a.segmentId, a.shotIndex
  FROM t_video_gen v
  JOIN t_assets a ON a.id = v.assetsId
  WHERE v.status = 'success' AND a.type = '分镜' AND a.scriptId = 1
    AND v.taskId NOT LIKE 'kling-%'
    AND v.videoUrl LIKE '/1/video/%'
  ORDER BY a.segmentId, a.shotIndex
`).all();

// Deduplicate by segment+shot (keep first)
const seen = new Set();
const unique = videos.filter(v => {
  const key = v.segmentId + '-' + v.shotIndex;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

console.log('Episode 1 unique shots:', unique.length);
unique.forEach((v, i) => console.log(i + ': ' + v.name + ' -> ' + v.videoUrl));

// Write ffmpeg concat file
const concatPath = path.join(process.cwd(), 'uploads', '1', 'video', 'ep1_concat.txt');
const lines = unique.map(v => {
  const absPath = path.join(process.cwd(), 'uploads', v.videoUrl).split('\\').join('/');
  return "file '" + absPath + "'";
});
fs.writeFileSync(concatPath, lines.join('\n'));
console.log('\nConcat list written:', concatPath);

db.close();
