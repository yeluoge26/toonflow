// Validates script structure for viral potential
// Checks: hook, conflict, twist, emotion changes, ending

export interface ValidationResult {
  valid: boolean;
  hasHook: boolean;
  hasConflict: boolean;
  hasTwist: boolean;
  emotionChanges: number;
  hasStrongEnding: boolean;
  issues: string[];
  suggestions: string[];
}

export function validateScript(content: string): ValidationResult {
  if (!content || content.trim().length < 50) {
    return {
      valid: false, hasHook: false, hasConflict: false, hasTwist: false,
      emotionChanges: 0, hasStrongEnding: false,
      issues: ["剧本内容过短"],
      suggestions: ["剧本至少需要100字以上"],
    };
  }

  const lines = content.split("\n").filter(l => l.trim().length > 0);
  const firstParagraph = lines.slice(0, 3).join(" ");
  const lastParagraph = lines.slice(-3).join(" ");
  const fullText = content;

  // Check hook (first 3 lines)
  const hookPatterns = [
    /[！!]{1,}/, /[？?]/, /(突然|忽然|猛然|瞬间)/,
    /(不可能|怎么会|竟然|没想到)/, /(你敢|谁给你|滚|闭嘴)/,
    /"[^"]{1,30}"/, /(死|血|消失|失踪|崩溃)/,
  ];
  const hasHook = hookPatterns.some(p => p.test(firstParagraph));

  // Check conflict
  const conflictPatterns = [
    /(对峙|争吵|吵架|打架|冲突)/, /(背叛|欺骗|谎言|隐瞒|秘密)/,
    /(你滚|我恨你|再也不|永远不)/, /(愤怒|暴怒|崩溃)/,
    /"[^"]*[！!][^"]*".*"[^"]*[！!][^"]*"/s, // Two exclamatory dialogues
  ];
  const hasConflict = conflictPatterns.some(p => p.test(fullText));

  // Check twist
  const twistPatterns = [
    /(反转|真相|揭露|暴露|原来|竟然是|没想到)/,
    /(其实|一直|从来|根本)/, /(震惊|目瞪口呆|傻眼|不敢相信)/,
  ];
  const hasTwist = twistPatterns.some(p => p.test(fullText));

  // Count emotion changes
  const emotionKeywords = {
    positive: /(笑|开心|幸福|感动|温暖|甜蜜|喜悦|高兴)/g,
    negative: /(哭|悲伤|痛苦|绝望|愤怒|心碎|崩溃|难过)/g,
    surprise: /(震惊|惊讶|不敢相信|傻眼)/g,
    tension: /(紧张|害怕|恐惧|颤抖)/g,
  };

  const emotionTypes = new Set<string>();
  for (const [type, regex] of Object.entries(emotionKeywords)) {
    if (regex.test(fullText)) emotionTypes.add(type);
  }
  const emotionChanges = emotionTypes.size;

  // Check strong ending
  const endingPatterns = [
    /【黑屏】/, /(崩溃|大哭|震惊|反转)/,
    /[！!]{2,}/, /"[^"]*"$/, /(转身|离开|消失)/,
  ];
  const hasStrongEnding = endingPatterns.some(p => p.test(lastParagraph));

  // Build issues and suggestions
  const issues: string[] = [];
  const suggestions: string[] = [];

  if (!hasHook) {
    issues.push("开头缺少钩子");
    suggestions.push("在前3秒加入强冲突、悬念或震惊的对白");
  }
  if (!hasConflict) {
    issues.push("缺少明确冲突");
    suggestions.push("增加角色对立、争吵或秘密揭露");
  }
  if (!hasTwist) {
    issues.push("缺少反转");
    suggestions.push("在结尾前加入出乎意料的真相或身份揭露");
  }
  if (emotionChanges < 2) {
    issues.push("情绪变化不足");
    suggestions.push("至少需要2种情绪变化（如从愤怒到震惊，从悲伤到释然）");
  }
  if (!hasStrongEnding) {
    issues.push("结尾力度不够");
    suggestions.push("用强情绪收尾（崩溃大哭/冷笑转身/震惊真相），并以【黑屏】结束");
  }

  const valid = hasHook && hasConflict && hasTwist && emotionChanges >= 2 && hasStrongEnding;

  return { valid, hasHook, hasConflict, hasTwist, emotionChanges, hasStrongEnding, issues, suggestions };
}

// Generate rewrite instructions based on validation
export function generateRewritePrompt(validation: ValidationResult): string {
  if (validation.valid) return "";

  const instructions: string[] = ["请根据以下要求改写剧本：\n"];

  if (!validation.hasHook) {
    instructions.push("1. 【强化开头】前3秒必须有强冲突或悬念钩子，用对白或突发事件开场");
  }
  if (!validation.hasConflict) {
    instructions.push("2. 【增加冲突】必须有明确的角色对立、争吵或秘密揭露场景");
  }
  if (!validation.hasTwist) {
    instructions.push("3. 【加入反转】在结尾前必须有出乎意料的真相揭露或身份反转");
  }
  if (validation.emotionChanges < 2) {
    instructions.push("4. 【情绪波动】至少要有2种不同的情绪变化，如从愤怒到震惊");
  }
  if (!validation.hasStrongEnding) {
    instructions.push("5. 【强化结尾】用强情绪收尾（崩溃/震惊/反转），以【黑屏】结束");
  }

  instructions.push("\n保留原有核心剧情，只强化以上不足之处。直接输出改写后的完整剧本。");

  return instructions.join("\n");
}
