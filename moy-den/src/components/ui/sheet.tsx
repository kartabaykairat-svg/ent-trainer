import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

export function Sheet({ open, onOpenChange, title, children }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; children: ReactNode }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/30 fade-in" />
        <Dialog.Content
          aria-describedby={undefined}
          className="sheet-in fixed bottom-0 left-1/2 z-50 max-h-[90dvh] w-full max-w-[480px] -translate-x-1/2 overflow-y-auto rounded-t-[28px] bg-white p-5 pb-safe shadow-card"
        >
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-ink/10" />
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-[20px] font-extrabold">{title}</Dialog.Title>
            <Dialog.Close className="grid h-10 w-10 place-items-center rounded-full bg-bg text-ink2" aria-label="Закрыть"><X size={20} /></Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
