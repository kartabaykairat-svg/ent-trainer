import { useEffect, useState } from 'react'
import { CalendarCheck, ListChecks, HeartPulse, Plane, PieChart } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { init, useStore } from '@/lib/store'
import { useTasks } from '@/lib/model'
import { checkReminders } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { Auth } from '@/screens/Auth'
import { Today } from '@/screens/Today'
import { Tasks } from '@/screens/Tasks'
import { Body } from '@/screens/Body'
import { Trips } from '@/screens/Trips'
import { More } from '@/screens/More'

const TABS = [
  { id: 'today', label: 'Сегодня', icon: CalendarCheck, view: Today },
  { id: 'tasks', label: 'Дела', icon: ListChecks, view: Tasks },
  { id: 'body', label: 'Здоровье', icon: HeartPulse, view: Body },
  { id: 'trips', label: 'Поездки', icon: Plane, view: Trips },
  { id: 'more', label: 'Баланс', icon: PieChart, view: More },
] as const

function Shell() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('today')
  const online = useStore((s) => s.online)
  const tasks = useTasks()
  useEffect(() => {
    checkReminders(tasks)
    const t = setInterval(() => checkReminders(tasks), 30_000)
    return () => clearInterval(t)
  }, [tasks])
  const View = TABS.find((t) => t.id === tab)!.view
  return (
    <div className="mx-auto flex h-full max-w-[480px] flex-col">
      {!online && <div className="bg-sun-soft py-1 text-center text-[12.5px] font-bold text-sun-text pt-safe">Офлайн — всё сохраняется на устройстве</div>}
      <main className="flex-1 overflow-y-auto pb-24"><div key={tab} className="rise"><View /></div></main>
      <nav className="fixed bottom-0 left-1/2 z-30 flex w-full max-w-[480px] -translate-x-1/2 justify-around border-t border-ink/5 bg-white/95 px-2 pb-safe backdrop-blur" aria-label="Разделы">
        {TABS.map(({ id, label, icon: I }) => (
          <button key={id} onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}
            className={cn('flex h-16 flex-1 flex-col items-center justify-center gap-0.5 text-[11.5px] font-bold transition', tab === id ? 'text-pink-strong' : 'text-ink2')}>
            <span className={cn('grid h-8 w-14 place-items-center rounded-full transition', tab === id && 'bg-pink-soft')}><I size={22} /></span>{label}
          </button>
        ))}
      </nav>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(!supabase)
  const loaded = useStore((s) => s.ready)

  useEffect(() => {
    if (!supabase) { void init(null); return }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])
  useEffect(() => { if (supabase && ready && session) void init(session.user.id) }, [ready, session?.user.id])

  if (!ready) return null
  if (supabase && !session) return <Auth />
  if (!loaded) return null
  return <Shell />
}
