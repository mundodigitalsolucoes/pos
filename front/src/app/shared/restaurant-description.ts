/** A small text-only formatting grammar; no user HTML is ever interpreted. */
export interface DescriptionRun { text: string; emphasis: 'plain' | 'bold' | 'italic' }
export interface DescriptionLine { list: boolean; runs: DescriptionRun[] }

export function descriptionLines(value: string | null | undefined): DescriptionLine[] {
  if (!value?.trim()) return [];
  return value.replace(/\r\n?/g, '\n').split('\n').map(source => {
    const list = /^\s*-\s+/.test(source);
    const text = list ? source.replace(/^\s*-\s+/, '') : source;
    const runs: DescriptionRun[] = [];
    const tokens = /(\*\*[^*\n]+\*\*|_[^_\n]+_)/g;
    let offset = 0;
    for (const match of text.matchAll(tokens)) {
      const index = match.index ?? 0;
      if (index > offset) runs.push({ text: text.slice(offset, index), emphasis: 'plain' });
      const token = match[0];
      runs.push({ text: token.startsWith('**') ? token.slice(2, -2) : token.slice(1, -1), emphasis: token.startsWith('**') ? 'bold' : 'italic' });
      offset = index + token.length;
    }
    if (offset < text.length || !runs.length) runs.push({ text: text.slice(offset), emphasis: 'plain' });
    return { list, runs };
  });
}
