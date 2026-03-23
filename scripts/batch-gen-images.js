const http = require("http");

const TOKEN = process.argv[2];
const BASE = "http://localhost:60000";

const assets = [
  // 角色 (7)
  {id:1, type:"role", name:"洛轻云", prompt:"a beautiful young woman about 20 years old, black hair tied up with golden phoenix hairpin, wearing gorgeous red ceremonial robe with golden aura, fantasy ancient Chinese immortal style, highly detailed, best quality, full body"},
  {id:2, type:"role", name:"萧君陌", prompt:"a handsome young man about 28 years old, pale face with bloodshot eyes, wearing dark prince robes, dried blood at corner of mouth, tortured expression, ancient Chinese fantasy prince, highly detailed, best quality, full body"},
  {id:3, type:"role", name:"洛芷昀", prompt:"a beautiful arrogant woman about 26 years old, wearing pink-red phoenix robe, pink phoenix mark on forehead, elaborate makeup, smug expression, holding a golden feather, ancient Chinese fantasy style, highly detailed, best quality, full body"},
  {id:4, type:"role", name:"宴泽", prompt:"a handsome gentle young man about 27 years old, black hair with jade hairpin, wearing purple robes, warm and kind eyes with hidden determination, dragon prince, ancient Chinese fantasy style, highly detailed, best quality, full body"},
  {id:5, type:"role", name:"巳炀", prompt:"an older man about 60 years old, stern and imposing face, golden ceremonial robes, ancient Chinese fantasy clan leader, highly detailed, best quality, full body"},
  {id:6, type:"role", name:"获罗", prompt:"a terrifying demon general, tall muscular figure covered in black scales, blood-red eyes, wielding a dark spiked staff, surrounded by dark demonic energy, fantasy monster warrior, highly detailed, best quality, full body"},
  {id:7, type:"role", name:"龙王", prompt:"a majestic elderly dragon king, wearing golden dragon robe and golden crown, holding jade scepter, kind proud eyes, ancient Chinese dragon palace ruler, highly detailed, best quality, full body"},

  // 场景 (15)
  {id:33, type:"scene", name:"天宫陵水殿", prompt:"magnificent golden celestial palace hall, ceiling embedded with luminous pearls, peach banquet tables, celestial maidens dancing, ethereal mist, ancient Chinese fantasy heaven, highly detailed, best quality, wide shot"},
  {id:34, type:"scene", name:"伏云殿偏殿", prompt:"chaotic side chamber of a palace, broken jade and spilled elixir bottles on floor, fresh cracks on walls, burning smell, a lone lamp flickering in corner, dark atmosphere, ancient Chinese fantasy"},
  {id:35, type:"scene", name:"东海紫龙私邸", prompt:"elegant underwater palace chamber, coral pillars, pearl lamps, luminous pearls on walls, unfinished ink painting on desk, koi fish swimming outside window, serene atmosphere, fantasy underwater palace"},
  {id:36, type:"scene", name:"诛仙台", prompt:"towering black stone execution platform reaching into clouds, dark red bloodstains covering surface, countless small holes from nails, surrounded by cold mist, lightning in dark clouds, ominous atmosphere, ancient Chinese fantasy"},
  {id:37, type:"scene", name:"司命殿", prompt:"solemn divination hall, large mirror-like fortune stone in center glowing blue, star charts and fate scrolls hanging around, dim lighting, incense smoke, mystical atmosphere, ancient Chinese fantasy temple"},
  {id:38, type:"scene", name:"落霞山", prompt:"misty immortal mountain with ancient trees, clear springs, birds and deer running through forest, peach and plum trees blooming, golden sunlight through clouds, ancient Chinese fantasy sacred mountain, wide landscape"},
  {id:39, type:"scene", name:"伏云殿", prompt:"luxurious but cold prince chambers, white silk canopy curtains, incense floating, gorgeous carpet with fresh bloodstains in corner, broken mirror pieces on desk, ancient Chinese fantasy palace interior"},
  {id:40, type:"scene", name:"殷宿山", prompt:"ancient green mountain range with towering trees, clear springs, wildflower fragrance, a small humble wooden hut with thick moss on roof in a remote corner, ancient Chinese fantasy wilderness mountain"},
  {id:41, type:"scene", name:"伏云殿内室", prompt:"cold secret chamber with precious jade bed glowing faint blue in center, luminous pearls on walls, medicine fragrance and cold air, thick fur rugs on floor, ancient Chinese fantasy icy chamber"},
  {id:42, type:"scene", name:"落霞山栖凰峰", prompt:"misty mountain peak with ancient trees, cherry blossoms blooming everywhere, petals falling in wind, phoenix flower aura, golden sunlight, sacred atmosphere, ancient Chinese fantasy mountain top"},
  {id:43, type:"scene", name:"栖凰峰顶", prompt:"mountain summit surrounded by golden clouds, red phoenix feathers on ground, high platform with phoenix jade crown and fire totems, sacred phoenix atmosphere, ancient Chinese fantasy ceremonial peak"},
  {id:44, type:"scene", name:"东海岸", prompt:"blood-stained beach with eerie red-glowing seawater, broken weapons and burnt corpses scattered, black demonic mist covering sky with lightning, battlefield devastation, dark fantasy war scene"},
  {id:45, type:"scene", name:"东海龙宫", prompt:"magnificent underwater dragon palace, coral pillars, pearl lamps, festive red silk decorations with lotus patterns, warm celebratory atmosphere, ancient Chinese fantasy wedding venue"},
  {id:46, type:"scene", name:"陵水殿", prompt:"breached celestial palace gates, bodies of soldiers scattered, battle sounds from deep within, blood and demonic energy in air, cracked floors and bloody walls, ancient Chinese fantasy war-torn palace"},
  {id:47, type:"scene", name:"诛魔阵中", prompt:"chaotic space of interweaving golden light and black mist, central death gate covered in ancient runes glowing faintly, destructive energy waves, explosive atmosphere, fantasy magical battle arena"},

  // 道具 (25)
  {id:8, type:"props", name:"炼天羽", prompt:"a palm-sized golden feather with rainbow spiritual light flowing on surface, sharp edges like a blade, faint blood traces at quill, warm golden metallic texture, fantasy magical item, detailed close-up"},
  {id:9, type:"props", name:"蟠桃", prompt:"a crystal-clear celestial peach with faint red blush, sweet fragrance, plump juicy flesh, heavenly offering fruit, glowing softly, fantasy food item, detailed close-up"},
  {id:10, type:"props", name:"销魂钉", prompt:"a three-inch black iron nail with dense barbs on surface, ancient runes on head, cold aura, dark red bloodstains, sinister torture instrument, fantasy dark weapon, detailed close-up"},
  {id:11, type:"props", name:"龙鳞甲", prompt:"heart-protecting armor made of purple dragon scales, each scale glowing faint purple, fine scratches, sharp edges, iridescent shimmer, warm spiritual energy, fantasy dragon armor, detailed close-up"},
  {id:12, type:"props", name:"晖焱果", prompt:"a fist-sized crimson red fruit with fine golden patterns on surface, burning hot aura, translucent flesh with golden veins visible inside, celestial treasure, fantasy magical fruit, detailed close-up"},
  {id:13, type:"props", name:"幻音镜", prompt:"a palm-sized round bronze mirror with faint cyan glow, cloud patterns carved on edge, magical communication device, ancient Chinese fantasy artifact, detailed close-up"},
  {id:14, type:"props", name:"借魄石", prompt:"a person-tall grey-blue stone with smooth mirror surface, flowing blue light inside, ancient runes carved on face, can reflect true form, mystical fortune stone, fantasy artifact"},
  {id:15, type:"props", name:"同心镜", prompt:"a palm-sized round bronze mirror with faint silver glow, twin fish carved on edge, magical bond mirror, ancient Chinese fantasy artifact, detailed close-up"},
  {id:16, type:"props", name:"凤凰真身", prompt:"magnificent golden phoenix bird with wings like clouds, rainbow spiritual aura on feather edges, five-colored tail feathers, burning sacred aura, fantasy divine bird, full body"},
  {id:17, type:"props", name:"梨花雨", prompt:"red raindrops containing ancient phoenix power, igniting red flames on ground, blood-colored flower rain filling sky, fantasy magical effect"},
  {id:18, type:"props", name:"凤凰灵力", prompt:"pale golden spiritual energy like mist surrounding body, warm sacred aura, golden particles floating, fantasy magical aura effect"},
  {id:19, type:"props", name:"玻玉床", prompt:"translucent crystal jade bed glowing faint blue, emanating cold energy, ancient phoenix patterns carved on surface, fantasy ice crystal furniture"},
  {id:20, type:"props", name:"圣泉水", prompt:"crystal clear spring water with faint silver glow, stored in golden flask with cloud patterns, celestial treasure for healing, fantasy magical potion, detailed close-up"},
  {id:21, type:"props", name:"羽焰凤袍", prompt:"gorgeous ceremonial robe woven from phoenix feathers, golden flame patterns flowing on surface, rainbow gems on edges, burning sacred aura, fantasy royal clothing"},
  {id:22, type:"props", name:"凤凰玉首", prompt:"ancient jade phoenix sculpture, pure white with faint golden glow, golden veins flowing inside, phoenix mark on forehead, sacred relic, fantasy artifact, detailed close-up"},
  {id:23, type:"props", name:"九十九重天火图腾", prompt:"ancient totem carved on platform, 99 flame patterns of different intensities, glowing crimson red, emanating burning heat, sacred fire power, fantasy magical carving"},
  {id:24, type:"props", name:"绝命杖", prompt:"a tall black staff covered in sharp barbs, dark red gem on top, emanating cold demonic energy, demon realm treasure weapon, fantasy dark weapon"},
  {id:25, type:"props", name:"冰墙", prompt:"massive ice wall formed from instantly frozen seawater, smooth mirror-like surface, flowing blue light inside, fantasy ice barrier magic"},
  {id:26, type:"props", name:"凤凰金羽剑", prompt:"a long sword formed from golden phoenix feathers, rainbow spiritual light on blade, sharp burning edges, phoenix deity exclusive weapon, fantasy magical sword"},
  {id:27, type:"props", name:"诛魔阵", prompt:"mystical formation of golden and silver light flowing, containing destructive energy, fantasy magical battle formation, aerial view"},
  {id:28, type:"props", name:"鲲鹏残影", prompt:"giant ethereal shadow of a Kunpeng bird glowing faint gold, wings blocking sun and moon, eyes full of compassion, fantasy mythical spirit"},
  {id:29, type:"props", name:"死门封印", prompt:"ancient rune-covered seal glowing faintly, fatal weakness of formation, explosive potential, fantasy magical seal, detailed close-up"},
  {id:30, type:"props", name:"并蒂莲喜服", prompt:"wedding dress woven from phoenix feathers, crooked twin lotus embroidery with uneven stitches but full of heart, rainbow gems on edges, fantasy wedding garment"},
  {id:31, type:"props", name:"桃树", prompt:"peach tree on mountain peak, upright trunk, pink peach blossoms blooming, petals falling in wind, faint peach fragrance, fantasy garden tree"},
  {id:32, type:"props", name:"三生石", prompt:"large pure white stone with smooth mirror surface, golden veins flowing inside, names carved on surface glowing warmly, destiny stone of love, fantasy magical artifact, detailed close-up"},
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
      timeout: 300000,
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ id: asset.id, name: asset.name, status: parsed.code === 200 ? "OK" : "FAIL", msg: parsed.message || parsed.data });
        } catch (e) {
          resolve({ id: asset.id, name: asset.name, status: "FAIL", msg: data.substring(0, 100) });
        }
      });
    });
    req.on("error", (e) => resolve({ id: asset.id, name: asset.name, status: "ERROR", msg: e.message }));
    req.on("timeout", () => { req.destroy(); resolve({ id: asset.id, name: asset.name, status: "TIMEOUT" }); });
    req.write(body);
    req.end();
  });
}

async function batchGenerate() {
  const CONCURRENCY = 2;
  let done = 0;
  let success = 0;
  let fail = 0;
  const total = assets.length;

  console.log("Starting batch generation: " + total + " assets, concurrency=" + CONCURRENCY);
  console.log("---");

  for (let i = 0; i < total; i += CONCURRENCY) {
    const batch = assets.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map((a) => generateOne(a)));
    results.forEach((r) => {
      done++;
      if (r.status === "OK") success++;
      else fail++;
      console.log("[" + done + "/" + total + "] " + r.name + " -> " + r.status + (r.status !== "OK" ? " (" + (r.msg || "") + ")" : ""));
    });
  }
  console.log("\n=== DONE ===");
  console.log("Success: " + success + "/" + total);
  console.log("Failed: " + fail + "/" + total);
}

batchGenerate().catch((e) => console.error(e));
