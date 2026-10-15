import axios from "axios"

export const TOKEN_KEY = "insurance_agent_token"

const api = axios.create({ baseURL: "/api" })

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem(TOKEN_KEY)
      if (!location.pathname.startsWith("/login")) {
        location.href = "/login"
      }
    }
    return Promise.reject(error)
  },
)

export default api
