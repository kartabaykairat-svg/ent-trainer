import { useState } from 'react'
import { Plus, Trash2, ChevronLeft } from 'lucide-react'
import { useTrips, type Trip } from '@/lib/model'
import { upsert, remove, patch } from '@/lib/store'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Check4, Empty, ScreenHead } from '@/components/ui/bits'
import { fmtShort, fromKey, today, uid } from '@/lib/utils'

const daysTo = (k: string) => Math.ceil((fromKey(k).getTime() - fromKey(today()).getTime()) / 864e5)

export function Trips() {
  const trips = useTrips().sort((a, b) => a.data.from.localeCompare(b.data.from))
  const [open, setOpen] = useState(false)
  const [sel, setSel] = useState<string | null>(null)
  const [f, setF] = useState({ title: '', from: today(), to: today() })
  const [item, setItem] = useState('')
  const cur = trips.find((t) => t.id === sel)

  if (cur) {
    const t = cur.data
    const setPack = (packing: Trip['packing']) => patch<Trip>(cur.id, { packing })
    const done = t.packing.filter((p) => p.done).length
    return (
      <div className="pb-4">
        <div className="px-4 pt-6 pt-safe"><button onClick={() => setSel(null)} className="flex h-11 items-center gap-1 font-bold text-ink2"><ChevronLeft /> Все поездки</button></div>
        <ScreenHead title={t.title} sub={`${fmtShort(t.from)} – ${fmtShort(t.to)}`} />
        <div className="space-y-3 px-4">
          <section className="card">
            <h2>Что взять · {done}/{t.packing.length}</h2>
            <form className="my-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (item.trim()) { setPack([...t.packing, { id: uid(), text: item.trim(), done: false }]); setItem('') } }}>
              <input className="field" placeholder="Паспорт, зарядка…" value={item} onChange={(e) => setItem(e.target.value)} />
              <Button size="icon" className="!h-12 !w-12 shrink-0" aria-label="Добавить"><Plus /></Button>
            </form>
            {t.packing.length === 0 ? <Empty emoji="🎒" text="Список пока пуст" /> : t.packing.map((p) => (
              <div key={p.id} className="flex items-center">
                <Check4 done={p.done} onChange={() => setPack(t.packing.map((x) => (x.id === p.id ? { ...x, done: !x.done } : x)))} />
                <span className={p.done ? 'flex-1 text-ink2 line-through' : 'flex-1'}>{p.text}</span>
                <button aria-label="Удалить" className="grid h-11 w-11 place-items-center text-ink2/50" onClick={() => setPack(t.packing.filter((x) => x.id !== p.id))}><Trash2 size={18} /></button>
              </div>
            ))}
          </section>
          <Button variant="ghost" className="w-full" onClick={() => { remove(cur.id); setSel(null) }}>Удалить поездку</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-4">
      <ScreenHead title="Поездки" right={<Button size="icon" aria-label="Добавить поездку" onClick={() => setOpen(true)}><Plus /></Button>} />
      <div className="space-y-3 px-4">
        {trips.length === 0 ? <Empty emoji="🧳" text="Запланируйте первую поездку" /> : trips.map((e) => {
          const n = daysTo(e.data.from)
          return (
            <button key={e.id} onClick={() => setSel(e.id)} className="card rise flex w-full items-center justify-between text-left transition active:scale-[.98]">
              <div><p className="text-[17px] font-extrabold">{e.data.title}</p><p className="text-[13px] text-ink2">{fmtShort(e.data.from)} – {fmtShort(e.data.to)}</p></div>
              <span className="rounded-full bg-sun-soft px-3 py-1 text-[13px] font-extrabold text-sun-text">{n > 0 ? `через ${n} дн.` : daysTo(e.data.to) >= 0 ? 'в пути ✈️' : 'позади'}</span>
            </button>
          )
        })}
      </div>
      <Sheet open={open} onOpenChange={setOpen} title="Новая поездка">
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (!f.title.trim()) return; upsert('trip', { ...f, title: f.title.trim(), packing: [] } satisfies Trip); setF({ title: '', from: today(), to: today() }); setOpen(false) }}>
          <input className="field" placeholder="Куда едем?" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <label><span className="label">С</span><input type="date" className="field mt-1" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value, to: e.target.value > f.to ? e.target.value : f.to })} /></label>
            <label><span className="label">По</span><input type="date" className="field mt-1" min={f.from} value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></label>
          </div>
          <Button size="lg" className="w-full" disabled={!f.title.trim()}>Добавить</Button>
        </form>
      </Sheet>
    </div>
  )
}
