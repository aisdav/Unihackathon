import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

// Auth
export const register = (data) => api.post('/auth/register', data)
export const login = (data) => api.post('/auth/login', data)

// Documents
export const uploadDocument = (file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/documents/upload', form)
}
export const getDocuments = () => api.get('/documents/')
export const getDocument = (id) => api.get(`/documents/${id}`)

// Analysis
export const startAnalysis = (docId) => api.post(`/analysis/${docId}`)
export const getAnalysis = (docId) => api.get(`/analysis/${docId}`)
export const getImprovedText = (docId) => api.get(`/analysis/${docId}/improved`)
export const getExampleTz = (docId, domain) => api.get(`/analysis/${docId}/example`, { params: { domain } })

// Chat
export const sendChatMessage = (docId, content) => api.post(`/chat/${docId}`, { content })
export const getChatHistory = (docId) => api.get(`/chat/${docId}/history`)

// Reports
export const downloadReport = (docId) => api.get(`/reports/${docId}/pdf`, { responseType: 'blob' })
