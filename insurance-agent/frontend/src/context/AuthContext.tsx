import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import api, { TOKEN_KEY } from "../api/client"

interface AuthState {
  username: string | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = sessionStorage.getItem(TOKEN_KEY)
    if (!token) {
      setLoading(false)
      return
    }
    api
      .get("/auth/me")
      .then((r) => setUsername(r.data.username))
      .catch(() => sessionStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false))
  }, [])

  async function login(u: string, p: string) {
    const r = await api.post("/auth/login", { username: u, password: p })
    sessionStorage.setItem(TOKEN_KEY, r.data.access_token)
    setUsername(r.data.manager_username)
  }

  function logout() {
    api.post("/auth/logout").catch(() => {})
    sessionStorage.removeItem(TOKEN_KEY)
    setUsername(null)
  }

  return <AuthContext.Provider value={{ username, loading, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
