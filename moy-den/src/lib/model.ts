import { useMemo } from 'react'
import { useStore, upsert, type Entry } from './store'
import type { AreaId } from './areas'
import { today } from './utils'

export interface Task { title: string; area: AreaId; date: string | null; time?: string; done: boolean; doneAt?: string; note?: string }
export interface Habit { title: string; emoji: string; area: AreaId; doneDates: string[] }
export interface Workout { date: string; type: string; minutes: number; note?: string }
export interface Health { date: string; water: number; sleep: number; mood: number; weight?: number }
export interface PackItem { id: string; text: string; done: boolean }
export interface Trip { title: string; from: string; to: string; note?: string; packing: PackItem[] }

function useKind<T>(kind: Entry['kind']) {
  const entries = useStore((s) => s.entries)
  return useMemo(() => Object.values(entries).filter((e) => e.kind === kind && !e.deleted) as Entry<T>[], [entries, kind])
}
export const useTasks = () => useKind<Task>('task')
export const useHabits = () => useKind<Habit>('habit')
export const useWorkouts = () => useKind<Workout>('workout')
export const useHealthAll = () => useKind<Health>('health')
export const useTrips = () => useKind<Trip>('trip')

export const healthId = (date: string) => `health-${date}`
export const emptyHealth = (date: string): Health => ({ date, water: 0, sleep: 0, mood: 0 })
export function useHealth(date = today()) {
  const all = useHealthAll()
  return all.find((e) => e.data.date === date)?.data ?? emptyHealth(date)
}
export const saveHealth = (h: Health) => upsert('health', h, healthId(h.date))
