import { useEffect, useState, useRef } from 'react'
import { dataSourceService, DataSource } from '../services/dataSource'
import './DataSources.css'

interface ApiError {
  error?: string
  message?: string
}

declare global {
  interface Window {
    showToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info', duration?: number) => void
  }
}

// 预设数据源模板
const PRESET_SOURCES = [
  { name: '新浪新闻', type: 'rss' as const, url: 'http://rss.sina.com.cn/news/china.xml', description: '新浪新闻国内新闻RSS源' },
  { name: '网易新闻', type: 'rss' as const, url: 'http://news.163.com/special/00011K6L/rss_newstop.xml', description: '网易新闻头条RSS源' },
  { name: '腾讯新闻', type: 'rss' as const, url: 'http://news.qq.com/newsgn/rss_newsgn.xml', description: '腾讯新闻国内新闻RSS源' },
  { name: '新华网', type: 'rss' as const, url: 'http://www.xinhuanet.com/rss.xml', description: '新华网RSS新闻源' },
  { name: '人民网', type: 'rss' as const, url: 'http://www.people.com.cn/rss/politics.xml', description: '人民网时政新闻RSS源' },
]

export default function DataSources() {
  const [sources, setSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<DataSource | null>(null)
  const [selectedPreset, setSelectedPreset] = useState<string>('')
  const refreshIntervalsRef = useRef<Map<number, ReturnType<typeof setInterval>>>(new Map())

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
      // 清除该数据源之前的刷新定时器（如果存在）
      const existingInterval = refreshIntervalsRef.current.get(id)
      if (existingInterval) {
        clearInterval(existingInterval)
      }
      
      // 查找当前数据源
      const currentSource = sources.find(s => s.id === id)
      if (!currentSource) {
        const showToast = window.showToast
        if (showToast) {
          showToast('数据源不存在', 'error')
        }
        return
      }
      
      // 如果数据源未激活，先启用它
      if (!currentSource.is_active) {
        const showToast = window.showToast
        if (showToast) {
          showToast('数据源未激活，正在自动启用...', 'info', 2000)
        }
        
        try {
          await dataSourceService.update(id, { is_active: true })
          if (showToast) {
            showToast('数据源已启用', 'success', 2000)
          }
          // 刷新数据源列表
          await loadSources()
        } catch (error) {
          const apiError = error as ApiError
          const showToast = window.showToast
          if (showToast) {
            showToast(apiError.error || apiError.message || '启用失败', 'error')
          }
          return
        }
      }
      
      // 执行抓取
      const showToast = window.showToast
      if (showToast) {
        showToast('正在启动抓取任务...', 'info', 2000)
      }
      
      await dataSourceService.fetch(id)
      
      if (showToast) {
        showToast('抓取任务已启动', 'success')
      }
      
      // 记录当前抓取次数，用于检测数据是否已更新
      const updatedSource = sources.find(s => s.id === id)
      const initialFetchCount = updatedSource?.fetch_count || 0
      const initialLastFetch = updatedSource?.last_fetch
      
      // 立即刷新一次
      await loadSources()
      
      // 每2秒刷新一次，直到数据更新或达到最大刷新时间（60秒）
      let refreshCount = 0
      const maxRefreshes = 30 // 30次 × 2秒 = 60秒
      
      const interval = setInterval(async () => {
        refreshCount++
        await loadSources()
        
        // 检查数据是否已更新（抓取次数增加或最后抓取时间变化）
        const updatedSources = await dataSourceService.list()
        const updatedSource = updatedSources.find(s => s.id === id)
        
        if (updatedSource) {
          const fetchCountUpdated = updatedSource.fetch_count > initialFetchCount
          const lastFetchUpdated = updatedSource.last_fetch !== initialLastFetch
          
          if (fetchCountUpdated || lastFetchUpdated) {
            // 数据已更新，停止刷新
            clearInterval(interval)
            refreshIntervalsRef.current.delete(id)
            const showToast = window.showToast
            if (showToast) {
              showToast('抓取完成', 'success')
            }
          } else if (refreshCount >= maxRefreshes) {
            // 达到最大刷新次数，停止刷新
            clearInterval(interval)
            refreshIntervalsRef.current.delete(id)
          }
        }
      }, 2000)
      
      refreshIntervalsRef.current.set(id, interval)
    } catch (error) {
      const apiError = error as ApiError
      const showToast = window.showToast
      if (showToast) {
        showToast(apiError.error || apiError.message || '启动失败', 'error')
      }
    }
  }
  
  // 组件卸载时清除所有定时器
  useEffect(() => {
    const intervals = refreshIntervalsRef.current
    return () => {
      intervals.forEach(interval => clearInterval(interval))
      intervals.clear()
    }
  }, [])

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个数据源吗？')) return
    try {
      await dataSourceService.delete(id)
      const showToast = window.showToast
      if (showToast) {
        showToast('数据源已删除', 'success')
      }
      loadSources()
    } catch (error) {
      const apiError = error as ApiError
      const showToast = window.showToast
      if (showToast) {
        showToast(apiError.error || apiError.message || '删除失败', 'error')
      }
    }
  }

  const toggleActive = async (source: DataSource) => {
    try {
      await dataSourceService.update(source.id, { is_active: !source.is_active })
      const showToast = window.showToast
      if (showToast) {
        showToast(source.is_active ? '数据源已停用' : '数据源已启用', 'success')
      }
      loadSources()
    } catch (error) {
      const apiError = error as ApiError
      const showToast = window.showToast
      if (showToast) {
        showToast(apiError.error || apiError.message || '更新失败', 'error')
      }
    }
  }


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      source_type: formData.get('source_type') as 'rss' | 'web' | 'api',
      url: formData.get('url') as string,
      description: formData.get('description') as string || '',
      fetch_interval: parseInt(formData.get('fetch_interval') as string) || 3600,
    }

    try {
      if (editing) {
        await dataSourceService.update(editing.id, data)
      } else {
        await dataSourceService.create(data)
      }
      setShowModal(false)
      setEditing(null)
      const showToast = window.showToast
      if (showToast) {
        showToast(editing ? '数据源已更新' : '数据源已创建', 'success')
      }
      loadSources()
    } catch (error) {
      const apiError = error as ApiError
      const showToast = window.showToast
      if (showToast) {
        showToast(apiError.error || apiError.message || '操作失败', 'error')
      }
    }
  }

  const handleEdit = (source: DataSource) => {
    setEditing(source)
    setSelectedPreset('')
    setShowModal(true)
  }

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetId = e.target.value
    setSelectedPreset(presetId)
    if (presetId) {
      const preset = PRESET_SOURCES.find(p => `${p.name}-${p.type}` === presetId)
      if (preset) {
        const form = e.target.closest('form')
        if (form) {
          const nameInput = form.querySelector<HTMLInputElement>('input[name="name"]')
          const typeSelect = form.querySelector<HTMLSelectElement>('select[name="source_type"]')
          const urlInput = form.querySelector<HTMLInputElement>('input[name="url"]')
          const descTextarea = form.querySelector<HTMLTextAreaElement>('textarea[name="description"]')
          
          if (nameInput) nameInput.value = preset.name
          if (typeSelect) typeSelect.value = preset.type
          if (urlInput) urlInput.value = preset.url
          if (descTextarea) descTextarea.value = preset.description
        }
      }
    }
  }

  if (loading) return <div>加载中...</div>

  return (
    <div className="data-sources">
      <div className="page-header">
        <h1>数据源管理</h1>
        <button onClick={() => {
          setEditing(null)
          setSelectedPreset('')
          setShowModal(true)
        }}>添加数据源</button>
      </div>

      <div className="table-wrapper">
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
                    <button 
                      className="btn-fetch" 
                      onClick={() => handleFetch(source.id)}
                      title="立即抓取该数据源的内容"
                    >
                      抓取
                    </button>
                    <button 
                      className={`btn-edit ${source.is_active ? 'disabled' : ''}`}
                      onClick={() => !source.is_active && handleEdit(source)}
                      disabled={source.is_active}
                      title={source.is_active ? '数据源已启用，请先停用后再编辑' : '编辑数据源配置信息'}
                    >
                      编辑
                    </button>
                    <button 
                      className={source.is_active ? "btn-disable" : "btn-enable"}
                      onClick={() => toggleActive(source)}
                      title={source.is_active ? "停用该数据源，停止自动抓取" : "启用该数据源，恢复自动抓取"}
                    >
                      {source.is_active ? '停用' : '启用'}
                    </button>
                    <button 
                      className="btn-delete danger" 
                      onClick={() => handleDelete(source.id)}
                      title="删除该数据源（不可恢复）"
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sources.length === 0 && <div className="empty">暂无数据源</div>}

      {showModal && (
        <div className="modal-overlay" onClick={() => {
          setShowModal(false)
          setEditing(null)
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? '编辑数据源' : '添加数据源'}</h2>
              <button className="modal-close" onClick={() => {
                setShowModal(false)
                setEditing(null)
              }}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              {!editing && (
                <div className="form-group">
                  <label>快速选择（可选）</label>
                  <select 
                    value={selectedPreset} 
                    onChange={handlePresetChange}
                    className="preset-select"
                  >
                    <option value="">-- 选择预设数据源 --</option>
                    {PRESET_SOURCES.map((preset) => (
                      <option key={`${preset.name}-${preset.type}`} value={`${preset.name}-${preset.type}`}>
                        {preset.name} ({preset.type.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label>名称 *</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editing?.name || ''}
                  placeholder="例如：新浪新闻"
                />
              </div>
              <div className="form-group">
                <label>类型 *</label>
                <select name="source_type" required defaultValue={editing?.source_type || 'rss'}>
                  <option value="rss">RSS</option>
                  <option value="web">网页</option>
                  <option value="api">API（智能代理）</option>
                </select>
              </div>
              <div className="form-group">
                <label>URL *</label>
                <input
                  type="url"
                  name="url"
                  required
                  defaultValue={editing?.url || ''}
                  placeholder="https://example.com/rss.xml"
                />
              </div>
              <div className="form-group">
                <label>描述</label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={editing?.description || ''}
                  placeholder="数据源描述（可选）"
                />
              </div>
              <div className="form-group">
                <label>抓取间隔（秒）</label>
                <input
                  type="number"
                  name="fetch_interval"
                  min={60}
                  defaultValue={editing?.fetch_interval || 3600}
                  placeholder="3600"
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => {
                  setShowModal(false)
                  setEditing(null)
                }}>取消</button>
                <button type="submit">{editing ? '更新' : '创建'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
