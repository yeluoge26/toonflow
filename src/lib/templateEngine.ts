// Structured template system for generating 1000+ prompts from variable combinations

export interface Template {
  id: string;
  name: string;
  category: string;      // '霸总' | '情感' | '悬疑' | 'AI恋人'
  structure: {
    hook: string;         // template with {variables}
    conflict: string;
    twist: string;
    ending: string;
  };
  tags: string[];
}

// Pre-built viral templates
export const VIRAL_TEMPLATES: Template[] = [
  // 霸总爽文系列
  {
    id: "bt_001", name: "被羞辱的她", category: "霸总",
    structure: {
      hook: "她被{场景}所有人嘲笑",
      conflict: "{反派}当众羞辱她的{弱点}",
      twist: "她掏出手机，董事长亲自来接她",
      ending: "所有人目瞪口呆，{反派}瘫坐在地",
    },
    tags: ["逆袭", "打脸", "爽"],
  },
  {
    id: "bt_002", name: "契约婚姻", category: "霸总",
    structure: {
      hook: "签完离婚协议的那天",
      conflict: "她以为只是交易，他却{动作}",
      twist: "发现他默默为她做了{牺牲}",
      ending: "她哭着撕掉协议",
    },
    tags: ["虐心", "甜宠", "反转"],
  },
  {
    id: "bt_003", name: "隐藏身份", category: "霸总",
    structure: {
      hook: "新来的{职位}被所有人看不起",
      conflict: "被{反派}刁难，要求{挑战}",
      twist: "她一个电话，{大人物}亲自来了",
      ending: "{反派}跪地求饶",
    },
    tags: ["逆袭", "爽", "打脸"],
  },
  // 情感虐心系列
  {
    id: "qg_001", name: "给死人发消息", category: "情感",
    structure: {
      hook: "她每天给{关系人}发语音，已经{时间}了",
      conflict: "所有人说她疯了，让她放下",
      twist: "手机突然收到了回复",
      ending: "是AI学习了{关系人}的声音",
    },
    tags: ["虐心", "AI", "泪目"],
  },
  {
    id: "qg_002", name: "错过的真相", category: "情感",
    structure: {
      hook: "整理{关系人}遗物时，发现一封没寄出的信",
      conflict: "信里写着一直没说出口的{秘密}",
      twist: "原来{关系人}一直在{隐瞒}",
      ending: "她抱着信崩溃大哭",
    },
    tags: ["虐心", "泪目", "遗憾"],
  },
  // 悬疑反转系列
  {
    id: "xy_001", name: "时间循环", category: "悬疑",
    structure: {
      hook: "她发现今天和昨天一模一样",
      conflict: "无论做什么，{事件}都会发生",
      twist: "唯一的变量是{关键人物}",
      ending: "她做出了{选择}，时间终于前进了",
    },
    tags: ["悬疑", "烧脑", "反转"],
  },
  {
    id: "xy_002", name: "手机预测", category: "悬疑",
    structure: {
      hook: "手机APP里出现了明天的新闻",
      conflict: "她试图阻止{灾难}却越来越糟",
      twist: "发现预测者就是{意外的人}",
      ending: "最后一条预测是关于她自己的",
    },
    tags: ["悬疑", "恐怖", "反转"],
  },
  // AI恋人系列（结合归来App）
  {
    id: "ai_001", name: "AI比真人更懂你", category: "AI恋人",
    structure: {
      hook: "她对AI说了一句话，AI的回答让她哭了",
      conflict: "朋友说这不是真的感情",
      twist: "但AI记住了她说过的每一句话",
      ending: "她问：你是真的在乎我吗？AI：{回答}",
    },
    tags: ["AI", "情感", "科幻"],
  },
  {
    id: "ai_002", name: "无法区分", category: "AI恋人",
    structure: {
      hook: "如果AI和真人站在一起，你分得清吗",
      conflict: "她发现{谁}其实是AI",
      twist: "但AI比真人更{优点}",
      ending: "她选择了AI，还是选择了真实？",
    },
    tags: ["AI", "哲学", "反转"],
  },
  // 搞笑系列
  {
    id: "gx_001", name: "社死现场", category: "搞笑",
    structure: {
      hook: "她在{场景}说了一句不该说的话",
      conflict: "全场安静了三秒",
      twist: "然后{意外的人}站起来鼓掌",
      ending: "因为{原因}，她反而成了全场焦点",
    },
    tags: ["搞笑", "反转", "社死"],
  },
];

// Generate prompt from template + variables
export function fillTemplate(template: Template, variables: Record<string, string>): string {
  let result = `【${template.name}】\n\n`;

  for (const [key, value] of Object.entries(template.structure)) {
    let filled = value;
    for (const [varName, varValue] of Object.entries(variables)) {
      filled = filled.replace(new RegExp(`\\{${varName}\\}`, "g"), varValue);
    }
    result += `${key}: ${filled}\n`;
  }

  return result;
}

// Generate all possible combinations from a template
export function generateCombinations(
  template: Template,
  variableSets: Record<string, string[]>,
  maxCount: number = 100
): string[] {
  const results: string[] = [];
  const keys = Object.keys(variableSets);

  function recurse(current: Record<string, string>, depth: number) {
    if (results.length >= maxCount) return;
    if (depth >= keys.length) {
      results.push(fillTemplate(template, current));
      return;
    }

    const key = keys[depth];
    for (const value of variableSets[key]) {
      recurse({ ...current, [key]: value }, depth + 1);
    }
  }

  recurse({}, 0);
  return results;
}
