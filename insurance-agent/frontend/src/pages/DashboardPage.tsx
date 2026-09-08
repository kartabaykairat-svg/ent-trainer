import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import api from "../api/client"
import type { DashboardStats } from "../api/types"
import Layout from "../components/Layout"
import StatCard from "../components/StatCard"

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)

  useEffect(() => {
    api.get<DashboardStats>("/dashboard").then((r) => setStats(r.data))
  }, [])

  return (
    <Layout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Страховой помощник</h1>
          <p className="mt-1 text-slate-500">Автоматическое заполнение договоров и документов клиента</p>
        </div>
        <Link
          to="/clients/new"
          className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
        >
          + Создать нового клиента
        </Link>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Клиентов сегодня" value={stats.clients_today} />
          <StatCard label="Сформировано договоров" value={stats.contracts_generated} />
          <StatCard label="Сформировано доверенностей" value={stats.poa_generated} />
          <StatCard label="Требуют проверки" value={stats.needs_review} tone="warning" />
          <StatCard label="Ошибок распознавания" value={stats.recognition_errors} tone="danger" />
        </div>
      )}

      <div className="mt-10 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold text-slate-900">Как это работает</h2>
        <ol className="mt-3 space-y-2 text-sm text-slate-600 list-decimal list-inside">
          <li>Загрузите документы клиента (удостоверение личности, адрес, при необходимости — доп. документы).</li>
          <li>AI автоматически распознает документы и извлекает персональные данные.</li>
          <li>Проверьте найденные данные и разрешите противоречия, если они есть.</li>
          <li>Заполните параметры страхования и, при необходимости, выполните расчёт.</li>
          <li>Подтвердите данные и сформируйте готовые договор и доверенность.</li>
        </ol>
      </div>
    </Layout>
  )
}
