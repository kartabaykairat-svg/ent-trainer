import { useSyncExternalStore } from 'react'
import { get, set } from 'idb-keyval'
import { supabase } from './supabase'
import { uid } from './utils'

export type Kind = 'task' | 'habit' | 'workout' | 'health' | 'trip'
export interface Entry<T = any> {
  id: string
  kind: Kind
  data: T
  updated_at: string
  deleted: boolean
  dirty?: boolean
}

interface State {
  entries: Record<string, Entry>
  lastSync: string | null
  ready: boolean
  syncing: boolean
  online: boolean
  error: string | null
  userId: string | null
}

let state: State = { entries: {}, lastSync: null, ready: false, syncing: false, online: navigator.onLine, error: null, userId: null }
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const setState = (p: Partial<State>) => { state = { ...state, ...p }; emit() }
export const useStore = <T,>(sel: (s: State) => T): T => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => sel(state))

const cacheKey = () => `moy-den:${state.userId ?? 'local'}`
let saveTimer: ReturnType<typeof setTimeout> | undefined
function persist() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => set(cacheKey(), { entries: state.entries, lastSync: state.lastSync }), 150)
}

export async function init(userId: string | null) {
  const cached = await get(`moy-den:${userId ?? 'local'}`)
  setState({ userId, entries: cached?.entries ?? {}, lastSync: cached?.lastSync ?? null, ready: true })
  void sync()
}

export function upsert<T>(kind: Kind, data: T, id: string = uid()) {
  const entry: Entry<T> = { id, kind, data, updated_at: new Date().toISOString(), deleted: false, dirty: true }
  setState({ entries: { ...state.entries, [id]: entry } })
  persist()
  void sync()
  return id
}
export function patch<T extends object>(id: string, p: Partial<T>) {
  const e = state.entries[id]
  if (e) upsert(e.kind, { ...e.data, ...p }, id)
}
export function remove(id: string) {
  const e = state.entries[id]
  if (!e) return
  setState({ entries: { ...state.entries, [id]: { ...e, deleted: true, dirty: true, updated_at: new Date().toISOString() } } })
  persist()
  void sync()
}

let running = false
export async function sync() {
  if (!supabase || !state.userId || !navigator.onLine || running) return
  running = true
  setState({ syncing: true, error: null })
  try {
    const dirty = Object.values(state.entries).filter((e) => e.dirty)
    if (dirty.length) {
      const rows = dirty.map(({ id, kind, data, updated_at, deleted }) => ({ id, user_id: state.userId, kind, data, updated_at, deleted }))
      const { error } = await supabase.from('entries').upsert(rows, { onConflict: 'user_id,id' })
      if (error) throw error
    }
    let q = supabase.from('entries').select('id,kind,data,updated_at,deleted').order('updated_at', { ascending: true }).limit(2000)
    if (state.lastSync) q = q.gt('updated_at', state.lastSync)
    const { data, error } = await q
    if (error) throw error
    const next = { ...state.entries }
    for (const row of data ?? []) {
      const local = next[row.id]
      if (local?.dirty && local.updated_at > row.updated_at) continue // локальная правка новее
      next[row.id] = { ...(row as Entry), dirty: false }
    }
    for (const e of dirty) if (next[e.id]?.updated_at === e.updated_at) next[e.id] = { ...next[e.id], dirty: false }
    const last = data?.length ? data[data.length - 1].updated_at : state.lastSync
    setState({ entries: next, lastSync: last })
    persist()
  } catch (e: any) {
    setState({ error: e?.message ?? 'Ошибка синхронизации' })
  } finally {
    running = false
    setState({ syncing: false })
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { setState({ online: true }); void sync() })
  window.addEventListener('offline', () => setState({ online: false }))
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && void sync())
  setInterval(() => void sync(), 60_000)
}

export const pendingCount = (s: State) => Object.values(s.entries).filter((e) => e.dirty).length
