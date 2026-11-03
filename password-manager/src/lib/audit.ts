import { daysSince } from './format';
import { estimateStrength } from './strength';
import type { Entry } from './types';

export const OLD_DAYS = 180;

export interface AuditResult {
  score: number;
  weak: Entry[];
  reused: Entry[][];
  old: Entry[];
  breached: Entry[];
  checkedBreaches: boolean;
}

export function audit(entries: Entry[], breaches: Map<string, number> | null): AuditResult {
  const weak = entries.filter((e) => estimateStrength(e.password).score < 2);
  const groups = new Map<string, Entry[]>();
  for (const e of entries) {
    const list = groups.get(e.password) ?? [];
    list.push(e);
    groups.set(e.password, list);
  }
  const reused = [...groups.values()].filter((g) => g.length > 1).sort((a, b) => b.length - a.length);
  const reusedIds = new Set(reused.flat().map((e) => e.id));
  const old = entries.filter((e) => daysSince(e.passwordChangedAt) > OLD_DAYS);
  const breached = breaches ? entries.filter((e) => (breaches.get(e.id) ?? 0) > 0) : [];

  if (!entries.length) return { score: 100, weak, reused, old, breached, checkedBreaches: Boolean(breaches) };

  const weakIds = new Set(weak.map((e) => e.id));
  const oldIds = new Set(old.map((e) => e.id));
  const breachedIds = new Set(breached.map((e) => e.id));
  // Каждая запись получает баллы от 0 до 1; итог — среднее × 100.
  let total = 0;
  for (const e of entries) {
    let p = 1;
    if (breachedIds.has(e.id)) p -= 0.6;
    if (weakIds.has(e.id)) p -= 0.45;
    if (reusedIds.has(e.id)) p -= 0.3;
    if (oldIds.has(e.id)) p -= 0.1;
    total += Math.max(0, p);
  }
  return {
    score: Math.round((total / entries.length) * 100),
    weak,
    reused,
    old,
    breached,
    checkedBreaches: Boolean(breaches),
  };
}
