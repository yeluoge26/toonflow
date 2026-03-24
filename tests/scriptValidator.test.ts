import { describe, it, expect } from 'vitest';
import { validateScript, generateRewritePrompt, ValidationResult } from '../src/lib/scriptValidator';

describe('Script validation', () => {
  describe('validateScript', () => {
    it('rejects empty content', () => {
      const result = validateScript('');
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('剧本内容过短');
    });

    it('rejects very short content', () => {
      const result = validateScript('太短了');
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('剧本内容过短');
    });

    it('detects hook in first paragraph', () => {
      const withHook = `"你怎么敢！" 她猛然站起来，手中的杯子摔在地上。
这是第二行，描述场景的变化。
第三行继续描写角色的反应和动作。
后续剧情展开，角色之间的对峙和秘密揭露。
背叛的真相终于暴露，原来一切都是谎言。
她震惊地看着他，不敢相信眼前的一切。
最后她崩溃大哭，转身离开。【黑屏】`;
      const result = validateScript(withHook);
      expect(result.hasHook).toBe(true);
    });

    it('detects missing hook', () => {
      const noHook = `今天天气很好，阳光明媚，小鸟在枝头歌唱。
他们坐在公园里，安静地享受着午后的时光。
微风轻轻吹过，树叶沙沙作响。
后来他们发现了一个背叛的秘密，震惊不已。
原来一切都是谎言，真相让人崩溃。`;
      const result = validateScript(noHook);
      expect(result.hasHook).toBe(false);
    });

    it('detects conflict patterns', () => {
      const withConflict = `"不可能！" 她猛然抬头，眼中满是震惊。
怎么会这样，为什么要背叛我，这一切都是谎言！
他愤怒地拍桌子，两人激烈地争吵起来。
真相终于揭露，原来他一直在欺骗所有人。
她悲伤地哭泣，然后震惊地发现了隐藏的秘密。
最后她崩溃了，转身离开。【黑屏】`;
      const result = validateScript(withConflict);
      expect(result.hasConflict).toBe(true);
    });

    it('detects twist patterns', () => {
      const withTwist = `"怎么会？" 她猛然回头，不敢相信。
故事开始展开，两人之间的冲突逐渐升级，争吵不断。
他背叛了所有人的信任。
真相终于揭露，原来他竟然是她失散多年的兄弟。
她震惊地目瞪口呆，悲伤转为释然。
最终她崩溃大哭，但又笑了。【黑屏】`;
      const result = validateScript(withTwist);
      expect(result.hasTwist).toBe(true);
    });

    it('counts emotion changes correctly', () => {
      const multiEmotion = `"竟然是你！" 她震惊地看着他，不敢相信。
他笑着走过来，两人开心地拥抱在一起，一切都是谎言般的背叛。
突然她发现了秘密，愤怒地推开他，崩溃大哭。
"为什么要欺骗我？" 她悲伤地问道，眼中满是痛苦。
他害怕地后退，紧张得说不出话来。
真相揭露后，她感动地流下了幸福的泪水。【黑屏】`;
      const result = validateScript(multiEmotion);
      // Should detect: positive (笑/开心/幸福/感动), negative (哭/悲伤/痛苦/崩溃), surprise (震惊/不敢相信), tension (紧张/害怕)
      expect(result.emotionChanges).toBeGreaterThanOrEqual(2);
    });

    it('detects strong ending', () => {
      const strongEnd = `"不可能！" 她猛然站起来。
他们之间的争吵越来越激烈，冲突不可避免。
原来他一直在隐瞒秘密，真相终于揭露。
她震惊了，不敢相信眼前的一切。
她的愤怒变成了悲伤，眼泪不停地流。
最后她崩溃大哭，转身离开。【黑屏】`;
      const result = validateScript(strongEnd);
      expect(result.hasStrongEnding).toBe(true);
    });

    it('validates a fully valid script', () => {
      const validScript = `"你竟然敢回来！" 她猛然摔碎手中的酒杯。
"冷静点，让我解释——" 他上前一步。
"你还有脸解释？背叛了我的人，现在来说什么？" 她愤怒地吼道。
两人激烈争吵，多年的隐瞒和谎言终于摊在台面上。
她悲伤地蹲在地上，眼泪止不住地流。
"其实，我一直在保护你。" 他沉声说。
"保护我？" 她震惊地抬头，目瞪口呆。
原来，他竟然是卧底，一切的背叛都是为了她的安全。
她不敢相信，紧张地看着门外的脚步声。
最终她崩溃大哭，紧紧抱住他。【黑屏】`;
      const result = validateScript(validScript);
      expect(result.hasHook).toBe(true);
      expect(result.hasConflict).toBe(true);
      expect(result.hasTwist).toBe(true);
      expect(result.emotionChanges).toBeGreaterThanOrEqual(2);
      expect(result.hasStrongEnding).toBe(true);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('returns issues and suggestions for invalid script', () => {
      const weakScript = `今天他去了商店买东西。
他买了一些日用品和食物。
回到家后，他做了一顿简单的晚餐。
吃完饭后看了会电视。
然后他就去睡觉了。`;
      const result = validateScript(weakScript);
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('generateRewritePrompt', () => {
    it('returns empty string for valid script', () => {
      const valid: ValidationResult = {
        valid: true,
        hasHook: true,
        hasConflict: true,
        hasTwist: true,
        emotionChanges: 3,
        hasStrongEnding: true,
        issues: [],
        suggestions: [],
      };
      expect(generateRewritePrompt(valid)).toBe('');
    });

    it('includes hook instruction when missing', () => {
      const noHook: ValidationResult = {
        valid: false,
        hasHook: false,
        hasConflict: true,
        hasTwist: true,
        emotionChanges: 3,
        hasStrongEnding: true,
        issues: ['开头缺少钩子'],
        suggestions: [],
      };
      const prompt = generateRewritePrompt(noHook);
      expect(prompt).toContain('强化开头');
    });

    it('includes conflict instruction when missing', () => {
      const noConflict: ValidationResult = {
        valid: false,
        hasHook: true,
        hasConflict: false,
        hasTwist: true,
        emotionChanges: 3,
        hasStrongEnding: true,
        issues: [],
        suggestions: [],
      };
      const prompt = generateRewritePrompt(noConflict);
      expect(prompt).toContain('增加冲突');
    });

    it('includes twist instruction when missing', () => {
      const noTwist: ValidationResult = {
        valid: false,
        hasHook: true,
        hasConflict: true,
        hasTwist: false,
        emotionChanges: 3,
        hasStrongEnding: true,
        issues: [],
        suggestions: [],
      };
      const prompt = generateRewritePrompt(noTwist);
      expect(prompt).toContain('加入反转');
    });

    it('includes emotion instruction when insufficient', () => {
      const lowEmotion: ValidationResult = {
        valid: false,
        hasHook: true,
        hasConflict: true,
        hasTwist: true,
        emotionChanges: 1,
        hasStrongEnding: true,
        issues: [],
        suggestions: [],
      };
      const prompt = generateRewritePrompt(lowEmotion);
      expect(prompt).toContain('情绪波动');
    });

    it('includes ending instruction when weak', () => {
      const weakEnd: ValidationResult = {
        valid: false,
        hasHook: true,
        hasConflict: true,
        hasTwist: true,
        emotionChanges: 3,
        hasStrongEnding: false,
        issues: [],
        suggestions: [],
      };
      const prompt = generateRewritePrompt(weakEnd);
      expect(prompt).toContain('强化结尾');
    });

    it('includes all instructions when everything is missing', () => {
      const allBad: ValidationResult = {
        valid: false,
        hasHook: false,
        hasConflict: false,
        hasTwist: false,
        emotionChanges: 0,
        hasStrongEnding: false,
        issues: [],
        suggestions: [],
      };
      const prompt = generateRewritePrompt(allBad);
      expect(prompt).toContain('强化开头');
      expect(prompt).toContain('增加冲突');
      expect(prompt).toContain('加入反转');
      expect(prompt).toContain('情绪波动');
      expect(prompt).toContain('强化结尾');
      expect(prompt).toContain('保留原有核心剧情');
    });
  });
});
