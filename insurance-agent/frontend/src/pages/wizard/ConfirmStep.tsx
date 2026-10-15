import { useEffect, useState } from "react"
import api from "../../api/client"
import type { ClientDetail } from "../../api/types"

interface ChecklistItem {
  label: string
  ok: boolean
}

export default function ConfirmStep({ client, onChange }: { client: ClientDetail; onChange: () => void }) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [showWarning, setShowWarning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [genErrors, setGenErrors] = useState<string[]>([])

  async function loadChecklist() {
    const r = await api.get(`/clients/${client.id}/checklist`)
    setChecklist(r.data.items)
    setErrors(r.data.errors)
  }

  // "Данные подтверждены менеджером" is the one checklist item that the
  // confirmation button itself is meant to satisfy - so it must not block
  // that same button from being enabled.
  const blockingErrors = errors.filter((e) => !e.includes("ещё не подтверждены"))
  const readyToConfirm = blockingErrors.length === 0

  useEffect(() => {
    loadChecklist()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id, client.data.manager_confirmed])

  async function confirmAndGenerate() {
    setBusy(true)
    setGenErrors([])
    try {
      const r = await api.post(`/clients/${client.id}/confirm`)
      if (!r.data.ok) {
        setGenErrors(r.data.errors)
        setShowWarning(false)
        return
      }
      await api.post(`/clients/${client.id}/generate`)
      onChange()
      setShowWarning(false)
    } catch (e: any) {
      setGenErrors(e?.response?.data?.detail?.errors ?? [e?.response?.data?.detail?.message ?? "Ошибка формирования документов"])
    } finally {
      setBusy(false)
      loadChecklist()
    }
  }

  async function download(docType: "contract" | "poa", fmt: "docx" | "pdf") {
    const r = await api.get(`/clients/${client.id}/download/${docType}/${fmt}`, { responseType: "blob" })
    const url = URL.createObjectURL(r.data)
    const a = document.createElement("a")
    a.href = url
    const disposition = r.headers["content-disposition"] as string | undefined
    const starMatch = disposition?.match(/filename\*=UTF-8''([^;]+)/i)
    const plainMatch = disposition?.match(/filename="?([^";]+)"?/i)
    a.download = (starMatch && decodeURIComponent(starMatch[1])) || plainMatch?.[1] || `${docType}.${fmt}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  async function deleteSourceDocs() {
    await api.post(`/clients/${client.id}/delete-source-documents`)
    onChange()
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 font-semibold text-slate-900">Финальный чек-лист</h3>
        <ul className="space-y-1.5 text-sm">
          {checklist.map((item, i) => (
            <li key={i} className={item.ok ? "text-slate-700" : "text-red-600"}>
              {item.ok ? "☑" : "☐"} {item.label}
            </li>
          ))}
        </ul>
        {errors.length > 0 && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <div className="font-medium">Документ не может быть сформирован:</div>
            <ul className="mt-1 list-inside list-disc">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {!client.contract_generated || !client.poa_generated ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          {!showWarning ? (
            <button
              onClick={() => setShowWarning(true)}
              disabled={!readyToConfirm}
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
            >
              Подтвердить данные клиента
            </button>
          ) : (
            <div className="rounded-lg bg-amber-50 p-4">
              <p className="text-sm text-amber-900">
                Проверьте правильность ФИО, даты рождения, ИИН, адреса и данных документа. После подтверждения эти
                данные будут использованы для формирования официальных документов.
              </p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => setShowWarning(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
                  Отмена
                </button>
                <button
                  onClick={confirmAndGenerate}
                  disabled={busy}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy ? "Формирование..." : "Подтвердить и сформировать документы"}
                </button>
              </div>
            </div>
          )}
          {genErrors.length > 0 && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <div className="font-medium">Документ не может быть сформирован:</div>
              <ul className="mt-1 list-inside list-disc">
                {genErrors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <h3 className="font-semibold text-emerald-900">Документы сформированы</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <DocCard title="📄 Договор пенсионного аннуитета" onDocx={() => download("contract", "docx")} onPdf={() => download("contract", "pdf")} />
            <DocCard title="📄 Доверенность" onDocx={() => download("poa", "docx")} onPdf={() => download("poa", "pdf")} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={() => setShowWarning(true)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">
              Сформировать заново
            </button>
            {!client.documents_deleted && (
              <button onClick={deleteSourceDocs} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">
                Удалить документы клиента
              </button>
            )}
          </div>
          {showWarning && (
            <div className="mt-4 rounded-lg bg-amber-50 p-4">
              <p className="text-sm text-amber-900">Документы будут сформированы заново с текущими данными.</p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => setShowWarning(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
                  Отмена
                </button>
                <button onClick={confirmAndGenerate} disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {busy ? "Формирование..." : "Подтвердить и сформировать заново"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DocCard({ title, onDocx, onPdf }: { title: string; onDocx: () => void; onPdf: () => void }) {
  return (
    <div className="rounded-lg bg-white p-4">
      <div className="font-medium text-slate-900">{title}</div>
      <div className="mt-3 flex gap-2">
        <button onClick={onDocx} className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800">
          Скачать DOCX
        </button>
        <button onClick={onPdf} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
          Скачать PDF
        </button>
      </div>
    </div>
  )
}
