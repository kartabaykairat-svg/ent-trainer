export type AreaId = 'work' | 'family' | 'leisure' | 'sport' | 'health' | 'travel'
export type Group = 'work' | 'family' | 'me'

export const AREAS: { id: AreaId; label: string; emoji: string; group: Group }[] = [
  { id: 'work', label: 'Работа', emoji: '💼', group: 'work' },
  { id: 'family', label: 'Семья', emoji: '🏡', group: 'family' },
  { id: 'leisure', label: 'Досуг', emoji: '🎨', group: 'me' },
  { id: 'sport', label: 'Спорт', emoji: '🏃', group: 'me' },
  { id: 'health', label: 'Здоровье', emoji: '🌿', group: 'me' },
  { id: 'travel', label: 'Поездки', emoji: '🧳', group: 'me' },
]
export const area = (id: AreaId) => AREAS.find((a) => a.id === id)!

// Три цвета: работа — жёлтый, семья — розовый, личное — зелёный
export const GROUPS: Record<Group, { label: string; bar: string; soft: string; text: string; hex: string }> = {
  work: { label: 'Работа', bar: 'bg-sun', soft: 'bg-sun-soft', text: 'text-sun-text', hex: '#FFD966' },
  family: { label: 'Семья', bar: 'bg-pink', soft: 'bg-pink-soft', text: 'text-pink-text', hex: '#F7A8C4' },
  me: { label: 'Для себя', bar: 'bg-leaf', soft: 'bg-leaf-soft', text: 'text-leaf-text', hex: '#A8DDB5' },
}
