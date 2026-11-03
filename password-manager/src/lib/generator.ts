import { randomInt } from './crypto';

export interface GeneratorOptions {
  mode: 'chars' | 'phrase';
  length: number; // 8–64
  upper: boolean;
  lower: boolean;
  digits: boolean;
  symbols: boolean;
  excludeSimilar: boolean;
  words: number; // 3–10
  separator: string;
  capitalize: boolean;
  addNumber: boolean;
}

export const DEFAULT_GENERATOR: GeneratorOptions = {
  mode: 'chars',
  length: 20,
  upper: true,
  lower: true,
  digits: true,
  symbols: true,
  excludeSimilar: false,
  words: 5,
  separator: '-',
  capitalize: true,
  addNumber: true,
};

const SETS = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?/~',
};
const SIMILAR = /[0OoIl1|]/g;

function pick(s: string): string {
  return s[randomInt(s.length)];
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateChars(o: GeneratorOptions): string {
  const length = Math.min(64, Math.max(8, Math.round(o.length)));
  const sets = (['upper', 'lower', 'digits', 'symbols'] as const)
    .filter((k) => o[k])
    .map((k) => (o.excludeSimilar ? SETS[k].replace(SIMILAR, '') : SETS[k]));
  if (sets.length === 0) sets.push(o.excludeSimilar ? SETS.lower.replace(SIMILAR, '') : SETS.lower);
  const all = sets.join('');
  // гарантируем хотя бы один символ из каждого выбранного набора
  const chars = sets.map(pick);
  while (chars.length < length) chars.push(pick(all));
  return shuffle(chars).join('');
}

export async function generatePhrase(o: GeneratorOptions): Promise<string> {
  const { WORDS } = await import('./wordlist');
  const n = Math.min(10, Math.max(3, Math.round(o.words)));
  const words: string[] = [];
  for (let i = 0; i < n; i++) {
    const w = WORDS[randomInt(WORDS.length)];
    words.push(o.capitalize ? w[0].toUpperCase() + w.slice(1) : w);
  }
  if (o.addNumber) {
    const idx = randomInt(words.length);
    words[idx] = words[idx] + String(randomInt(100));
  }
  return words.join(o.separator);
}

export function generate(o: GeneratorOptions): Promise<string> {
  return o.mode === 'phrase' ? generatePhrase(o) : Promise.resolve(generateChars(o));
}

/** Оценка энтропии в битах для текущих настроек генератора. */
export function generatorEntropy(o: GeneratorOptions): number {
  if (o.mode === 'phrase') {
    const n = Math.min(10, Math.max(3, o.words));
    return n * Math.log2(7776) + (o.addNumber ? Math.log2(100 * n) : 0);
  }
  let size = 0;
  for (const k of ['upper', 'lower', 'digits', 'symbols'] as const) {
    if (o[k]) size += (o.excludeSimilar ? SETS[k].replace(SIMILAR, '') : SETS[k]).length;
  }
  if (!size) size = 26;
  return o.length * Math.log2(size);
}
