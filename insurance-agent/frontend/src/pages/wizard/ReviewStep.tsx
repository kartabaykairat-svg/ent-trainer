import { useState } from "react"
import api from "../../api/client"
import type { ClientDetail, Confidence, PersonData } from "../../api/types"
import ConfidenceBadge from "../../components/ConfidenceBadge"

const FIELD_ROWS: { path: string; label: string }[] = [
  { path: "full_name", label: "ФИО" },
  { path: "birth_date", label: "Дата рождения" },
  { path: "iin", label: "ИИН" },
  { path: "registration_address", label: "Адрес регистрации" },
  { path: "residential_address", label: "Адрес проживания" },
  { path: "document.type", label: "Тип документа" },
  { path: "document.number", label: "№ документа" },
  { path: "document.series", label: "Серия" },
  { path: "document.issue_date", label: "Дата выдачи" },
  { path: "document.issued_by", label: "Кем выдан" },
  { path: "phone", label: "Телефон" },
  { path: "email", label: "E-mail" },
  { path: "bank.name", label: "Банк" },
  { path: "bank.iban", label: "Счёт / IBAN" },
]

function getPath(obj: any, path: string): string {
  return path.split(".").reduce((o, k) => (o ? o[k] : ""), obj) ?? ""
}

export default function ReviewStep({
  client,
  onChange,
  onNext,
}: {
  client: ClientDetail
  onChange: () => void
  onNext: () => void
}) {
  const unresolved = client.data.conflicts.filter((c) => !c.resolved)

  async function resolveConflict(conflictId: string, value: string) {
    await api.post(`/clients/${client.id}/conflicts/resolve`, { conflict_id: conflictId, resolved_value: value })
    onChange()
  }

  return (
    <div className="space-y-8">
      <div className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-600">Проверьте данные клиента</div>

      {unresolved.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-red-700">⚠️ Обнаружены противоречия</h3>
          {unresolved.map((c) => (
            <div key={c.id} className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="mb-2 font-medium text-slate-900">{c.field_label}</div>
              <div className="space-y-2">
                {c.candidates.map((cand, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md bg-white px-3 py-2">
                    <span className="text-sm text-slate-800">
                      Документ «{cand.source_filename || "—"}»: <b>{cand.value}</b>
                    </span>
                    <button
                      onClick={() => resolveConflict(c.id, cand.value)}
                      className="rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800"
                    >
                      Использовать это значение
                    </button>
                  </div>
                ))}
                <ManualResolve conflictId={c.id} onResolve={resolveConflict} />
              </div>
            </div>
          ))}
        </div>
      )}

      <PersonCard title={client.second_insurer ? "Первый страхователь" : "Страхователь"} personKey="c1" person={client.data.c1} client={client} onChange={onChange} />
      {client.second_insurer && (
        <PersonCard title="Второй страхователь" personKey="c2" person={client.data.c2} client={client} onChange={onChange} />
      )}

      <div className="flex justify-end">
        <button
          onClick={onNext}
          disabled={unresolved.length > 0}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
        >
          Далее: параметры страхования →
        </button>
      </div>
    </div>
  )
}

function ManualResolve({ conflictId, onResolve }: { conflictId: string; onResolve: (id: string, v: string) => void }) {
  const [value, setValue] = useState("")
  return (
    <div className="flex items-center gap-2 rounded-md bg-white px-3 py-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ввести вручную"
        className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
      />
      <button
        onClick={() => value && onResolve(conflictId, value)}
        className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
      >
        Ввести вручную
      </button>
    </div>
  )
}

function PersonCard({
  title,
  personKey,
  person,
  client,
  onChange,
}: {
  title: string
  personKey: "c1" | "c2"
  person: PersonData
  client: ClientDetail
  onChange: () => void
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-900">{title}</div>
      <div className="divide-y divide-slate-100">
        {FIELD_ROWS.map((f) => {
          const path = `${personKey}.${f.path}`
          const meta = client.data.field_confidence[path]
          const confidence: Confidence = meta?.confidence ?? (getPath(person, f.path) ? "high" : "missing")
          return (
            <FieldRow
              key={f.path}
              label={f.label}
              value={getPath(person, f.path)}
              confidence={confidence}
              onSave={async (val) => {
                await api.post(`/clients/${client.id}/field`, { path, value: val })
                onChange()
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

function FieldRow({
  label,
  value,
  confidence,
  onSave,
}: {
  label: string
  value: string
  confidence: Confidence
  onSave: (v: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3">
      <div className="w-48 shrink-0 text-sm text-slate-500">{label}</div>
      {editing ? (
        <div className="flex flex-1 items-center gap-2">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
          <button
            onClick={async () => {
              await onSave(draft)
              setEditing(false)
            }}
            className="rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white"
          >
            Сохранить
          </button>
          <button onClick={() => setEditing(false)} className="text-xs text-slate-400">
            Отмена
          </button>
        </div>
      ) : (
        <>
          <div className="flex-1 text-sm text-slate-900">
            {value || <span className="text-slate-400">Данные отсутствуют — требуется ввод менеджера</span>}
          </div>
          <ConfidenceBadge confidence={confidence} compact />
          <button
            onClick={() => {
              setDraft(value)
              setEditing(true)
            }}
            className="text-xs font-medium text-slate-500 hover:text-slate-900"
          >
            ✏️ Изменить
          </button>
        </>
      )}
    </div>
  )
}
