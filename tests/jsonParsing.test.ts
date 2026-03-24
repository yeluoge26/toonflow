import { describe, it, expect } from 'vitest';

// Test the JSON extraction logic used in oneClickGenerate and other AI response handlers
function extractJSON(text: string): any {
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) return JSON.parse(jsonMatch[0]);
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) return JSON.parse(objMatch[0]);
  return null;
}

describe('JSON extraction from AI responses', () => {
  it('extracts array from clean response', () => {
    const input = '[{"name":"角色1","dialogue":"你好"},{"name":"角色2","dialogue":"再见"}]';
    const result = extractJSON(input);
    expect(result).toEqual([
      { name: '角色1', dialogue: '你好' },
      { name: '角色2', dialogue: '再见' },
    ]);
  });

  it('extracts array from markdown-wrapped response', () => {
    const input = `这是AI的回复：
\`\`\`json
[{"scene": 1, "description": "开场"}, {"scene": 2, "description": "冲突"}]
\`\`\`
以上是生成的场景。`;
    const result = extractJSON(input);
    expect(result).toBeInstanceOf(Array);
    expect(result).toHaveLength(2);
    expect(result[0].scene).toBe(1);
    expect(result[1].description).toBe('冲突');
  });

  it('extracts object from mixed text', () => {
    const input = `好的，这是生成的剧本配置：
{"title": "爱的反转", "episodes": 5, "style": "都市情感"}
希望对你有帮助！`;
    const result = extractJSON(input);
    expect(result).toEqual({ title: '爱的反转', episodes: 5, style: '都市情感' });
  });

  it('handles malformed JSON gracefully', () => {
    const input = '这不是有效的JSON {broken: data, missing quotes}';
    expect(() => extractJSON(input)).toThrow();
  });

  it('handles empty response', () => {
    const result = extractJSON('');
    expect(result).toBeNull();
  });

  it('extracts from nested markdown code blocks', () => {
    const input = `\`\`\`json
[
  {
    "shotIndex": 1,
    "prompt": "一个女孩站在雨中",
    "dialogue": "为什么你要离开？"
  },
  {
    "shotIndex": 2,
    "prompt": "男人转身离去",
    "dialogue": ""
  }
]
\`\`\``;
    const result = extractJSON(input);
    expect(result).toHaveLength(2);
    expect(result[0].shotIndex).toBe(1);
    expect(result[1].prompt).toBe('男人转身离去');
  });

  it('prefers array match over object match', () => {
    const input = '前言 {"key": "val"} 然后 [{"a":1}] 结束';
    const result = extractJSON(input);
    expect(result).toBeInstanceOf(Array);
    expect(result[0].a).toBe(1);
  });

  it('extracts deeply nested JSON objects', () => {
    const input = `结果如下：{"config": {"model": "gpt-4o", "params": {"temperature": 0.7}}}`;
    const result = extractJSON(input);
    expect(result.config.model).toBe('gpt-4o');
    expect(result.config.params.temperature).toBe(0.7);
  });
});
