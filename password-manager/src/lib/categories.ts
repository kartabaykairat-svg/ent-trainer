import type { Category } from './types';

export const BUILTIN_CATEGORIES: Category[] = [
  { id: 'mail', name: 'Почта' },
  { id: 'social', name: 'Соцсети' },
  { id: 'work', name: 'Работа' },
  { id: 'banks', name: 'Банки' },
  { id: 'shops', name: 'Магазины' },
  { id: 'study', name: 'Учёба' },
  { id: 'other', name: 'Другое' },
];

export function allCategories(custom: Category[]): Category[] {
  // «Другое» всегда последней
  const builtins = BUILTIN_CATEGORIES.filter((c) => c.id !== 'other');
  return [...builtins, ...custom, BUILTIN_CATEGORIES[BUILTIN_CATEGORIES.length - 1]];
}

export function categoryName(id: string, custom: Category[]): string {
  return allCategories(custom).find((c) => c.id === id)?.name ?? 'Другое';
}
