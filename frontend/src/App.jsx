import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import SeniorModeToggle from './components/SeniorModeToggle'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SeniorModeProvider } from './context/SeniorModeContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import UploadPage from './pages/UploadPage'
import AnalysisPage from './pages/AnalysisPage'
import ChatPage from './pages/ChatPage'
import RagPage from './pages/RagPage'

function PrivateRoute({ children }) {
  const { isAuth } = useAuth()
  return isAuth ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { isAuth } = useAuth()
  return !isAuth ? children : <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <SeniorModeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
            <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
            <Route path="/upload" element={<PrivateRoute><UploadPage /></PrivateRoute>} />
            <Route path="/analysis/:docId" element={<PrivateRoute><AnalysisPage /></PrivateRoute>} />
            <Route path="/chat/:docId" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
            <Route path="/rag" element={<PrivateRoute><RagPage /></PrivateRoute>} />
          </Routes>
          <SeniorModeToggle />
        </BrowserRouter>
      </AuthProvider>
    </SeniorModeProvider>
  )
}
