import { useEffect, useState, useRef } from 'react'
import { dataSourceService, DataSource } from '../services/dataSource'
import CustomSelect from '../components/CustomSelect'
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
  { name: '人民网（RSS示例）', type: 'rss' as const, url: 'http://www.people.com.cn/rss/politics.xml', description: '人民网时政新闻RSS源' },
  { name: '人民网首页（网页示例）', type: 'web' as const, url: 'https://www.people.com.cn/', description: '示例网页抓取：人民网首页要闻' }
]

export default function DataSources() {
  const [sources, setSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<DataSource | null>(null)
  const [selectedPreset, setSelectedPreset] = useState<string>('')
  const [sourceType, setSourceType] = useState<string>('rss')
  const formRef = useRef<HTMLFormElement>(null)

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
      source_type: (formData.get('source_type') as 'rss' | 'web' | 'api') || sourceType as 'rss' | 'web' | 'api',
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
      setSelectedPreset('')
      setSourceType('rss')
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
    setSourceType(source.source_type)
    setShowModal(true)
  }

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId)
    if (presetId && formRef.current) {
      const preset = PRESET_SOURCES.find(p => `${p.name}-${p.type}` === presetId)
      if (preset) {
        const nameInput = formRef.current.querySelector<HTMLInputElement>('input[name="name"]')
        const urlInput = formRef.current.querySelector<HTMLInputElement>('input[name="url"]')
        const descTextarea = formRef.current.querySelector<HTMLTextAreaElement>('textarea[name="description"]')
        
        if (nameInput) nameInput.value = preset.name
        if (urlInput) urlInput.value = preset.url
        if (descTextarea) descTextarea.value = preset.description || ''
        
        // 更新类型选择
        setSourceType(preset.type)
      }
    } else {
      setSourceType('rss')
    }
  }

  const handleSourceTypeChange = (value: string) => {
    setSourceType(value)
    if (formRef.current) {
      // 更新隐藏的 input 值
      const hiddenInput = formRef.current.querySelector<HTMLInputElement>('input[name="source_type"]')
      if (hiddenInput) {
        hiddenInput.value = value
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
          setSelectedPreset('')
          setSourceType('rss')
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? '编辑数据源' : '添加数据源'}</h2>
              <button className="modal-close" onClick={() => {
                setShowModal(false)
                setEditing(null)
                setSelectedPreset('')
                setSourceType('rss')
              }}>×</button>
            </div>
            <form ref={formRef} onSubmit={handleSubmit}>
              {!editing && (
                <div className="form-group">
                  <label>快速选择（可选）</label>
                  <CustomSelect
                    value={selectedPreset}
                    onChange={handlePresetChange}
                    options={[
                      { value: '', label: '-- 选择预设数据源 --' },
                      ...PRESET_SOURCES.map((preset) => ({
                        value: `${preset.name}-${preset.type}`,
                        label: `${preset.name} (${preset.type.toUpperCase()})`
                      }))
                    ]}
                    placeholder="-- 选择预设数据源 --"
                    className="preset-select"
                  />
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
                <input type="hidden" name="source_type" value={sourceType} />
                <CustomSelect
                  value={sourceType}
                  onChange={handleSourceTypeChange}
                  options={[
                    { value: 'rss', label: 'RSS' },
                    { value: 'web', label: '网页' },
                    { value: 'api', label: 'API（智能代理）' }
                  ]}
                  placeholder="请选择类型"
                  className="source-type-select"
                />
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
                  min={1}
                  defaultValue={editing?.fetch_interval || 3600}
                  placeholder="3600"
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => {
                  setShowModal(false)
                  setEditing(null)
                  setSelectedPreset('')
                  setSourceType('rss')
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
