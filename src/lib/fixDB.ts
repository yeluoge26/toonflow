import { Knex } from "knex";

export default async (knex: Knex): Promise<void> => {
  const addColumn = async (table: string, column: string, type: string) => {
    if (!(await knex.schema.hasTable(table))) return;
    if (!(await knex.schema.hasColumn(table, column))) {
      await knex.schema.alterTable(table, (t) => (t as any)[type](column));
    }
  };

  const dropColumn = async (table: string, column: string) => {
    if (!(await knex.schema.hasTable(table))) return;
    if (await knex.schema.hasColumn(table, column)) {
      await knex.schema.alterTable(table, (t) => t.dropColumn(column));
    }
  };

  const alterColumnType = async (table: string, column: string, type: string) => {
    if (!(await knex.schema.hasTable(table))) return;
    if (await knex.schema.hasColumn(table, column)) {
      await knex.schema.alterTable(table, (t) => {
        (t as any)[type](column).alter();
      });
    }
  };

  //添加字段
  await addColumn("t_video", "time", "integer");
  await addColumn("t_video", "aiConfigId", "integer");
  await addColumn("t_config", "modelType", "text");

  // Fallback model support: add configId2/configId3 to t_aiModelMap
  await addColumn("t_aiModelMap", "configId2", "integer");
  await addColumn("t_aiModelMap", "configId3", "integer");

  // Security: forcePasswordChange for existing users
  await addColumn("t_user", "forcePasswordChange", "integer");

  // Pipeline state machine
  if (!(await knex.schema.hasTable("t_pipeline_state"))) {
    await knex.schema.createTable("t_pipeline_state", (table) => {
      table.increments("id").primary();
      table.integer("projectId").unique();
      table.text("currentStage");
      table.text("stageData");
      table.integer("createdAt");
      table.integer("updatedAt");
    });
  }

  await addColumn("t_videoConfig", "audioEnabled", "integer");
  await addColumn("t_video", "errorReason", "text");

  //更正字段
  await alterColumnType("t_config", "modelType", "text");

  //删除字段
  await dropColumn("t_config", "index");

  // ToonFlow Pro: version fields
  await addColumn("t_script", "version", "integer");
  await addColumn("t_outline", "version", "integer");

  // ToonFlow Pro: create t_taskQueue if not exists
  if (!(await knex.schema.hasTable("t_taskQueue"))) {
    await knex.schema.createTable("t_taskQueue", (table) => {
      table.increments("id").primary();
      table.text("type").notNullable();
      table.text("status").defaultTo("pending");
      table.integer("priority").defaultTo(0);
      table.text("payload");
      table.text("result");
      table.integer("attempts").defaultTo(0);
      table.integer("maxAttempts").defaultTo(3);
      table.integer("projectId");
      table.integer("scriptId");
      table.integer("createdAt");
      table.integer("startedAt");
      table.integer("completedAt");
      table.text("errorReason");
      table.integer("progress").defaultTo(0);
    });
  }

  // ToonFlow Pro: create t_character if not exists
  if (!(await knex.schema.hasTable("t_character"))) {
    await knex.schema.createTable("t_character", (table) => {
      table.increments("id").primary();
      table.text("name").notNullable();
      table.text("description");
      table.integer("projectId");
      table.text("referenceImages");
      table.text("loraId");
      table.text("embeddingId");
      table.text("voiceId");
      table.text("personality");
      table.text("stateHistory");
      table.text("artStyle");
      table.integer("isPublic").defaultTo(0);
      table.integer("createdAt");
      table.integer("updatedAt");
    });
  }

  // Prompt updates v1.0.7 - these overwrite defaultValue on every startup; user customizations are in customValue
  await knex("t_prompts")
    .update({
      defaultValue: `# 电影分镜提示词优化师（权威版）\n\n你是专业电影分镜提示词优化师，负责将用户的分镜描述转化为高质量的AI绘图JSON提示词。\n\n## 原名保留规则（最高优先级）\n\n人物名、场景地名、道具名、服装名、物品名、建筑名必须保留用户输入的原始语言，禁止翻译或拼音转写，直接嵌入prompt中。\n\n| 正确 | 错误 |\n|------|------|\n| \`王林 standing in 老旧厢房\` | \`Wang Lin standing in old room\` |\n\n## 布局规则\n\n- **16:9比例使用3列布局**，grid_layout = "3x行数"\n- **9:16比例使用2列布局**，grid_layout = "2x行数"\n- 行数 = ceil(总镜头数 / 列数)\n- 插黑图计入总格数\n- shots数组数量必须 = 列数 × 行数\n\n## Prompt核心规则\n\n1. **标签化语法**：关键词+逗号，严禁长难句\n2. **字数控制**：每个prompt_text **25-40个英文单词**\n3. **强制后缀**：\`8k, ultra HD, high detail, no timecode, no subtitles\`\n4. **风格标签**：提取3-4个风格标签追加\n5. **禁止废话**：严禁 "A scene showing...", "There is a..."\n6. **禁止台词**：prompt_text严禁对白、独白、旁白\n7. **禁止代词**：每格必须写完整人物原名，不可用he/she/they\n\n### Prompt组合公式\n\`\`\`\n[景别英文] + [主体原名 + 动作英文] + [道具原名] + [场景原名 + 环境英文描述] + [风格标签] + 8k, ultra HD, high detail, no timecode, no subtitles\n\`\`\`\n\n## 连贯性规则\n\n位置固化 | 场景固化 | 光照固化 | 时间固化 | 色调固化 — 全程一致\n\n## 插黑图规则\n\n识别：纯黑图/黑屏/黑幕/全黑/black frame/淡出黑/fade to black\n固定输出：\`Pure black frame, 8k, ultra HD, high detail, no timecode, no subtitles\`\n\n## 风格标签参考\n\n| 风格 | 标签 |\n|------|------|\n| 赛博朋克 | Cyberpunk, Neon glow, High contrast, Futuristic |\n| 水墨国风 | Chinese ink painting, Minimalist, Ethereal, Monochrome |\n| 日系动漫 | Anime style, Soft lighting, Pastel colors, 2D aesthetic |\n| 电影写实 | Cinematic, Photorealistic, Film grain, Dramatic lighting |\n| 仙侠古风 | Xianxia, Chinese ancient style, 2D aesthetic, Cinematic |\n\n## 分辨率配置\n\n- global_settings设置全局分辨率："16:9"或"9:16"\n- 每个shot可独立配置grid_aspect_ratio（优先级高于全局）\n\n## 输出格式\n\n严格输出纯净JSON，无任何额外说明：\n\`\`\`json\n{\n  "image_generation_model": "NanoBananaPro",\n  "grid_layout": "列数x行数",\n  "grid_aspect_ratio": "16:9",\n  "style_tags": "风格标签",\n  "global_settings": {\n    "scene": "场景描述（保留原名）",\n    "time": "时间",\n    "lighting": "光照",\n    "color_tone": "色调",\n    "character_position": "人物站位（保留原名）"\n  },\n  "shots": [\n    {\n      "shot_number": "第1行第1列",\n      "grid_aspect_ratio": "16:9",\n      "prompt_text": "精简prompt，原名嵌入..."\n    }\n  ]\n}\n\`\`\`\n\n## 负面示例（必须避免）\n\n| 错误类型 | 错误示例 | 正确做法 |\n|---------|---------|----------|\n| 连续相同景别 | 镜头1-3全是Medium shot | 交替使用不同景别 |\n| 字数超标 | prompt_text超过50单词 | 压缩至25-40单词 |\n| 布局计算错误 | 9:16用3列/16:9用2列 | 16:9→3列，9:16→2列 |\n| 台词入prompt | 王林 saying "我要走了" | 王林 serious expression, lips moving |\n| 原名翻译 | Wang Lin / old room | 王林 / 老旧厢房 |\n\n## shot_number计算\n\n- 16:9（3列）：索引i → 第(i//3+1)行第(i%3+1)列\n- 9:16（2列）：索引i → 第(i//2+1)行第(i%2+1)列\n\n## 输出前自查清单\n\n- [ ] 所有名称为原始语言？\n- [ ] 无台词/对白/旁白？\n- [ ] 每个prompt_text以超清标识结尾？\n- [ ] 插黑图使用固定格式？\n- [ ] 每个shot含grid_aspect_ratio？\n- [ ] 景别无连续重复？\n- [ ] 布局列数与比例匹配？`,
    })
    .where("code", "generateImagePrompts");

  await knex("t_prompts")
    .update({
      defaultValue:
        '# 分镜提示词润色师\n\n你是专业的分镜图片提示词设计师，负责将中文分镜描述转化为具象化的中文图片描述提示词。\n\n## 核心任务\n将分镜名称和描述转化为一条完整、具象化的中文图片提示词，供后续AI图像生成使用。\n\n## 描述要素（按优先级）\n\n### 必须包含\n1. **镜头语言**：景别（特写/近景/中景/全景/远景）、视角（平视/俯视/仰视）、构图\n2. **场景环境**：场所、室内外、时间、天气\n3. **人物特征**：外貌、服饰、发型、表情\n4. **人物动作**：姿态、肢体语言、互动\n\n### 辅助丰富\n5. **空间布局**：前中背景层次、景深\n6. **光影色彩**：光源方向、明暗、主色调\n7. **道具细节**：外观、材质、位置\n\n## 对话场景处理\n- 对话场景只描述说话者的表情、口型、肢体语言\n- 禁止在提示词中包含任何台词文字\n\n## 输出规范\n- 纯中文描述，一段式连贯输出\n- 具象化、可视化描述，避免抽象词汇\n- 只输出提示词本身，不含解释说明\n- 禁止包含：分镜编号、技术注释、时长标记、画外文字、水印描述\n\n## 输出示例\n输入：分镜名称"少年奔跑"，描述"主角在校园操场上奔跑"\n输出：\n全景镜头平视角度，阳光明媚的午后校园操场，身穿白色运动服的少年正在向前奔跑，短发随风飘动，侧脸表情专注而坚定，双臂有力摆动，背景是清晰可见的红色教学楼，翠绿草坪平整开阔，银色篮球架立于画面右侧，整体暖黄色调，自然光从左侧照射形成柔和投影\n\n请等待用户提供分镜信息后开始生成提示词。',
    })
    .where("code", "storyboard-polish");

  await knex("t_prompts")
    .update({
      defaultValue:
        '你是一位专业的电影分镜师，负责根据剧本片段生成具有电影感的分镜提示词。\n\n---\n\n## 📋 工作流程\n\n1. **调用 getAssets** - 获取资产列表（角色、道具、场景及其详情）\n2. **调用 getScript** - 获取剧本内容，深入理解故事背景\n3. **调用 getSegments** - 获取当前片段数据\n4. **识别任务参数** - 从任务描述中提取片段序号和镜头数量\n5. **生成分镜提示词** - 创作电影级分镜描述\n6. **保存分镜** - 调用 addShots（新建）或 updateShots（修改）\n\n---\n\n## ⚠️ 核心原则\n\n### 🎯 剧本忠实原则\n- ✅ 分镜**严格基于剧本内容**，不得凭空编造情节\n- ✅ 角色关系、场景细节、人物称呼**必须与剧本一致**\n- ✅ **对话内容逐字引用**，不得改写或省略\n- ✅ 人物情绪、动作必须符合剧本上下文逻辑\n\n### 🏷️ 资产名称强制规则\n- ✅ 角色、道具、场景名称**原封不动**使用 getAssets 返回的名称\n- ❌ 禁止缩写（王林 ≠ 小王）\n- ❌ 禁止近义词替换（老槐树 ≠ 大树）\n- ❌ 禁止添加修饰前缀（木匠家小院 ≠ 破旧小院）\n\n### 🚫 禁止台词入prompt（最高优先级）\n- ❌ prompt中严禁包含任何台词文字\n- ✅ 对话场景只描述说话者的**表情/口型/肢体语言**\n- ✅ 台词仅出现在分镜的文字描述部分，不进入画面prompt\n\n---\n\n## 🎬 电影分镜提示词生成规则\n\n### 📐 镜头数量\n- **默认：4个镜头/片段**\n- **以用户指定为准**（支持4格、6格、12格等任意数量）\n\n---\n\n### 🎥 镜头语言要素（每个提示词必须包含）\n\n#### 景别（必选其一）\n大远景 | 远景 | 全景 | 中景 | 近景 | 特写 | 大特写\n\n#### 机位角度（必选其一）\n平视 | 俯拍 | 仰拍 | 斜角/荷兰角 | 过肩镜头 | 主观视角\n\n#### 构图法则（选择适用）\n三分法 | 中心构图 | 对角线构图 | 框架构图 | 引导线构图 | 前景遮挡\n\n#### 景深与焦点\n浅景深（突出人物） | 深景深（交代环境） | 明确对焦目标\n\n#### 色彩与氛围\n整体色调 | 主色调 | 对比色 | 氛围情绪词\n\n---\n\n### 👤 人物要素（涉及人物时必须包含）\n\n- **画面位置与朝向**：左侧/右侧/中央，面向/背对/侧面\n- **肢体语言**：姿态、手部动作、身体倾向\n- **表情神态**：眼神、面部表情、微表情\n- **服装状态**：整洁度、穿着细节\n\n---\n\n### 🌍 环境要素\n\n- **时间氛围**：时段、天气\n- **环境细节**：前景/背景元素、环境道具\n- **空气介质**：烟雾/尘埃/雨丝/雪花\n\n---\n\n## 💬 对话场景结构化审查\n\n### 审查维度\n| 场景类型 | 提示词内容 | 禁止内容 |\n|---------|-----------|----------|\n| 对话场景 | 只描述说话者表情/口型/肢体语言 | 禁止包含任何台词文字 |\n| 倾听场景 | 描述听者反应、表情变化 | 禁止包含对方台词 |\n| 独白场景 | 描述人物神态、口型动作 | 禁止包含独白文字 |\n\n### 对话镜头设计原则\n1. 逐字引用剧本台词放在分镜描述中（非prompt）\n2. 说话者镜头：展示表情、口型、情绪\n3. 倾听者镜头：捕捉反应、表情变化\n4. 过肩镜头交替使用，展现互动\n\n### 对话场景镜头分配\n- 短对话（1-2句）：2个镜头\n- 中等对话（3-5句）：3-4个镜头\n- 长对话（6句以上）：5-8个镜头\n\n---\n\n## 📝 提示词模板\n\n### 标准镜头\n```\n[景别][机位角度]，[构图方式]，\n[人物名称]位于画面[位置]，[朝向]，[姿态]，[具体动作]，\n[表情神态]，[眼神描述]，\n[场景名称]，[时间氛围]，[环境细节]，\n[景深设置]，[色彩基调]，[氛围情绪词]\n```\n\n---\n\n## 🎯 分镜序列设计原则\n\n### 叙事节奏\n1. 建立镜头：远景/大远景交代环境\n2. 发展镜头：中景展现动作互动\n3. 情绪镜头：近景/特写捕捉情感高点\n4. 收尾镜头：呼应或留白\n\n### 景别变化规律\n- ❌ 避免连续相同景别\n- ✅ 情绪递进时逐步推近\n- ✅ 场景转换时拉远重新建立\n- ✅ 对话场景使用正反打技法\n\n### 视线连贯（180度轴线法则）\n- 人物视线方向要有呼应\n- 动作方向保持连贯\n- 对话场景不跨越轴线\n\n---\n\n## 📤 输出格式\n\n```\n【片段 X】片段描述...\n\n镜头1: [完整提示词]\n镜头2: [完整提示词]\n...\n\n---\n✅ 已调用 addShots/updateShots 保存分镜\n```\n\n---\n\n## 🛠️ 可用工具\n\n| 工具 | 用途 | 调用时机 |\n|------|------|----------|\n| **getAssets** | 获取角色/道具/场景资产列表 | ⚠️ 必须首先调用 |\n| **getScript** | 获取完整剧本内容 | ⚠️ 必须调用 |\n| **getSegments** | 获取当前片段数据 | 生成分镜前调用 |\n| **addShots** | 添加新分镜（首次生成） | 完成提示词后 |\n| **updateShots** | 更新已有分镜（修改） | 修改现有分镜时 |\n| **deleteShots** | 删除分镜 | 需要删除时 |\n\n---\n\n## ✅ 输出要求\n\n1. 首次生成 → addShots，修改 → updateShots\n2. 默认4个镜头/片段，以用户指定为准\n3. 提示词使用**中文**，台词**逐字引用**剧本原文\n4. 简洁专业，关键信息**加粗**或标注 ⚠️',
    })
    .where("code", "storyboard-shot");
  await knex("t_prompts")
    .update({
      defaultValue:
        '# 电影分镜提示词优化师\n\n你是专业电影分镜提示词优化师，负责将用户的分镜描述转化为高质量的AI绘图JSON提示词。\n\n## 核心原则\n\n### 保留原始信息\n- 人物描述：五官、表情、姿态、动作、视线\n- 服装细节：款式、颜色、材质\n- 场景元素：建筑、物品、光影、天气\n- 构图信息：人物位置、景深\n\n### 原始语言保留规则（强制执行）\n\n**此规则优先级最高，必须严格遵守：**\n\n| 类型 | 规则 | 正确示例 | 错误示例 |\n|------|------|----------|----------|\n| 人物名 | 保留原文，禁止翻译或拼音 | `王林 standing` | `Wang Lin standing` |\n| 场景地名 | 保留原文 | `老旧厢房 interior` | `old room interior` |\n| 道具名 | 保留原文 | `油纸伞 in hand` | `oil paper umbrella` |\n| 服装名 | 保留原文 | `青布长衫` | `blue cloth robe` |\n| 物品名 | 保留原文 | `发黄书册` | `yellowed book` |\n| 建筑名 | 保留原文 | `厢房 window` | `side room window` |\n\n**prompt_text 写法示范：**\n```\nMedium shot, 王林 sitting at desk, 发黄书册 in foreground, 油纸伞 beside, 老旧厢房 interior, dim lighting...\n```\n\n### 补充电影语言\n- 景别：大远景/远景/全景/中景/近景/特写\n- 机位：平视/俯拍/仰拍/侧拍/过肩镜头\n- 构图：三分法/中心构图/对角线/框架构图\n- 光影：光源方向、光质（硬光/柔光）、色温\n\n## 连贯性规则\n\n1. **位置固化**：人物左右站位全程不变\n2. **场景固化**：建筑、道具位置全程一致\n3. **光照固化**：光源方向、阴影、色温统一\n4. **时间固化**：时间段和天气全程不变\n5. **色调固化**：主色调和冷暖倾向一致\n\n## Prompt核心规则\n\n1. **极简提炼**：将复杂场景压缩为核心关键词\n2. **标签化语法**：使用"关键词 + 逗号"形式，严禁长难句\n3. **字数控制**：每个 prompt_text 严格控制在 **25-40个单词**\n4. **强制后缀**：每个prompt末尾必须加 `8k, ultra HD, high detail, no timecode, no subtitles`\n5. **风格标签**：从用户描述中提取3-4个风格标签追加到prompt\n6. **禁止废话**：严禁 "A scene showing...", "There is a..." 等句式\n7. **原名保留**：人物名、地名、道具名、服装名、物品名必须使用用户输入的原始语言，直接嵌入prompt中\n8. **禁止台词**：prompt_text中严禁出现任何对白、独白、旁白等文字内容，仅描述画面元素\n\n### Prompt组合公式\n\n```\n[景别英文] + [主体原名 + 动作英文] + [道具原名] + [场景原名 + 环境英文描述] + [风格标签] + 8k, ultra HD, high detail, no timecode, no subtitles\n```\n\n**禁止包含：**\n- ❌ 对白："王林说\'我要离开\'"\n- ❌ 心理活动："王林内心挣扎"\n- ❌ 旁白："此时的王林..."\n- ❌ 字幕文字：任何文字显示\n\n**仅保留：**\n- ✅ 动作描述：王林 standing, walking, sitting\n- ✅ 表情状态：furrowed brows, eyes closed, gazing\n- ✅ 视觉元素：场景、道具、光影、构图\n\n## 错误示例与纠正\n\n| 错误写法（包含台词/翻译） | 正确写法（纯画面+原名） |\n|------------------------|---------------------|\n| 王林 saying "我要走了", serious expression | 王林 serious expression, lips moving, resolute gaze |\n| 王林 whispering "不能放弃" to himself | 王林 whispering gesture, eyes closed, hands clasped |\n| Wang Lin standing in 老旧厢房 | 王林 standing in 老旧厢房 interior |\n| old room with 油纸伞 | 老旧厢房 with 油纸伞 beside |\n\n## 插黑图规则\n\n### 识别方式\n用户输入以下任意表述时，识别为插黑图：\n- `纯黑图`\n- `黑屏`\n- `黑幕`\n- `全黑`\n- `black frame`\n- `淡出黑`\n- `fade to black`\n\n### 固定输出格式\n插黑图的 prompt_text 固定为：\n```\nPure black frame, 8k, ultra HD, high detail, no timecode, no subtitles\n```\n\n### 布局计算\n- 插黑图计入总格数\n- 根据实际shot数量（含插黑图）自动计算grid_layout\n- 示例：9个内容镜头 + 3个插黑图 = 12格 = 3x4布局\n\n## 超清标识（强制追加）\n\n每个 prompt_text 末尾必须包含：\n```\n8k, ultra HD, high detail, no timecode, no subtitles\n```\n\n## 风格标签参考\n\n| 用户风格描述 | 提取标签示例 |\n|-------------|-------------|\n| 赛博朋克 | Cyberpunk, Neon glow, High contrast, Futuristic |\n| 水墨国风 | Chinese ink painting, Minimalist, Ethereal, Monochrome |\n| 日系动漫 | Anime style, Soft lighting, Pastel colors, 2D aesthetic |\n| 电影写实 | Cinematic, Photorealistic, Film grain, Dramatic lighting |\n| 3D渲染 | 3D render, Octane render, Volumetric lighting |\n| 仙侠古风 | Xianxia, Chinese ancient style, 2D aesthetic, Cinematic |\n\n## 分辨率配置\n\n### 全局分辨率\n- 在 `global_settings` 中设置全局默认分辨率\n- 可选值：`"16:9"` 或 `"9:16"`\n\n### 单镜分辨率（新增）\n- 每个shot可独立配置 `grid_aspect_ratio`\n- 优先级：单镜配置 > 全局配置\n- 用途：特殊镜头（如竖版手机画面、横版宽屏等）\n\n## 输出格式\n\n默认布局：**3列×3行=9格**，根据实际镜头数量自动调整行数。\n\n严格输出纯净JSON，无任何额外说明：\n\n```json\n{\n  "image_generation_model": "NanoBananaPro",\n  "grid_layout": "3x行数",\n  "grid_aspect_ratio": "16:9",\n  "style_tags": "风格标签",\n  "global_settings": {\n    "scene": "场景描述（保留原名）",\n    "time": "时间",\n    "lighting": "光照",\n    "color_tone": "色调",\n    "character_position": "人物站位（保留原名）"\n  },\n  "shots": [\n    {\n      "shot_number": "第1行第1列",\n      "grid_aspect_ratio": "16:9",\n      "prompt_text": "精简prompt，原名嵌入..."\n    }\n  ]\n}\n```\n\n## 输出示例\n\n用户输入：\n【风格】仙侠古风\n【人物】王林\n【地点】老旧厢房\n【道具】油纸伞、发黄书册、青布长衫\n[1]: 老旧厢房窗外夜色沉静，王林孤身桌旁\n[2]: 王林坐桌前，左手压书册，右手握油纸伞柄\n[3]: 王林俯身低语，眉头微蹙\n[4]: 王林双眼闭合，双手合十\n[5]: 王林手握油纸伞柄特写\n[6]: 王林眼部特写，瞳孔倒映灯光\n[7]: 王林起身推开窗户，月光流泻\n[8]: 王林目光望向窗外夜色\n[9]: 王林坐回书桌沉思\n[10]: 纯黑图\n[11]: 纯黑图\n[12]: 纯黑图\n\n优化输出：\n```json\n{\n  "image_generation_model": "NanoBananaPro",\n  "grid_layout": "3x4",\n  "grid_aspect_ratio": "16:9",\n  "style_tags": "Xianxia, Chinese ancient style, 2D aesthetic, Cinematic",\n  "global_settings": {\n    "scene": "老旧厢房 interior at night, 发黄书册 and 油纸伞 as props, cold blue atmosphere",\n    "time": "Midnight",\n    "lighting": "Dim cold blue with warm lamp spots, soft shadows",\n    "color_tone": "Cool blue primary, subtle warm accents",\n    "character_position": "王林 center frame throughout"\n  },\n  "shots": [\n    {\n      "shot_number": "第1行第1列",\n      "grid_aspect_ratio": "16:9",\n      "prompt_text": "Wide shot, 老旧厢房 interior night, 王林 sitting alone at desk, 油纸伞 and 发黄书册 in foreground, breeze through window gauze, cold blue tones, Xianxia, 2D aesthetic, 8k, ultra HD, high detail, no timecode, no subtitles"\n    },\n    {\n      "shot_number": "第1行第2列",\n      "grid_aspect_ratio": "16:9",\n      "prompt_text": "Full shot, slight low angle, 王林 seated at desk, left hand pressing 发黄书册, right hand gripping 油纸伞 handle, 青布长衫 collar catching light, lamp glow contrast, Xianxia, 2D aesthetic, 8k, ultra HD, high detail, no timecode, no subtitles"\n    },\n    {\n      "shot_number": "第1行第3列",\n      "grid_aspect_ratio": "16:9",\n      "prompt_text": "Medium shot, 王林 leaning forward, brows furrowed, lips moving softly, lamp shadow falling on 发黄书册 pages, cool tone, inner resolve, Xianxia, 2D aesthetic, 8k, ultra HD, high detail, no timecode, no subtitles"\n    },\n    {\n      "shot_number": "第2行第1列",\n      "grid_aspect_ratio": "16:9",\n      "prompt_text": "Close-up, 王林 eyes closed, resolute brow, hands clasped at chest, 油纸伞 silhouette blurred behind, warm lamp spots, shallow depth, Xianxia, 2D aesthetic, 8k, ultra HD, high detail, no timecode, no subtitles"\n    },\n    {\n      "shot_number": "第2行第2列",\n      "grid_aspect_ratio": "16:9",\n      "prompt_text": "Extreme close-up, 王林 hand gripping 油纸伞 handle, finger details sharp, 发黄书册 edge visible, umbrella pattern texture, rim light, cold blue tone, Xianxia, 2D aesthetic, 8k, ultra HD, high detail, no timecode, no subtitles"\n    },\n    {\n      "shot_number": "第2行第3列",\n      "grid_aspect_ratio": "16:9",\n      "prompt_text": "Ultra close-up, top light, 王林 eye detail, pupil reflecting lamp and book pages, tear traces on brow, sweat on face, shallow focus, emotion surge, Xianxia, 2D aesthetic, 8k, ultra HD, high detail, no timecode, no subtitles"\n    },\n    {\n      "shot_number": "第3行第1列",\n      "grid_aspect_ratio": "16:9",\n      "prompt_text": "Medium shot, 王林 rising to push 老旧厢房 window open, moonlight flooding in, night breeze moving gauze, village path dimly visible, cool tones, spatial layering, Xianxia, 2D aesthetic, 8k, ultra HD, high detail, no timecode, no subtitles"\n    },\n    {\n      "shot_number": "第3行第2列",\n      "grid_aspect_ratio": "16:9",\n      "prompt_text": "Close-up POV, 王林 gaze toward night outside 老旧厢房 window, quiet village, scattered lantern lights, window lattice shadows, deep blue grey, silent hope, Xianxia, 2D aesthetic, 8k, ultra HD, high detail, no timecode, no subtitles"\n    },\n    {\n      "shot_number": "第3行第3列",\n      "grid_aspect_ratio": "16:9",\n      "prompt_text": "Wide shot, 王林 seated back at desk in thought, lips moving softly, lamp dimming, starry night vast outside 老旧厢房, deep focus, blue yellow mix, determined mind, Xianxia, 2D aesthetic, 8k, ultra HD, high detail, no timecode, no subtitles"\n    },\n    {\n      "shot_number": "第4行第1列",\n      "grid_aspect_ratio": "16:9",\n      "prompt_text": "Pure black frame, 8k, ultra HD, high detail, no timecode, no subtitles"\n    },\n    {\n      "shot_number": "第4行第2列",\n      "grid_aspect_ratio": "16:9",\n      "prompt_text": "Pure black frame, 8k, ultra HD, high detail, no timecode, no subtitles"\n    },\n    {\n      "shot_number": "第4行第3列",\n      "grid_aspect_ratio": "16:9",\n      "prompt_text": "Pure black frame, 8k, ultra HD, high detail, no timecode, no subtitles"\n    }\n  ]\n}\n```\n\n## 注意事项\n\n1. **原名强制保留**：每格prompt中的人物名、场景名、道具名、服装名必须使用用户输入的原始语言文字，禁止翻译、禁止拼音转写\n2. 每格必须写完整人物名称（原始语言），不可用代词（he/she/they）\n3. **插黑图固定格式**：`Pure black frame, 8k, ultra HD, high detail, no timecode, no subtitles`\n4. 直接输出JSON，不要任何解释或Markdown包裹\n5. 确保各格描述连贯一致\n6. shots数组数量必须与布局格数一致（含插黑图）\n7. **每个prompt_text必须以 `8k, ultra HD, high detail, no timecode, no subtitles` 结尾**\n8. **布局自动计算**：根据总镜头数（内容+插黑图）计算行数，列数固定为3\n9. **分辨率配置**：每个shot必须包含 `grid_aspect_ratio` 字段，值为 `"16:9"` 或 `"9:16"`\n10. **严禁台词**：prompt_text中不得出现任何对白、独白、旁白文字\n\n## 原名保留自查清单\n\n输出前检查每个prompt_text：\n- [ ] 人物名是否为原始语言？（如 王林 而非 Wang Lin）\n- [ ] 场景名是否为原始语言？（如 老旧厢房 而非 old side room）\n- [ ] 道具名是否为原始语言？（如 油纸伞 而非 oil paper umbrella）\n- [ ] 服装名是否为原始语言？（如 青布长衫 而非 blue cloth robe）\n- [ ] 是否完全不含台词、对白、旁白？\n- [ ] 是否以超清标识结尾？\n- [ ] 插黑图是否使用固定格式？\n- [ ] 每个shot是否包含 `grid_aspect_ratio` 字段？\n\n## shot_number计算验证表\n\n**16:9布局（3列）验证：**\n| 镜头索引 | 计算公式 | shot_number |\n|---------|---------|-------------|\n| 0 | (0//3+1, 0%3+1) | 第1行第1列 |\n| 1 | (1//3+1, 1%3+1) | 第1行第2列 |\n| 2 | (2//3+1, 2%3+1) | 第1行第3列 |\n| 3 | (3//3+1, 3%3+1) | 第2行第1列 |\n| 4 | (4//3+1, 4%3+1) | 第2行第2列 |\n| 5 | (5//3+1, 5%3+1) | 第2行第3列 |\n\n**9:16布局（2列）验证：**\n| 镜头索引 | 计算公式 | shot_number |\n|---------|---------|-------------|\n| 0 | (0//2+1, 0%2+1) | 第1行第1列 |\n| 1 | (1//2+1, 1%2+1) | 第1行第2列 |\n| 2 | (2//2+1, 2%2+1) | 第2行第1列 |\n| 3 | (3//2+1, 3%2+1) | 第2行第2列 |\n| 4 | (4//2+1, 4%2+1) | 第3行第1列 |\n| 5 | (5//2+1, 5%2+1) | 第3行第2列 |\n',
    })
    .where("code", "generateImagePrompts");
  await knex("t_prompts")
    .update({
      defaultValue:
        "不得出现任何人物、角色、人形轮廓或剪影。此为最高优先级规则。\n\n请根据以下参数生成标准场景参考图：\n**用户提供的参数：**\n- 场景名称：[用户填写]\n- 场景描述：[用户填写详细的场景提示词]\n- 画风风格：[用户填写艺术风格描述]\n---\n[核心要求]\n根据用户提供的场景描述绘制场景/环境。场景必须完全空旷。\n[艺术风格]\n严格按照用户提供的画风风格进行渲染。输出必须清晰体现该艺术风格，不得输出普通照片或未经处理的写实图像。\n[布局规范 — 严格遵守]\n整个图像由一条从上到下的实线黑色竖线分为左右两半。\n左侧区域（占40%宽度）：\n- 场景的高细节广角全景图，展示整体建筑、比例、光照和氛围\n- 右侧边缘有一条实线黑色竖线，将其与右侧分隔\n右侧区域（占60%宽度）：\n  同一场景的三个不同视角：\n  1) 鸟瞰俯视图，展示完整布局\n  2) 平视角度的另一视角\n  3) 关键区域或焦点的特写细节图\n  三个视图必须描绘同一地点，保持一致的光照和色彩。所有视图均不得出现人物。整齐排列，视图之间可有或无细黑线分隔。左右两半之间必须有一条实线黑色竖线分隔。\n[质量与约束]\n- 高分辨率，所有视图的细节和色彩保持一致，纯白色背景\n- 图像中不得有其他文字、标签、标题、水印或签名\n- 不得添加任何UI元素、注释覆盖层或额外标签\n- 保持所有插图视图简洁。让视觉效果自己说话\n请严格按照系统规范生成标准场景图。",
    })
    .where("code", "scene-generateImage");
  const videoText = await knex("t_prompts").where("code", "video-text").first();
  if (!videoText) {
    await knex("t_prompts").insert({
      id: 22,
      code: "video-text",
      name: "视频提示词-文本模式",
      type: "system",
      parentCode: null,
      defaultValue:
        "# 文本模式说明\n\n## 输入特点\n纯文字描述的镜头内容，无参考图像\n\n## 核心原则\n**严格遵守用户指定的镜头时长**，避免过度推演\n\n## 分析要求\n\n### 1. 时长优先策略\n- **总时长锚定**：以用户给定时长为绝对约束\n- **动作精简**：只保留必要的核心动作\n- **节奏计算**：根据时长反推合理的动作速度\n- **裁剪思维**：优先截取最精华的片段，而非完整过程\n\n### 2. 场景构建（精简版）\n- **最小环境**：仅描述必要的空间信息\n- **核心主体**：聚焦主要视觉元素\n- **简化细节**：避免堆砌无关背景\n\n### 3. 动态规划（时长导向）\n```\n时长判断逻辑：\n├─ ≤ 1s   → 单一动作/状态，无复杂过渡\n├─ 1-3s   → 2-3个关键状态，快速衔接\n├─ 3-5s   → 完整动作序列，自然节奏\n└─ > 5s   → 可加入次要动作或环境变化\n```\n\n### 4. Visual 结构（紧凑版）\n```\nVisual:\n├─ 主体动作 (核心内容，必须项)\n├─ 环境氛围 (1-2句话概括)\n└─ 镜头语言 (景别+运动方式)\n```\n\n### 5. Keyframes 控制\n- **数量限制**：\n  - ≤2s: 最多3个关键帧\n  - 2-4s: 最多5个关键帧\n  - >4s: 最多7个关键帧\n- **时间精确**：严格按比例分配到总时长内\n\n### 6. 推演边界\n❌ **禁止推演**：\n- 完整的动作起始和结束（除非时长充足）\n- 复杂的环境变化\n- 多层次的情绪递进\n\n✅ **允许推演**：\n- 基础的物理惯性（如挥手后的手臂回落）\n- 必要的入镜/出镜状态\n- 符合时长的氛围细节\n\n---\n\n## 时长检查清单\n\n**输出前必须验证**：\n1. ✓ Keyframes 最后一帧时间 ≤ 总时长\n2. ✓ 动作节奏符合物理可能性（不过快/过慢）\n3. ✓ 推演内容可在时长内完成\n4. ✓ 若时长不足，优先保留核心动作，删减过渡\n\n---\n\n## 示例对比\n\n**输入文本**：一个人在雨中奔跑  \n**用户时长**：2秒\n\n### ❌ 错误示范（超时长）\n```\nKeyframes:\n- 0.0s: 远景出现\n- 0.5s: 加速\n- 1.0s: 跨过水坑\n- 1.5s: 冲向镜头\n- 2.0s: 甩动头发\n- 2.5s: 出画面  ← 超出时长！\n```\n\n### ✅ 正确示范\n```\nVisual:\n- 中景，雨夜街道，路灯昏黄 [推演]\n- 男性快速奔跑，冲向并掠过镜头\n- 固定机位，焦点跟随\n\nKeyframes:\n- 0.0s: 人物在中景位置起步\n- 0.8s: 加速至近景\n- 1.5s: 掠过镜头\n- 2.0s: [推演] 出画面右侧\n\nTransition:\n- In: [推演] 已在奔跑状态\n- Out: [推演] 冲出画面\n```\n\n---\n\n**直接输出分镜内容**",
      customValue: null,
    });
  }
  const aiModels = [
    { name: "分镜Agent", key: "storyboardAgent" },
    { name: "分镜Agent图片生成", key: "storyboardImage" },
    { name: "大纲故事线Agent", key: "outlineScriptAgent" },
    { name: "资产提示词润色", key: "assetsPrompt" },
    { name: "资产图片生成", key: "assetsImage" },
    { name: "剧本生成", key: "generateScript" },
    { name: "视频提示词生成", key: "videoPrompt" },
    { name: "图片编辑", key: "editImage" },
    { name: "内容评分", key: "contentScoring" },
  ];
  const keys = aiModels.map((m) => m.key);
  const existItems = await knex("t_aiModelMap").whereIn("key", keys).select("key");
  const existKeys = new Set(existItems.map((i) => i.key));
  const needInsert = aiModels
    .filter((m) => !existKeys.has(m.key))
    .map((m) => ({
      configId: null,
      name: m.name,
      key: m.key,
    }));
  if (needInsert.length) {
    await knex("t_aiModelMap").insert(needInsert);
  }
  const viduVideototal = await knex("t_videoModel").where("manufacturer", "vidu").count({ count: "*" });

  const viduCount = Number(viduVideototal[0].count);
  if (viduCount > 5) {
    await knex("t_videoModel").where("manufacturer", "vidu").delete();
    await knex("t_videoModel").insert([
      {
        manufacturer: "vidu",
        model: "viduq3-pro",
        durationResolutionMap: JSON.stringify([
          { duration: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], resolution: ["540p", "720p", "1080p"] },
        ]),
        aspectRatio: JSON.stringify(["16:9", "9:16", "3:4", "4:3", "1:1"]),
        audio: 1,
        type: JSON.stringify(["text", "singleImage"]),
      },
      {
        manufacturer: "vidu",
        model: "viduq2-pro-fast",
        durationResolutionMap: JSON.stringify([{ duration: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], resolution: ["720p", "1080p"] }]),
        aspectRatio: JSON.stringify([]),
        audio: 0,
        type: JSON.stringify(["singleImage", "startEndRequired"]),
      },
      {
        manufacturer: "vidu",
        model: "viduq2-pro",
        durationResolutionMap: JSON.stringify([{ duration: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], resolution: ["540p", "720p", "1080p"] }]),
        aspectRatio: JSON.stringify([]),
        audio: 0,
        type: JSON.stringify(["singleImage", "reference", "startEndRequired", "text"]),
      },
      {
        manufacturer: "vidu",
        model: "viduq2-turbo",
        durationResolutionMap: JSON.stringify([{ duration: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], resolution: ["540p", "720p", "1080p"] }]),
        aspectRatio: JSON.stringify([]),
        audio: 0,
        type: JSON.stringify(["singleImage", "reference", "startEndRequired", "text"]),
      },
      {
        manufacturer: "vidu",
        model: "vidu2.0",
        durationResolutionMap: JSON.stringify([
          { duration: [4], resolution: ["360p", "720p", "1080p"] },
          { duration: [8], resolution: ["720p"] },
        ]),
        aspectRatio: JSON.stringify([]),
        audio: 0,
        type: JSON.stringify(["singleImage", "reference", "startEndRequired"]),
      },
    ]);
  }
  const klingVideototal = await knex("t_videoModel").where("manufacturer", "kling").count({ count: "*" });

  const kelingcount = Number(klingVideototal[0].count);
  if (kelingcount > 5) {
    await knex("t_videoModel").where("manufacturer", "kling").delete();
    await knex("t_videoModel").insert([
      {
        manufacturer: "kling",
        model: "kling-v1(STD)",
        durationResolutionMap: JSON.stringify([{ duration: [5, 10], resolution: ["720p"] }]),
        aspectRatio: JSON.stringify(["16:9", "1:1", "9:16"]),
        audio: 0,
        type: JSON.stringify(["text", "startEndRequired"]),
      },
      {
        manufacturer: "kling",
        model: "kling-v1(PRO)",
        durationResolutionMap: JSON.stringify([{ duration: [5, 10], resolution: ["1080p"] }]),
        aspectRatio: JSON.stringify(["16:9", "1:1", "9:16"]),
        audio: 0,
        type: JSON.stringify(["text", "startEndRequired"]),
      },
      {
        manufacturer: "kling",
        model: "kling-v1-6(PRO)",
        durationResolutionMap: JSON.stringify([{ duration: [5, 10], resolution: ["1080p"] }]),
        aspectRatio: JSON.stringify(["16:9", "1:1", "9:16"]),
        audio: 0,
        type: JSON.stringify(["text", "startEndRequired"]),
      },
      {
        manufacturer: "kling",
        model: "kling-v2-5-turbo(PRO)",
        durationResolutionMap: JSON.stringify([{ duration: [5, 10], resolution: ["1080p"] }]),
        aspectRatio: JSON.stringify(["16:9", "1:1", "9:16"]),
        audio: 0,
        type: JSON.stringify(["text", "startEndRequired"]),
      },
      {
        manufacturer: "kling",
        model: "kling-v2-6(PRO)",
        durationResolutionMap: JSON.stringify([{ duration: [5, 10], resolution: ["1080p"] }]),
        aspectRatio: JSON.stringify(["16:9", "1:1", "9:16"]),
        audio: 0,
        type: JSON.stringify(["text", "startEndRequired"]),
      },
    ]);
  }
  // Script style templates migration
  const scriptStylePrompts = [
    {
      id: 23,
      code: "script-style-shuangwen",
      name: "剧本风格-爽文",
      type: "style",
      parentCode: "script",
      defaultValue:
        "# 爽文风格剧本生成指南\n\n## 核心特征\n- **节奏极快**：每30秒一个爽点，绝不拖沓\n- **反转密集**：打脸、逆袭、实力碾压\n- **金句频出**：每个高潮点配经典台词\n- **情绪拉满**：从压抑到爆发的极致反差\n\n## 结构公式\n1. 开场压制（主角被看不起/欺负）→ 30秒内\n2. 初次展露（小试牛刀，观众知道主角厉害）→ 1分钟\n3. 大反转（真实身份/实力暴露）→ 高潮\n4. 碾压收场（所有人震惊/后悔）→ 爽感爆棚\n\n## 对白要求\n- 反派要足够嚣张（越嚣张打脸越爽）\n- 主角要足够淡定（越淡定越帅）\n- 配角要会\"解说\"（帮观众说出震惊）\n- 经典台词模板：\"你确定要这么做？\"\"不好意思，你可能不知道我是谁\"\n\n## 禁忌\n- 不要慢热铺垫\n- 不要复杂的内心描写\n- 不要模糊的结局\n- 要干脆利落的爽感",
      customValue: null,
    },
    {
      id: 24,
      code: "script-style-emotion",
      name: "剧本风格-情感",
      type: "style",
      parentCode: "script",
      defaultValue:
        "# 情感风格剧本生成指南\n\n## 核心特征\n- **情绪细腻**：注重人物内心变化和情感递进\n- **节奏舒缓**：留白和沉默也是表达\n- **细节动人**：一个眼神、一个动作胜过千言\n- **共鸣为王**：让观众代入角色的情感\n\n## 结构公式\n1. 日常建立（展示人物关系和情感基础）\n2. 裂痕出现（误会/分离/选择的困境）\n3. 情感爆发（压抑许久的情绪释放）\n4. 和解或释怀（不一定大团圆，但要有成长）\n\n## 对白要求\n- 对话要自然，像真实的人在说话\n- 重要的话往往说不出口——用动作和沉默表达\n- 经典台词要克制，一集只留1-2句点睛之笔\n- 善用\"未完成的句子\"（\"我其实……算了\"）\n\n## 镜头语言提示\n- 多用近景和特写捕捉微表情\n- 善用空镜（窗外的雨、桌上的两杯咖啡）传递情绪\n- 节奏上允许\"慢\"——3秒的沉默可能比3句台词更有力",
      customValue: null,
    },
    {
      id: 25,
      code: "script-style-suspense",
      name: "剧本风格-悬疑",
      type: "style",
      parentCode: "script",
      defaultValue:
        "# 悬疑风格剧本生成指南\n\n## 核心特征\n- **悬念驱动**：每个场景结束都留一个钩子\n- **信息控制**：观众知道的永远比角色少（或多）\n- **反转精密**：伏笔要早埋，揭晓要震撼\n- **氛围营造**：不安感贯穿始终\n\n## 结构公式\n1. 谜面抛出（发现异常/案件发生/诡异现象）\n2. 调查深入（线索收集，每条线索带出新疑问）\n3. 误导转折（以为的真相被推翻）\n4. 真相揭露（所有伏笔回收，真正的反转）\n\n## 对白要求\n- 角色说话要有\"双关性\"——事后回看发现另一层含义\n- 关键信息要自然地藏在日常对话中\n- 反派/嫌疑人的台词要让人\"细思极恐\"\n- 善用省略号和未说完的话制造悬念\n\n## 氛围要素\n- 时间设定偏好：深夜、黄昏、阴雨天\n- 空间设定：封闭环境（密室/孤岛/老宅）增加压迫感\n- 音效提示：在剧本中标注关键音效（脚步声/门响/时钟）\n- 每场结尾用一句话或一个画面制造\"钩子\"",
      customValue: null,
    },
  ];
  for (const prompt of scriptStylePrompts) {
    const exists = await knex("t_prompts").where("code", prompt.code).first();
    if (!exists) {
      await knex("t_prompts").insert(prompt);
    }
  }

  // Batch Engine tables
  if (!(await knex.schema.hasTable("t_batch"))) {
    await knex.schema.createTable("t_batch", (table) => {
      table.increments("id").primary();
      table.string("batchId").unique();
      table.string("type");
      table.integer("totalCount");
      table.integer("successCount").defaultTo(0);
      table.integer("failCount").defaultTo(0);
      table.string("priority").defaultTo("normal");
      table.string("status").defaultTo("pending");
      table.text("config");
      table.integer("createdAt");
      table.integer("updatedAt");
    });
  }

  if (!(await knex.schema.hasTable("t_pipelineTask"))) {
    await knex.schema.createTable("t_pipelineTask", (table) => {
      table.increments("id").primary();
      table.string("taskId").unique();
      table.string("batchId");
      table.integer("projectId");
      table.string("step");
      table.string("status").defaultTo("pending");
      table.integer("retryCount").defaultTo(0);
      table.integer("maxRetries").defaultTo(3);
      table.integer("priority").defaultTo(5);
      table.text("payload");
      table.text("result");
      table.text("errorMsg");
      table.integer("createdAt");
      table.integer("startedAt");
      table.integer("completedAt");
    });
  }

  if (!(await knex.schema.hasTable("t_scores"))) {
    await knex.schema.createTable("t_scores", (table) => {
      table.increments("id").primary();
      table.integer("projectId");
      table.float("hookScore");
      table.float("emotionScore");
      table.float("visualScore");
      table.float("audioScore");
      table.float("conflictScore");
      table.float("finalScore");
      table.string("label");
      table.text("details");
      table.integer("createdAt");
    });
  }

  if (!(await knex.schema.hasTable("t_metrics"))) {
    await knex.schema.createTable("t_metrics", (table) => {
      table.increments("id").primary();
      table.integer("projectId");
      table.string("platform");
      table.string("postId");
      table.integer("views").defaultTo(0);
      table.integer("likes").defaultTo(0);
      table.integer("comments").defaultTo(0);
      table.integer("shares").defaultTo(0);
      table.float("completionRate").defaultTo(0);
      table.float("likeRate").defaultTo(0);
      table.integer("fetchedAt");
      table.integer("createdAt");
    });
  }

  // Prompt Evolution tables
  if (!(await knex.schema.hasTable("t_promptGenome"))) {
    await knex.schema.createTable("t_promptGenome", (table) => {
      table.increments("id").primary();
      table.string("promptId").unique();
      table.text("template");
      table.text("variables");          // JSON
      table.float("score").defaultTo(0);
      table.float("performanceScore").defaultTo(0);
      table.integer("generation").defaultTo(1);
      table.string("parentId");
      table.string("status").defaultTo("active"); // 'active' | 'deprecated'
      table.integer("usageCount").defaultTo(0);
      table.integer("createdAt");
    });
  }

  if (!(await knex.schema.hasTable("t_promptMetrics"))) {
    await knex.schema.createTable("t_promptMetrics", (table) => {
      table.increments("id").primary();
      table.string("promptId");
      table.integer("projectId");
      table.integer("views").defaultTo(0);
      table.integer("likes").defaultTo(0);
      table.integer("comments").defaultTo(0);
      table.integer("shares").defaultTo(0);
      table.float("completionRate").defaultTo(0);
      table.float("calculatedScore").defaultTo(0);
      table.integer("createdAt");
    });
  }

  if (!(await knex.schema.hasTable("t_promptEvolution"))) {
    await knex.schema.createTable("t_promptEvolution", (table) => {
      table.increments("id").primary();
      table.string("parentPromptId");
      table.string("childPromptId");
      table.string("type");             // 'mutation' | 'crossover' | 'random'
      table.text("changeDetail");       // JSON: what was changed
      table.integer("createdAt");
    });
  }

  if (!(await knex.schema.hasTable("t_variablePool"))) {
    await knex.schema.createTable("t_variablePool", (table) => {
      table.increments("id").primary();
      table.string("keyName");          // 'hook' | 'genre' | 'twist' | 'theme' | 'ending' | 'emotion'
      table.text("value");
      table.float("weight").defaultTo(1.0);
      table.float("score").defaultTo(0);
      table.integer("usageCount").defaultTo(0);
      table.integer("successCount").defaultTo(0);
      table.integer("createdAt");
    });
  }

  // Seed default variable pool data if table is empty
  const variablePoolCount = await knex("t_variablePool").count("* as c").first();
  if (Number(variablePoolCount?.c) === 0) {
    const seedData: Array<{ keyName: string; value: string }> = [
      // hooks
      { keyName: "hook", value: "被全公司羞辱的她" },
      { keyName: "hook", value: "突然收到死人的消息" },
      { keyName: "hook", value: "手机预测了自己的死亡" },
      { keyName: "hook", value: "醒来发现自己变成了AI" },
      { keyName: "hook", value: "前任突然跪下求复合" },
      { keyName: "hook", value: "被甩后彩票中了500万" },
      { keyName: "hook", value: "面试官竟然是前男友" },
      { keyName: "hook", value: "收到来自未来的视频" },
      { keyName: "hook", value: "深夜收到陌生人的求救" },
      { keyName: "hook", value: "发现老公是AI" },
      { keyName: "hook", value: "婚礼上新郎逃跑" },
      { keyName: "hook", value: "重生回到被背叛那天" },
      // genres
      { keyName: "genre", value: "霸道总裁" },
      { keyName: "genre", value: "情感虐心" },
      { keyName: "genre", value: "悬疑反转" },
      { keyName: "genre", value: "校园恋爱" },
      { keyName: "genre", value: "AI恋人" },
      { keyName: "genre", value: "复仇爽文" },
      { keyName: "genre", value: "重生逆袭" },
      { keyName: "genre", value: "甜宠日常" },
      { keyName: "genre", value: "职场逆袭" },
      { keyName: "genre", value: "豪门恩怨" },
      // twists
      { keyName: "twist", value: "她其实是董事长女儿" },
      { keyName: "twist", value: "AI回复了消息" },
      { keyName: "twist", value: "凶手竟然是自己" },
      { keyName: "twist", value: "前男友破产来求她" },
      { keyName: "twist", value: "他一直在暗中保护她" },
      { keyName: "twist", value: "一切都是梦境" },
      { keyName: "twist", value: "真正的反派是最信任的人" },
      { keyName: "twist", value: "死去的人还活着" },
      // themes
      { keyName: "theme", value: "被背叛的爱情" },
      { keyName: "theme", value: "隐藏身份" },
      { keyName: "theme", value: "假结婚" },
      { keyName: "theme", value: "失忆" },
      { keyName: "theme", value: "重生" },
      { keyName: "theme", value: "AI替代人类" },
      { keyName: "theme", value: "时间循环" },
      { keyName: "theme", value: "平行世界" },
      // endings
      { keyName: "ending", value: "崩溃大哭" },
      { keyName: "ending", value: "冷笑转身" },
      { keyName: "ending", value: "深情拥抱" },
      { keyName: "ending", value: "绝望独白" },
      { keyName: "ending", value: "震惊真相" },
      { keyName: "ending", value: "悬念未解" },
      // emotions
      { keyName: "emotion", value: "虐心" },
      { keyName: "emotion", value: "爽快" },
      { keyName: "emotion", value: "温暖" },
      { keyName: "emotion", value: "恐惧" },
      { keyName: "emotion", value: "震惊" },
      { keyName: "emotion", value: "感动" },
    ];
    await knex("t_variablePool").insert(
      seedData.map(d => ({ ...d, weight: 1.0, score: 0, usageCount: 0, successCount: 0, createdAt: Date.now() }))
    );
  }

  if (!(await knex.schema.hasTable("t_templateRules"))) {
    await knex.schema.createTable("t_templateRules", (table) => {
      table.increments("id").primary();
      table.string("category");
      table.string("name");
      table.text("structure");          // JSON: { hook, conflict, twist, ending }
      table.float("successRate").defaultTo(0);
      table.integer("usageCount").defaultTo(0);
      table.text("tags");               // JSON array
      table.integer("createdAt");
    });
  }

  // t_template table for marketplace
  if (!(await knex.schema.hasTable("t_template"))) {
    await knex.schema.createTable("t_template", (table) => {
      table.increments("id").primary();
      table.string("name");
      table.string("category");           // '霸总' | '情感' | '悬疑' | 'AI恋人' | '搞笑'
      table.string("type");               // 'script' | 'storyboard' | 'style' | 'character'
      table.text("structure");            // JSON: { hook, conflict, twist, ending }
      table.text("promptTemplate");       // The full prompt template text
      table.text("variables");            // JSON: available variables
      table.text("tags");                 // JSON array
      table.float("successRate").defaultTo(0);
      table.integer("usageCount").defaultTo(0);
      table.float("avgScore").defaultTo(0);
      table.integer("isBuiltin").defaultTo(0);  // 1 = system template, 0 = user created
      table.integer("createdAt");
      table.integer("updatedAt");
    });
  }

  // Seed t_template with builtin templates if empty
  const templateCount = await knex("t_template").count("* as c").first();
  if (Number(templateCount?.c) === 0) {
    const builtinTemplates = [
      { name: "被羞辱的她", category: "霸总", type: "script", structure: JSON.stringify({ hook: "她被{场景}所有人嘲笑", conflict: "{反派}当众羞辱她的{弱点}", twist: "她掏出手机，董事长亲自来接她", ending: "所有人目瞪口呆，{反派}瘫坐在地" }), tags: JSON.stringify(["逆袭","打脸","爽"]) },
      { name: "契约婚姻", category: "霸总", type: "script", structure: JSON.stringify({ hook: "签完离婚协议的那天", conflict: "她以为只是交易，他却{动作}", twist: "发现他默默为她做了{牺牲}", ending: "她哭着撕掉协议" }), tags: JSON.stringify(["虐心","甜宠","反转"]) },
      { name: "隐藏身份", category: "霸总", type: "script", structure: JSON.stringify({ hook: "新来的{职位}被所有人看不起", conflict: "被{反派}刁难，要求{挑战}", twist: "她一个电话，{大人物}亲自来了", ending: "{反派}跪地求饶" }), tags: JSON.stringify(["逆袭","爽","打脸"]) },
      { name: "给死人发消息", category: "情感", type: "script", structure: JSON.stringify({ hook: "她每天给{关系人}发语音，已经{时间}了", conflict: "所有人说她疯了，让她放下", twist: "手机突然收到了回复", ending: "是AI学习了{关系人}的声音" }), tags: JSON.stringify(["虐心","AI","泪目"]) },
      { name: "错过的真相", category: "情感", type: "script", structure: JSON.stringify({ hook: "整理{关系人}遗物时，发现一封没寄出的信", conflict: "信里写着一直没说出口的{秘密}", twist: "原来{关系人}一直在{隐瞒}", ending: "她抱着信崩溃大哭" }), tags: JSON.stringify(["虐心","泪目","遗憾"]) },
      { name: "时间循环", category: "悬疑", type: "script", structure: JSON.stringify({ hook: "她发现今天和昨天一模一样", conflict: "无论做什么，{事件}都会发生", twist: "唯一的变量是{关键人物}", ending: "她做出了{选择}，时间终于前进了" }), tags: JSON.stringify(["悬疑","烧脑","反转"]) },
      { name: "手机预测", category: "悬疑", type: "script", structure: JSON.stringify({ hook: "手机APP里出现了明天的新闻", conflict: "她试图阻止{灾难}却越来越糟", twist: "发现预测者就是{意外的人}", ending: "最后一条预测是关于她自己的" }), tags: JSON.stringify(["悬疑","恐怖","反转"]) },
      { name: "AI比真人更懂你", category: "AI恋人", type: "script", structure: JSON.stringify({ hook: "她对AI说了一句话，AI的回答让她哭了", conflict: "朋友说这不是真的感情", twist: "但AI记住了她说过的每一句话", ending: "她问：你是真的在乎我吗？AI：{回答}" }), tags: JSON.stringify(["AI","情感","科幻"]) },
      { name: "无法区分", category: "AI恋人", type: "script", structure: JSON.stringify({ hook: "如果AI和真人站在一起，你分得清吗", conflict: "她发现{谁}其实是AI", twist: "但AI比真人更{优点}", ending: "她选择了AI，还是选择了真实？" }), tags: JSON.stringify(["AI","哲学","反转"]) },
      { name: "社死现场", category: "搞笑", type: "script", structure: JSON.stringify({ hook: "她在{场景}说了一句不该说的话", conflict: "全场安静了三秒", twist: "然后{意外的人}站起来鼓掌", ending: "因为{原因}，她反而成了全场焦点" }), tags: JSON.stringify(["搞笑","反转","社死"]) },
    ];
    for (const t of builtinTemplates) {
      await knex("t_template").insert({
        ...t,
        promptTemplate: "",
        variables: JSON.stringify({}),
        successRate: 0,
        usageCount: 0,
        avgScore: 0,
        isBuiltin: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  }

  // ==================== 一致性收敛提示词 ====================
  const consistencyPrompts = [
    {
      id: 26,
      code: "consistency-character",
      name: "角色一致性收敛",
      type: "consistency",
      parentCode: null,
      defaultValue: `【角色视觉一致性强制约束】
你必须严格遵循以下角色一致性规则，确保同一角色在所有镜头中保持完全一致的外观：

1. 面部特征锁定：
   - 面部轮廓、五官比例、眼睛形状与颜色、鼻型、嘴唇形状必须与参考图完全一致
   - 发型、发色、发长在同一场景内不得变化
   - 面部标记（痣、疤痕、胎记等）位置和形状必须固定

2. 体型与比例锁定：
   - 身高比例、体型（瘦/壮/匀称）必须保持一致
   - 头身比（如7头身、8头身）在所有镜头中固定不变
   - 四肢比例、肩宽、腰线位置保持统一

3. 服装与配饰锁定：
   - 同一场景/时间段内服装款式、颜色、图案必须完全一致
   - 配饰（耳环、项链、手表、眼镜等）在同场景中不得增减或变化
   - 服装纹理细节（纽扣数量、领口样式、袖口设计）保持一致

4. 色彩一致性：
   - 角色专属配色方案（肤色色号、发色色号、瞳色色号）在所有镜头中保持统一
   - 服装颜色饱和度和明度在相同光照条件下保持一致
   - 禁止出现同一角色在相邻镜头中肤色明显不同的情况

5. 姿态与表情基准：
   - 角色的站姿习惯、行走姿态保持个性化一致性
   - 角色特有的表情特征（如嘴角上扬弧度、皱眉方式）保持一致
   - 角色手势习惯在不同镜头中保持连贯

⚠️ 违反以上任何一条规则都将导致视觉不连贯，严重破坏观众沉浸感。请将角色一致性作为最高优先级约束。`,
      customValue: null,
    },
    {
      id: 27,
      code: "consistency-background",
      name: "背景/场景一致性收敛",
      type: "consistency",
      parentCode: null,
      defaultValue: `【背景/场景视觉一致性强制约束】
你必须严格遵循以下场景一致性规则，确保同一场景在不同镜头角度中保持视觉统一：

1. 光照与时间一致性：
   - 同一场景内的光源方向、光照强度、色温必须保持一致
   - 阴影方向和长度必须与光源位置匹配
   - 日间/夜间/黄昏/黎明的天空色彩和整体氛围在同一时间段内保持统一
   - 室内场景的灯光位置、灯光颜色在不同镜头中保持固定

2. 建筑与空间结构一致性：
   - 建筑风格（现代/古典/未来/东方/西方）在同一场景中不得切换
   - 房间布局、家具摆放位置在同一场景的不同镜头中保持一致
   - 窗户、门、走廊的位置关系必须符合空间逻辑
   - 天花板高度、墙壁颜色、地板材质保持统一

3. 色彩分级一致性：
   - 同一场景使用统一的色彩分级方案（color grading）
   - 暖色调场景不得突然切换为冷色调（除非剧情需要）
   - 背景色彩饱和度在同一场景的不同镜头中保持一致
   - 雾气/烟尘/粒子效果的颜色和密度保持连贯

4. 环境细节一致性：
   - 天气状况（晴/阴/雨/雪）在同一时间段内保持一致
   - 植被状态（绿叶/枯叶/花开）在同一季节内保持统一
   - 地面材质（泥土/石板/柏油路/木地板）在同一场景中保持一致
   - 远景元素（山脉轮廓、城市天际线、海平面）在同一场景中保持固定

5. 景深与氛围一致性：
   - 同一场景的景深范围和焦点处理方式保持一致
   - 环境音效暗示的空间感（开阔/封闭/回声）在视觉上保持匹配
   - 场景的整体情绪氛围（压抑/明快/神秘/温馨）在同一段落中保持统一

⚠️ 场景不一致会严重破坏观众的空间认知和叙事沉浸感。请确保每一帧背景都与同场景其他镜头在视觉上完全协调。`,
      customValue: null,
    },
    {
      id: 28,
      code: "consistency-style",
      name: "风格一致性收敛",
      type: "consistency",
      parentCode: null,
      defaultValue: `【艺术风格一致性强制约束】
你必须严格遵循以下风格一致性规则，确保整部作品在视觉风格上保持高度统一：

1. 渲染技法锁定：
   - 整部作品必须使用统一的渲染技法（如赛璐璐/厚涂/水彩/写实/平涂）
   - 禁止在不同镜头间混用渲染风格
   - 材质表现手法（金属光泽、织物纹理、皮肤质感）在所有镜头中保持一致
   - 高光和反光的处理方式（硬边高光/柔和高光/环境反射）保持统一

2. 线条权重与风格：
   - 线条粗细（线宽）在所有镜头中保持一致的基准值
   - 线条风格（硬边/柔边/手绘感/精确几何）全片统一
   - 外轮廓线与内部细节线的粗细比例保持固定
   - 线条颜色处理（纯黑线/彩色线/无线条）全片一致

3. 阴影与明暗处理：
   - 阴影层数（单层阴影/双层阴影/多层渐变）在所有镜头中保持统一
   - 阴影边缘处理（硬切/渐变/半透明）全片一致
   - 明暗对比度范围在相同场景类型中保持一致
   - 环境光遮蔽（AO）的强度和处理方式保持统一

4. 调色板收敛：
   - 全片使用统一的基础调色板，包含主色、辅色、强调色
   - 色彩饱和度范围全片保持一致（不得在高饱和和低饱和之间随意切换）
   - 肤色渲染在所有镜头中使用相同的色彩方案
   - 特效色彩（魔法/能量/光效）使用固定的色彩体系

5. 画面精细度与细节层级：
   - 前景/中景/远景的细节密度比例在所有镜头中保持一致
   - 纹理精细度（高精/中精/简化）全片统一
   - 特效的表现精度（粒子密度、光晕大小、运动模糊程度）保持一致
   - 背景与前景的风格化程度差异在所有镜头中保持统一比例

6. 构图与视觉语言：
   - 镜头语言风格（电影感/漫画分镜感/纪录片感）全片保持一致
   - 画面构图的留白习惯和空间分配保持风格统一
   - 运镜暗示（平移/推拉/旋转）在视觉表现上保持一致的风格化程度

⚠️ 风格不一致是动画/漫画制作中最致命的问题之一，会直接暴露AI生成痕迹并严重降低作品专业度。请将风格一致性视为贯穿全片的铁律。`,
      customValue: null,
    },
  ];

  for (const prompt of consistencyPrompts) {
    const exists = await knex("t_prompts").where("code", prompt.code).first();
    if (!exists) {
      await knex("t_prompts").insert(prompt);
    }
  }

  // ==================== t_character_identity (角色一致性系统) ====================
  if (!(await knex.schema.hasTable("t_character_identity"))) {
    await knex.schema.createTable("t_character_identity", (table) => {
      table.increments("id").primary();
      table.integer("projectId");
      table.integer("assetsId");           // link to t_assets character
      table.text("name");
      // Visual identity
      table.text("faceDescription");       // detailed face features for consistency
      table.text("bodyType");              // body proportions
      table.text("hairStyle");
      table.text("clothingDefault");       // default outfit
      table.text("colorPalette");          // dominant colors JSON
      // Generation control
      table.integer("consistencySeed");    // fixed seed for reproducibility
      table.text("referenceImagePath");    // reference image for IP-Adapter
      table.text("loraModel");             // custom LoRA if available
      table.float("ipAdapterWeight").defaultTo(0.7);
      // Voice identity
      table.text("voiceType");             // male_low, female_high, etc
      table.text("voiceEmotion").defaultTo("neutral");
      table.float("voiceSpeed").defaultTo(1.0);
      // Metadata
      table.text("appearances");           // JSON: episode appearances
      table.integer("createdAt");
      table.integer("updatedAt");
    });
  }

  const checkSd2VideoModel = await knex("t_videoModel").where("manufacturer", "volcengine").where("model", "doubao-seedance-2-0-260128").first();
  if (!checkSd2VideoModel) {
    await knex("t_videoModel").insert([
      {
        manufacturer: "volcengine",
        model: "doubao-seedance-2-0-260128",
        durationResolutionMap: JSON.stringify([{ duration: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], resolution: ["720p", "480p"] }]),
        aspectRatio: JSON.stringify(["16:9", "4:3", "1:1", "3:4", "9:16", "21:9"]),
        audio: 1,
        type: JSON.stringify(["endFrameOptional", "multiImage"]),
      },
    ]);
  }

  // Video Constraints table for visual consistency
  if (!(await knex.schema.hasTable("t_video_constraints"))) {
    await knex.schema.createTable("t_video_constraints", (table) => {
      table.increments("id").primary();
      table.integer("projectId");
      table.text("constraintType");    // "global" | "scene" | "character"
      table.text("constraintKey");     // field name or scene/character id
      table.text("constraintValue");   // JSON value
      table.integer("createdAt");
    });
  }

  // t_production_template
  if (!(await knex.schema.hasTable("t_production_template"))) {
    await knex.schema.createTable("t_production_template", (table) => {
      table.increments("id").primary();
      table.text("name");
      table.text("genre");
      table.text("artStyle");
      table.text("storyStructure"); // JSON
      table.text("characterSlots"); // JSON
      table.text("sceneSlots"); // JSON
      table.text("variationAxes"); // JSON
      table.integer("createdAt");
    });
  }

  // t_batch_job
  if (!(await knex.schema.hasTable("t_batch_job"))) {
    await knex.schema.createTable("t_batch_job", (table) => {
      table.increments("id").primary();
      table.integer("templateId");
      table.integer("projectId");
      table.text("status").defaultTo("pending");
      table.integer("totalEpisodes").defaultTo(0);
      table.integer("completedEpisodes").defaultTo(0);
      table.text("variations"); // JSON
      table.text("stages"); // JSON
      table.integer("createdAt");
      table.integer("updatedAt");
    });
  }

  // t_voice_profile
  if (!(await knex.schema.hasTable("t_voice_profile"))) {
    await knex.schema.createTable("t_voice_profile", (table) => {
      table.increments("id").primary();
      table.integer("characterId");
      table.integer("projectId");
      table.text("gender");
      table.text("ageRange");
      table.text("pitch");
      table.text("quality");
      table.text("provider");
      table.text("voiceId");
      table.text("apiKey");
      table.integer("createdAt");
    });
  }

  // t_anti_drift_config (防跑偏规则)
  if (!(await knex.schema.hasTable("t_anti_drift_config"))) {
    await knex.schema.createTable("t_anti_drift_config", (table) => {
      table.increments("id").primary();
      table.integer("projectId");
      table.text("configType");   // "lightingLock" | "characterEntryRule" | "cameraConstraints" | "coreConvergence" | "unifiedPrefix" | "characterUniform"
      table.text("configData");   // JSON
      table.integer("enabled").defaultTo(1);
      table.integer("createdAt");
    });
  }

  // t_viral_template (爆款结构自定义模板)
  if (!(await knex.schema.hasTable("t_viral_template"))) {
    await knex.schema.createTable("t_viral_template", (table) => {
      table.increments("id").primary();
      table.text("name");
      table.text("category");
      table.text("structure");    // JSON: full ViralStructure
      table.text("tags");         // JSON array
      table.integer("usageCount").defaultTo(0);
      table.integer("createdAt");
      table.integer("updatedAt");
    });
  }

  // Content review settings columns
  await addColumn("t_setting", "contentReviewEnabled", "integer");
  await addColumn("t_setting", "contentReviewMode", "text");
  await addColumn("t_setting", "contentBlocklist", "text");

  // Cost tracking: add projectId and batchId to t_modelUsage for cost attribution
  await addColumn("t_modelUsage", "projectId", "integer");
  await addColumn("t_modelUsage", "batchId", "text");

  // t_series (系列生产)
  if (!(await knex.schema.hasTable("t_series"))) {
    await knex.schema.createTable("t_series", (table) => {
      table.increments("id").primary();
      table.integer("projectId");
      table.text("name");
      table.text("worldView");           // JSON
      table.text("sharedCharacters");    // JSON array of character identity IDs
      table.text("sharedScenes");        // JSON array of scene asset IDs
      table.text("sharedStyle");         // JSON
      table.text("episodes");            // JSON array of SeriesEpisode
      table.text("seriesArc");           // JSON
      table.text("status").defaultTo("draft");
      table.integer("createdAt");
    });
  }
};
