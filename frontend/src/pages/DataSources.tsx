import { useEffect, useState } from 'react'
import { dataSourceService, DataSource } from '../services/dataSource'
import './DataSources.css'

export default function DataSources() {
  const [sources, setSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<DataSource | null>(null)

  useEffect(() => {
    loadSources()
  }, [])

  const loadSources = async () => {
    try {
      const data = await dataSourceService.list()
      setSources(data)
    } catch (error) {
      console.error('加载数据源失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFetch = async (id: number) => {
    try {
      await dataSourceService.fetch(id)
      alert('抓取任务已启动')
    } catch (error: any) {
      alert(error.error || '启动失败')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个数据源吗？')) return
    try {
      await dataSourceService.delete(id)
      loadSources()
    } catch (error: any) {
      alert(error.error || '删除失败')
    }
  }

  const toggleActive = async (source: DataSource) => {
    try {
      await dataSourceService.update(source.id, { is_active: !source.is_active })
      loadSources()
    } catch (error: any) {
      alert(error.error || '更新失败')
    }
  }

  if (loading) return <div>加载中...</div>

  return (
    <div className="data-sources">
      <div className="page-header">
        <h1>数据源管理</h1>
        <button onClick={() => setShowModal(true)}>添加数据源</button>
      </div>

      <table className="sources-table">
        <thead>
          <tr>
            <th>名称</th>
            <th>类型</th>
            <th>URL</th>
            <th>状态</th>
            <th>抓取次数</th>
            <th>成功率</th>
            <th>最后抓取</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((source) => (
            <tr key={source.id}>
              <td>{source.name}</td>
              <td>{source.source_type.toUpperCase()}</td>
              <td className="url-cell">{source.url}</td>
              <td>
                <span className={`status ${source.is_active ? 'active' : 'inactive'}`}>
                  {source.is_active ? '激活' : '未激活'}
                </span>
              </td>
              <td>{source.fetch_count}</td>
              <td>
                {source.fetch_count > 0
                  ? ((source.success_count / source.fetch_count) * 100).toFixed(1) + '%'
                  : '-'}
              </td>
              <td>{source.last_fetch ? new Date(source.last_fetch).toLocaleString() : '-'}</td>
              <td>
                <div className="actions">
                  <button onClick={() => handleFetch(source.id)}>抓取</button>
                  <button onClick={() => toggleActive(source)}>
                    {source.is_active ? '停用' : '启用'}
                  </button>
                  <button onClick={() => handleDelete(source.id)} className="danger">删除</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {sources.length === 0 && <div className="empty">暂无数据源</div>}
    </div>
  )
}
