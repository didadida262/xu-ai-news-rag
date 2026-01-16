import { useEffect, useState } from 'react'
import api from '../services/api'
import './Home.css'

interface DashboardStats {
  data_sources: {
    total: number
    active: number
    inactive: number
    total_fetches: number
    total_success: number
    overall_success_rate: number
  }
  documents: {
    total: number
    processed: number
    vectorized: number
    by_source: Record<string, number>
  }
  queries: {
    total: number
    successful: number
    success_rate: number
    avg_response_time: number
  }
}

export default function Home() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/dashboard')
      .then((data: DashboardStats) => setStats(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="home">
        <div className="page-header">
          <h1>系统概览</h1>
        </div>
        <div className="loading-state">加载中...</div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="home">
        <div className="page-header">
          <h1>系统概览</h1>
        </div>
        <div className="loading-state">暂无数据</div>
      </div>
    )
  }

  return (
    <div className="home">
      <div className="page-header">
        <h1>系统概览</h1>
      </div>
      
      <div className="stats-section">
        <h2 className="section-title">数据源统计</h2>
        <div className="stats-grid">
          <div className="stat-card card-primary">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <h3>数据源总数</h3>
              <p className="stat-number">{stats.data_sources.total}</p>
              <p className="stat-desc">已配置的数据源</p>
            </div>
          </div>
          
          <div className="stat-card card-success">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <h3>活跃数据源</h3>
              <p className="stat-number">{stats.data_sources.active}</p>
              <p className="stat-desc">正在运行中</p>
            </div>
          </div>
          
          <div className="stat-card card-warning">
            <div className="stat-icon">⏸️</div>
            <div className="stat-content">
              <h3>未激活</h3>
              <p className="stat-number">{stats.data_sources.inactive}</p>
              <p className="stat-desc">已暂停</p>
            </div>
          </div>
          
          <div className="stat-card card-info">
            <div className="stat-icon">🔄</div>
            <div className="stat-content">
              <h3>总抓取次数</h3>
              <p className="stat-number">{stats.data_sources.total_fetches}</p>
              <p className="stat-desc">累计执行次数</p>
            </div>
          </div>
          
          <div className="stat-card card-success">
            <div className="stat-icon">✓</div>
            <div className="stat-content">
              <h3>成功次数</h3>
              <p className="stat-number">{stats.data_sources.total_success}</p>
              <p className="stat-desc">成功抓取</p>
            </div>
          </div>
          
          <div className="stat-card card-gradient">
            <div className="stat-icon">📈</div>
            <div className="stat-content">
              <h3>成功率</h3>
              <p className="stat-number">{stats.data_sources.overall_success_rate}%</p>
              <p className="stat-desc">整体成功率</p>
            </div>
          </div>
        </div>
      </div>

      <div className="stats-section">
        <h2 className="section-title">文档统计</h2>
        <div className="stats-grid">
          <div className="stat-card card-primary">
            <div className="stat-icon">📄</div>
            <div className="stat-content">
              <h3>文档总数</h3>
              <p className="stat-number">{stats.documents.total}</p>
              <p className="stat-desc">已存储的文档</p>
            </div>
          </div>
          
          <div className="stat-card card-info">
            <div className="stat-icon">⚙️</div>
            <div className="stat-content">
              <h3>已处理</h3>
              <p className="stat-number">{stats.documents.processed}</p>
              <p className="stat-desc">已完成处理</p>
            </div>
          </div>
          
          <div className="stat-card card-gradient">
            <div className="stat-icon">🔍</div>
            <div className="stat-content">
              <h3>已向量化</h3>
              <p className="stat-number">{stats.documents.vectorized}</p>
              <p className="stat-desc">可用于检索</p>
            </div>
          </div>
        </div>
      </div>

      <div className="stats-section">
        <h2 className="section-title">查询统计</h2>
        <div className="stats-grid">
          <div className="stat-card card-primary">
            <div className="stat-icon">🔎</div>
            <div className="stat-content">
              <h3>总查询数</h3>
              <p className="stat-number">{stats.queries.total}</p>
              <p className="stat-desc">累计查询次数</p>
            </div>
          </div>
          
          <div className="stat-card card-success">
            <div className="stat-icon">✓</div>
            <div className="stat-content">
              <h3>成功查询</h3>
              <p className="stat-number">{stats.queries.successful}</p>
              <p className="stat-desc">成功返回结果</p>
            </div>
          </div>
          
          <div className="stat-card card-gradient">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <h3>查询成功率</h3>
              <p className="stat-number">{stats.queries.success_rate}%</p>
              <p className="stat-desc">查询成功比例</p>
            </div>
          </div>
          
          <div className="stat-card card-info">
            <div className="stat-icon">⚡</div>
            <div className="stat-content">
              <h3>平均响应时间</h3>
              <p className="stat-number">{stats.queries.avg_response_time}ms</p>
              <p className="stat-desc">查询响应速度</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
