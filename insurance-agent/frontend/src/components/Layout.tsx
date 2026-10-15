import { Link, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

const NAV = [
  { to: "/", label: "Дашборд" },
  { to: "/clients", label: "История клиентов" },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { username, logout } = useAuth()
  const location = useLocation()

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white text-sm font-semibold">СП</span>
              <span className="font-semibold text-slate-900">Страховой помощник</span>
            </Link>
            <nav className="flex gap-1">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    location.pathname === n.to ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span>{username}</span>
            <button onClick={logout} className="rounded-md border border-slate-200 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100">
              Выйти
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  )
}
