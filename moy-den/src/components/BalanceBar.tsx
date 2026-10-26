import { GROUPS } from '@/lib/areas'
import type { Group } from '@/lib/areas'
import type { weekBalance } from '@/lib/balance'

export function BalanceBar({ b }: { b: ReturnType<typeof weekBalance> }) {
  const order: Group[] = ['work', 'family', 'me']
  return (
    <div>
      <div className="flex h-4 overflow-hidden rounded-full bg-bg" role="img" aria-label="Баланс работы, семьи и личного времени">
        {b.total > 0 && order.map((g) => <div key={g} className={GROUPS[g].bar} style={{ width: `${b.pct(g)}%`, transition: 'width .25s ease' }} />)}
      </div>
      <div className="mt-2 flex justify-between text-[12.5px] font-bold">
        {order.map((g) => <span key={g} className={GROUPS[g].text}>{GROUPS[g].label} {b.pct(g)}%</span>)}
      </div>
    </div>
  )
}
