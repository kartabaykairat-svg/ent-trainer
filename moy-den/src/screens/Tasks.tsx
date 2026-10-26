import { useState } from 'react'
import { useTasks } from '@/lib/model'
import { AREAS, type AreaId } from '@/lib/areas'
import { Chip, Empty, ScreenHead } from '@/components/ui/bits'
import { TaskRow } from '@/components/TaskRow'
import { QuickAdd } from '@/components/QuickAdd'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { today } from '@/lib/utils'

export function Tasks() {
  const tasks = useTasks()
  const [areaId, setAreaId] = useState<AreaId | 'all'>('all')
  const [view, setView] = useState<'open' | 'done'>('open')
  const [add, setAdd] = useState(false)

  const list = tasks
    .filter((e) => (areaId === 'all' || e.data.area === areaId) && (view === 'done' ? e.data.done : !e.data.done))
    .sort((a, b) => (a.data.date ?? '9999').localeCompare(b.data.date ?? '9999') || a.data.title.localeCompare(b.data.title))
  const today_ = today()

  return (
    <div className="pb-4">
      <ScreenHead title="Дела" sub={`${tasks.filter((e) => !e.data.done).length} открытых`} right={<Button size="icon" aria-label="Добавить" onClick={() => setAdd(true)}><Plus /></Button>} />
      <div className="space-y-3 px-4">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <Chip active={areaId === 'all'} onClick={() => setAreaId('all')}>Все</Chip>
          {AREAS.map((a) => <Chip key={a.id} active={areaId === a.id} onClick={() => setAreaId(a.id)}>{a.emoji} {a.label}</Chip>)}
        </div>
        <div className="flex gap-2">
          <Chip tone="sun" active={view === 'open'} onClick={() => setView('open')}>Открытые</Chip>
          <Chip tone="sun" active={view === 'done'} onClick={() => setView('done')}>Сделано</Chip>
        </div>
        {list.length === 0 ? <Empty emoji={view === 'open' ? '🌷' : '🍃'} text={view === 'open' ? 'Здесь всё спокойно' : 'Пока ничего не завершено'} />
          : <div className="space-y-2">{list.map((e) => <TaskRow key={e.id} e={e} showDate={e.data.date !== today_} />)}</div>}
      </div>
      <QuickAdd open={add} onOpenChange={setAdd} defaultArea={areaId === 'all' ? 'work' : areaId} />
    </div>
  )
}
