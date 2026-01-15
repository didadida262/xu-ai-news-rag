import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import Loading from './components/Loading'
import Login from './pages/Login'
import Home from './pages/Home'
import DataSources from './pages/DataSources'
import Documents from './pages/Documents'
import Query from './pages/Query'
import Analysis from './pages/Analysis'
import './App.css'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  
  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>加载中...</div>
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

function AppContent() {
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const prevLocationRef = useRef(location.pathname)
  const isInitialMount = useRef(true)

  useEffect(() => {
    // 跳过首次渲染
    if (isInitialMount.current) {
      isInitialMount.current = false
      prevLocationRef.current = location.pathname
      return
    }

    // 路由变化时显示loading
    if (prevLocationRef.current !== location.pathname) {
      setLoading(true)
      prevLocationRef.current = location.pathname
      
      // 设置一个较短的延迟，确保页面切换有视觉反馈
      const timer = setTimeout(() => {
        setLoading(false)
      }, 300)

      return () => {
        clearTimeout(timer)
        setLoading(false)
      }
    }
  }, [location.pathname])

  return (
    <>
      <Routes location={location}>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Home />} />
          <Route path="data-sources" element={<DataSources />} />
          <Route path="documents" element={<Documents />} />
          <Route path="query" element={<Query />} />
          <Route path="analysis" element={<Analysis />} />
        </Route>
      </Routes>
    </>
  )
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App
