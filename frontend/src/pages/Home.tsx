import { useEffect, useState } from 'react'
import { dataSourceService } from '../services/dataSource'
import './Home.css'

export default function Home() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dataSourceService.stats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="home">
      <h1>系统概览</h1>
      {loading ? (
        <div>加载中...</div>
      ) : stats ? (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>数据源总数</h3>
            <p className="stat-number">{stats.total || 0}</p>
          </div>
          <div className="stat-card">
            <h3>活跃数据源</h3>
            <p className="stat-number">{stats.active || 0}</p>
          </div>
          <div className="stat-card">
            <h3>未激活</h3>
            <p className="stat-number">{stats.inactive || 0}</p>
          </div>
        </div>
      ) : (
        <div>暂无数据</div>
      )}
    </div>
  )
}
