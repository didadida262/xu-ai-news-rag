import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './Layout.css'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <h1>智能新闻RAG系统</h1>
          <div className="header-actions">
            <span className="username">欢迎, {user?.username}</span>
            <button onClick={handleLogout}>退出</button>
          </div>
        </div>
      </header>
      <div className="layout-body">
        <nav className="sidebar">
          <Link to="/" className={`nav-item ${isActive('/') && location.pathname === '/' ? 'active' : ''}`}>
            首页
          </Link>
          <Link to="/data-sources" className={`nav-item ${isActive('/data-sources') ? 'active' : ''}`}>
            数据源管理
          </Link>
          <Link to="/documents" className={`nav-item ${isActive('/documents') ? 'active' : ''}`}>
            文档列表
          </Link>
          <Link to="/query" className={`nav-item ${isActive('/query') ? 'active' : ''}`}>
            语义查询
          </Link>
          <Link to="/analysis" className={`nav-item ${isActive('/analysis') ? 'active' : ''}`}>
            数据分析
          </Link>
        </nav>
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
