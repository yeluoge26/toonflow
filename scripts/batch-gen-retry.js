const http = require("http");

const TOKEN = process.argv[2];
const BASE = "http://localhost:60000";

// Only the 13 that timed out
const assets = [
  {id:1, type:"role", name:"洛轻云", prompt:"a beautiful young woman about 20 years old, black hair tied up with golden phoenix hairpin, wearing gorgeous red ceremonial robe with golden aura, fantasy ancient Chinese immortal style, highly detailed, best quality, full body"},
  {id:2, type:"role", name:"萧君陌", prompt:"a handsome young man about 28 years old, pale face with bloodshot eyes, wearing dark prince robes, dried blood at corner of mouth, tortured expression, ancient Chinese fantasy prince, highly detailed, best quality, full body"},
  {id:3, type:"role", name:"洛芷昀", prompt:"a beautiful arrogant woman about 26 years old, wearing pink-red phoenix robe, pink phoenix mark on forehead, elaborate makeup, smug expression, holding a golden feather, ancient Chinese fantasy style, highly detailed, best quality, full body"},
  {id:4, type:"role", name:"宴泽", prompt:"a handsome gentle young man about 27 years old, black hair with jade hairpin, wearing purple robes, warm and kind eyes with hidden determination, dragon prince, ancient Chinese fantasy style, highly detailed, best quality, full body"},
  {id:5, type:"role", name:"巳炀", prompt:"an older man about 60 years old, stern and imposing face, golden ceremonial robes, ancient Chinese fantasy clan leader, highly detailed, best quality, full body"},
  {id:6, type:"role", name:"获罗", prompt:"a terrifying demon general, tall muscular figure covered in black scales, blood-red eyes, wielding a dark spiked staff, surrounded by dark demonic energy, fantasy monster warrior, highly detailed, best quality, full body"},
  {id:35, type:"scene", name:"东海紫龙私邸", prompt:"elegant underwater palace chamber, coral pillars, pearl lamps, luminous pearls on walls, unfinished ink painting on desk, koi fish swimming outside window, serene atmosphere, fantasy underwater palace"},
  {id:45, type:"scene", name:"东海龙宫", prompt:"magnificent underwater dragon palace, coral pillars, pearl lamps, festive red silk decorations with lotus patterns, warm celebratory atmosphere, ancient Chinese fantasy wedding venue"},
  {id:46, type:"scene", name:"陵水殿", prompt:"breached celestial palace gates, bodies of soldiers scattered, battle sounds from deep within, blood and demonic energy in air, cracked floors and bloody walls, ancient Chinese fantasy war-torn palace"},
  {id:47, type:"scene", name:"诛魔阵中", prompt:"chaotic space of interweaving golden light and black mist, central death gate covered in ancient runes glowing faintly, destructive energy waves, explosive atmosphere, fantasy magical battle arena"},
  {id:8, type:"props", name:"炼天羽", prompt:"a palm-sized golden feather with rainbow spiritual light flowing on surface, sharp edges like a blade, faint blood traces at quill, warm golden metallic texture, fantasy magical item, detailed close-up"},
  {id:9, type:"props", name:"蟠桃", prompt:"a crystal-clear celestial peach with faint red blush, sweet fragrance, plump juicy flesh, heavenly offering fruit, glowing softly, fantasy food item, detailed close-up"},
  {id:11, type:"props", name:"龙鳞甲", prompt:"heart-protecting armor made of purple dragon scales, each scale glowing faint purple, fine scratches, sharp edges, iridescent shimmer, warm spiritual energy, fantasy dragon armor, detailed close-up"},
];

function generateOne(asset) {
  const body = JSON.stringify({
    id: asset.id,
    type: asset.type,
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
      timeout: 600000, // 10 minutes timeout
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ id: asset.id, name: asset.name, status: parsed.code === 200 ? "OK" : "FAIL", msg: parsed.message || parsed.data });
        } catch (e) {
          resolve({ id: asset.id, name: asset.name, status: "FAIL", msg: data.substring(0, 200) });
        }
      });
    });
    req.on("error", (e) => resolve({ id: asset.id, name: asset.name, status: "ERROR", msg: e.message }));
    req.on("timeout", () => { req.destroy(); resolve({ id: asset.id, name: asset.name, status: "TIMEOUT" }); });
    req.write(body);
    req.end();
  });
}

async function run() {
  const total = assets.length;
  let done = 0, success = 0;

  console.log("Retrying " + total + " failed assets (1 at a time, 10min timeout)");

  for (const asset of assets) {
    const r = await generateOne(asset);
    done++;
    if (r.status === "OK") success++;
    console.log("[" + done + "/" + total + "] " + r.name + " -> " + r.status + (r.status !== "OK" ? " (" + (r.msg || "") + ")" : ""));
  }

  console.log("\n=== RETRY DONE === Success: " + success + "/" + total);
}

run().catch(console.error);
