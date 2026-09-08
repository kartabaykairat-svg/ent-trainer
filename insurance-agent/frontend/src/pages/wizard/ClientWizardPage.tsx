import { useCallback, useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import api from "../../api/client"
import type { ClientDetail } from "../../api/types"
import Layout from "../../components/Layout"
import CalculationStep from "./CalculationStep"
import ConfirmStep from "./ConfirmStep"
import InsuranceStep from "./InsuranceStep"
import ReviewStep from "./ReviewStep"
import UploadStep from "./UploadStep"

const STEPS = [
  { key: "upload", label: "1. Документы" },
  { key: "review", label: "2. Проверка данных" },
  { key: "insurance", label: "3. Параметры страхования" },
  { key: "calc", label: "4. Расчёт и график" },
  { key: "confirm", label: "5. Подтверждение и документы" },
]

export default function ClientWizardPage() {
  const { id } = useParams<{ id: string }>()
  const [client, setClient] = useState<ClientDetail | null>(null)
  const [step, setStep] = useState("upload")
  const [error, setError] = useState("")

  const refresh = useCallback(async () => {
    if (!id) return
    try {
      const r = await api.get<ClientDetail>(`/clients/${id}`)
      setClient(r.data)
    } catch {
      setError("Не удалось загрузить данные клиента")
    }
  }, [id])

  useEffect(() => {
    refresh()
  }, [refresh])

  if (error) {
    return (
      <Layout>
        <p className="text-red-600">{error}</p>
      </Layout>
    )
  }
  if (!client || !id) {
    return (
      <Layout>
        <p className="text-slate-400">Загрузка...</p>
      </Layout>
    )
  }

  const conflictCount = client.data.conflicts.filter((c) => !c.resolved).length

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {client.data.c1.full_name || "Новый клиент"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            ИИН {client.masked_iin || "—"} · {client.second_insurer ? "Два страхователя" : "Один страхователь"}
          </p>
        </div>
        {client.needs_review && (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
            Требует проверки
          </span>
        )}
      </div>

      <div className="mb-6 flex flex-wrap gap-1 border-b border-slate-200">
        {STEPS.map((s) => (
          <button
            key={s.key}
            onClick={() => setStep(s.key)}
            className={`relative rounded-t-lg px-4 py-2.5 text-sm font-medium ${
              step === s.key ? "bg-white text-slate-900 border border-b-white border-slate-200" : "text-slate-500 hover:text-slate-800"
            }`}
            style={step === s.key ? { marginBottom: -1 } : {}}
          >
            {s.label}
            {s.key === "review" && conflictCount > 0 && (
              <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                {conflictCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {step === "upload" && <UploadStep client={client} onChange={refresh} onNext={() => setStep("review")} />}
      {step === "review" && <ReviewStep client={client} onChange={refresh} onNext={() => setStep("insurance")} />}
      {step === "insurance" && <InsuranceStep client={client} onChange={refresh} onNext={() => setStep("calc")} />}
      {step === "calc" && <CalculationStep client={client} onChange={refresh} onNext={() => setStep("confirm")} />}
      {step === "confirm" && <ConfirmStep client={client} onChange={refresh} />}
    </Layout>
  )
}
