import { useEffect, useState, useRef } from 'react'
import { documentService, Document, DocumentListParams } from '../services/document'
import CustomSelect, { SelectOption } from '../components/CustomSelect'
import './Documents.css'

interface ApiError {
  error?: string
  message?: string
}

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 20,
    total: 0,
    pages: 0,
    has_prev: false,
    has_next: false
  })
  const [filters, setFilters] = useState<DocumentListParams>({
    page: 1,
    per_page: 20
  })
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingDoc, setEditingDoc] = useState<Document | null>(null)
  const [editFormData, setEditFormData] = useState<{ tags: string, source_name: string, source_url: string }>({
    tags: '',
    source_name: '',
    source_url: ''
  })
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previousTotalRef = useRef<number>(0)

  useEffect(() => {
    loadDocuments()
  }, [filters])

  // 定期刷新文档列表（每5秒），如果总数发生变化则立即刷新
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await documentService.list(filters)
        if (response.pagination.total !== previousTotalRef.current) {
          // 总数发生变化，重新加载
          console.log(`文档总数变化: ${previousTotalRef.current} -> ${response.pagination.total}，重新加载`)
          previousTotalRef.current = response.pagination.total
          await loadDocuments()
        } else {
          // 只更新总数，不重新加载整个列表
          setPagination(prev => ({
            ...prev,
            total: response.pagination.total
          }))
        }
      } catch (error) {
        console.error('刷新文档列表失败:', error)
      }
    }, 5000) // 每5秒检查一次（更频繁的检查）

    return () => clearInterval(interval)
  }, [filters])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      console.log('加载文档，筛选条件:', filters)
      const response = await documentService.list(filters)
      console.log('文档列表响应:', {
        total: response.pagination.total,
        items: response.items.length,
        page: response.pagination.page,
        items_preview: response.items.slice(0, 3).map(d => ({ id: d.id, title: d.title }))
      })
      
      // 强制更新状态（使用展开运算符确保React检测到变化）
      setDocuments([...response.items])
      setPagination({ ...response.pagination })
      previousTotalRef.current = response.pagination.total
      // 列表刷新后重置勾选
      setSelectedIds([])
      
      // 如果总数大于0但items为空，可能是分页问题，尝试加载第一页
      if (response.pagination.total > 0 && response.items.length === 0 && filters.page !== 1) {
        console.warn('文档总数大于0但当前页无数据，尝试加载第一页')
        setFilters({ ...filters, page: 1 })
      }
    } catch (error) {
      console.error('加载文档失败:', error)
      const showToast = window.showToast
      if (showToast) {
        showToast('加载文档失败，请刷新页面重试', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const search = formData.get('search') as string
    setFilters({ ...filters, search: search || undefined, page: 1 })
  }

  const handleFilterChange = (key: string, value: any) => {
    setFilters({ ...filters, [key]: value || undefined, page: 1 })
  }

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page })
  }

  const handleViewDetail = async (id: number) => {
    try {
      const doc = await documentService.get(id)
      setSelectedDoc(doc)
      setShowDetail(true)
    } catch (error) {
      const apiError = error as ApiError
      alert(apiError.error || apiError.message || '获取文档详情失败')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个文档吗？')) return
    try {
      await documentService.delete(id)
      loadDocuments()
      setSelectedIds((prev) => prev.filter(pid => pid !== id))
      const showToast = window.showToast
      if (showToast) {
        showToast('文档删除成功', 'success')
      }
    } catch (error) {
      const apiError = error as ApiError
      const showToast = window.showToast
      if (showToast) {
        showToast(apiError.error || apiError.message || '删除失败', 'error')
      }
    }
  }

  const handleEdit = (doc: Document) => {
    setEditingDoc(doc)
    setEditFormData({
      tags: doc.tags?.join(', ') || '',
      source_name: doc.source_name || '',
      source_url: doc.source_url || ''
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!editingDoc) return

    try {
      const tagsArray = editFormData.tags.split(',').map(t => t.trim()).filter(t => t)
      
      await documentService.update(editingDoc.id, {
        tags: tagsArray,
        source_name: editFormData.source_name,
        source_url: editFormData.source_url
      })
      
      setShowEditModal(false)
      setEditingDoc(null)
      loadDocuments()
      
      // 如果正在查看该文档，刷新详情
      if (selectedDoc && selectedDoc.id === editingDoc.id) {
        handleViewDetail(editingDoc.id)
      }
      
      const showToast = window.showToast
      if (showToast) {
        showToast('文档元数据已更新', 'success')
      }
    } catch (error) {
      const apiError = error as ApiError
      const showToast = window.showToast
      if (showToast) {
        showToast(apiError.error || apiError.message || '更新失败', 'error')
      }
    }
  }

  const handleToggleSelectAll = () => {
    if (selectedIds.length === documents.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(documents.map(doc => doc.id))
    }
  }

  const handleToggleSelectOne = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id])
  }

  const handleBatchDeleteSelected = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`确定删除选中的 ${selectedIds.length} 个文档吗？`)) return
    try {
      await documentService.batchDelete(selectedIds)
      loadDocuments()
      setSelectedIds([])
      const showToast = window.showToast
      if (showToast) {
        showToast('选中文档已删除', 'success')
      }
    } catch (error) {
      const apiError = error as ApiError
      const showToast = window.showToast
      if (showToast) {
        showToast(apiError.error || apiError.message || '批量删除失败', 'error')
      }
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件类型
    const allowedTypes = ['.txt', '.md', '.pdf', '.docx', '.xlsx', '.xls', '.csv', '.html']
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!allowedTypes.includes(fileExt)) {
      const showToast = window.showToast
      if (showToast) {
        showToast(`不支持的文件类型: ${fileExt}，支持的类型: ${allowedTypes.join(', ')}`, 'error')
      }
      return
    }

    // 验证文件大小（16MB）
    if (file.size > 16 * 1024 * 1024) {
      const showToast = window.showToast
      if (showToast) {
        showToast('文件大小不能超过16MB', 'error')
      }
      return
    }

    try {
      setUploading(true)
      await documentService.upload(file)
      loadDocuments()
      const showToast = window.showToast
      if (showToast) {
        showToast('文件上传成功', 'success')
      }
      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      const apiError = error as ApiError
      const showToast = window.showToast
      if (showToast) {
        showToast(apiError.error || apiError.message || '上传失败', 'error')
      }
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteAll = async () => {
    if (pagination.total === 0) {
      const showToast = window.showToast
      if (showToast) {
        showToast('没有可删除的文档', 'warning')
      }
      return
    }

    if (!confirm(`确定要删除所有 ${pagination.total} 个文档吗？此操作不可恢复，请谨慎操作！`)) return

    try {
      // 获取所有文档ID
      const allDocuments = await documentService.list({ page: 1, per_page: pagination.total })
      const ids = allDocuments.items.map(doc => doc.id)
      
      if (ids.length === 0) {
        const showToast = window.showToast
        if (showToast) {
          showToast('没有可删除的文档', 'warning')
        }
        return
      }

      const result = await documentService.batchDelete(ids)
      loadDocuments()
      const showToast = window.showToast
      if (showToast) {
        showToast(result.message || `成功删除所有 ${result.deleted_count} 个文档`, 'success')
      }
    } catch (error) {
      const apiError = error as ApiError
      const showToast = window.showToast
      if (showToast) {
        showToast(apiError.error || apiError.message || '删除所有文档失败', 'error')
      }
    }
  }

  const getSourceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      rss: 'RSS',
      web: '网页'
    }
    return labels[type] || type.toUpperCase()
  }

  // 筛选选项
  const sourceTypeOptions: SelectOption[] = [
    { value: '', label: '全部类型' },
    { value: 'rss', label: 'RSS' },
    { value: 'web', label: '网页' }
  ]

  const processStatusOptions: SelectOption[] = [
    { value: '', label: '全部状态' },
    { value: 'true', label: '已处理' },
    { value: 'false', label: '未处理' }
  ]

  const vectorizedStatusOptions: SelectOption[] = [
    { value: '', label: '向量化状态' },
    { value: 'true', label: '已向量化' },
    { value: 'false', label: '未向量化' }
  ]

  return (
    <div className="documents">
      <div className="page-header">
        <h1>文档列表</h1>
        <div className="header-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.pdf,.docx,.xlsx,.xls,.csv,.html"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-upload"
            disabled={uploading}
            title="上传文件到知识库（支持 .txt, .md, .pdf, .docx, .xlsx, .csv, .html）"
          >
            {uploading ? '上传中...' : '上传文件'}
          </button>
          {selectedIds.length > 0 && (
            <button
              onClick={handleBatchDeleteSelected}
              className="btn-batch-delete"
              title={`删除选中的 ${selectedIds.length} 个文档`}
            >
              删除选中
            </button>
          )}
          {pagination.total > 0 && (
            <button 
              onClick={handleDeleteAll}
              className="btn-delete-all"
              title={`删除所有 ${pagination.total} 个文档`}
            >
              删除所有
            </button>
          )}
          <span className="total-count">共 {pagination.total} 条</span>
        </div>
      </div>

      <div className="filters-section">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            name="search"
            placeholder="搜索标题或内容..."
            defaultValue={filters.search}
            className="search-input"
          />
          <button type="submit" className="search-btn">搜索</button>
        </form>
        <div className="filter-group">
          <CustomSelect
            value={filters.source_type || ''}
            onChange={(value) => handleFilterChange('source_type', value || undefined)}
            options={sourceTypeOptions}
            placeholder="全部类型"
            className="filter-select"
          />
          <CustomSelect
            value={filters.is_processed !== undefined ? filters.is_processed.toString() : ''}
            onChange={(value) => handleFilterChange('is_processed', value ? value === 'true' : undefined)}
            options={processStatusOptions}
            placeholder="全部状态"
            className="filter-select"
          />
          <CustomSelect
            value={filters.is_vectorized !== undefined ? filters.is_vectorized.toString() : ''}
            onChange={(value) => handleFilterChange('is_vectorized', value ? value === 'true' : undefined)}
            options={vectorizedStatusOptions}
            placeholder="向量化状态"
            className="filter-select"
          />
        </div>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : documents.length === 0 ? (
        <div className="empty">暂无文档</div>
      ) : (
        <>
          <div className="select-all-row">
            <label className="select-all-label">
              <input
                type="checkbox"
                checked={selectedIds.length === documents.length && documents.length > 0}
                onChange={handleToggleSelectAll}
              />
              全选
            </label>
          </div>
          <div className="documents-list">
            {documents.map((doc) => (
              <div key={doc.id} className="document-card">
                <div className="document-header">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(doc.id)}
                    onChange={() => handleToggleSelectOne(doc.id)}
                    className="doc-checkbox"
                    title="选择文档"
                  />
                  <h3 className="document-title" onClick={() => handleViewDetail(doc.id)}>
                    {doc.title}
                  </h3>
                  <div className="document-meta">
                    <span className="source-type">{getSourceTypeLabel(doc.source_type)}</span>
                    <span className="source-name">{doc.source_name || '-'}</span>
                    <span className="created-time">
                      {new Date(doc.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                {(doc.summary || doc.content) && (
                  <div className="document-content-preview">
                    {doc.summary 
                      ? (doc.summary.length > 100 ? doc.summary.substring(0, 100) + '...' : doc.summary)
                      : (doc.content.length > 100 ? doc.content.substring(0, 100) + '...' : doc.content)
                    }
                  </div>
                )}
                <div className="document-footer">
                  <div className="document-tags">
                    {doc.tags && doc.tags.length > 0 && (
                      doc.tags.map((tag, idx) => (
                        <span key={idx} className="tag">{tag}</span>
                      ))
                    )}
                  </div>
                  <div className="document-status">
                    {doc.is_processed && <span className="status-badge processed">已处理</span>}
                    {doc.is_vectorized && <span className="status-badge vectorized">已向量化</span>}
                  </div>
                  <div className="document-actions">
                    <button onClick={() => handleViewDetail(doc.id)}>查看</button>
                    <button onClick={() => handleDelete(doc.id)} className="danger">删除</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pagination.pages > 1 && (
            <div className="pagination">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.has_prev}
              >
                上一页
              </button>
              <span className="page-info">
                第 {pagination.page} / {pagination.pages} 页
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.has_next}
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}

      {showDetail && selectedDoc && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal-content document-detail" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>文档详情</h2>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button 
                  className="btn-edit-inline"
                  onClick={() => {
                    handleEdit(selectedDoc)
                    setShowDetail(false)
                  }}
                  title="编辑元数据"
                >
                  编辑
                </button>
                <button className="modal-close" onClick={() => setShowDetail(false)}>×</button>
              </div>
            </div>
            <div className="detail-content">
              <div className="detail-card">
                <div className="detail-section">
                  <label>标题</label>
                  <div className="detail-value">{selectedDoc.title}</div>
                </div>
                <div className="detail-section">
                  <label>状态</label>
                  <div className="detail-value">
                    {selectedDoc.is_processed && <span className="status-badge processed">已处理</span>}
                    {selectedDoc.is_vectorized && <span className="status-badge vectorized">已向量化</span>}
                  </div>
                </div>
                <div className="detail-section">
                  <label>创建时间</label>
                  <div className="detail-value">
                    {new Date(selectedDoc.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="detail-section">
                  <label>来源</label>
                  <div className="detail-value">
                    {getSourceTypeLabel(selectedDoc.source_type)} - {selectedDoc.source_name || '-'}
                  </div>
                </div>
                {selectedDoc.source_url && (
                  <div className="detail-section">
                    <label>来源URL</label>
                    <div className="detail-value">
                      <a href={selectedDoc.source_url} target="_blank" rel="noopener noreferrer">
                        {selectedDoc.source_url}
                      </a>
                    </div>
                  </div>
                )}
              </div>
              {selectedDoc.summary && (
                <div className="detail-section">
                  <label>摘要</label>
                  <div className="detail-value">{selectedDoc.summary}</div>
                </div>
              )}
              <div className="detail-section">
                <label>内容</label>
                <div className="detail-value content-full">{selectedDoc.content}</div>
              </div>
              {selectedDoc.tags && selectedDoc.tags.length > 0 && (
                <div className="detail-section">
                  <label>标签</label>
                  <div className="detail-value">
                    {selectedDoc.tags.map((tag, idx) => (
                      <span key={idx} className="tag">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 编辑元数据弹窗 */}
      {showEditModal && editingDoc && (
        <div className="modal-overlay" onClick={() => {
          setShowEditModal(false)
          setEditingDoc(null)
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>编辑元数据</h2>
              <button className="modal-close" onClick={() => {
                setShowEditModal(false)
                setEditingDoc(null)
              }}>×</button>
            </div>
            <div className="detail-content">
              <div className="detail-section">
                <label>标题</label>
                <div className="detail-value">{editingDoc.title}</div>
              </div>
              <div className="detail-section">
                <label>标签（用逗号分隔）</label>
                <input
                  type="text"
                  value={editFormData.tags}
                  onChange={(e) => setEditFormData({ ...editFormData, tags: e.target.value })}
                  placeholder="例如：新闻, 时政, 国内"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: 'rgba(15, 20, 25, 0.6)',
                    border: '1px solid rgba(102, 126, 234, 0.3)',
                    borderRadius: '6px',
                    color: '#e0e0e0',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
              <div className="detail-section">
                <label>来源名称</label>
                <input
                  type="text"
                  value={editFormData.source_name}
                  onChange={(e) => setEditFormData({ ...editFormData, source_name: e.target.value })}
                  placeholder="例如：人民网"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: 'rgba(15, 20, 25, 0.6)',
                    border: '1px solid rgba(102, 126, 234, 0.3)',
                    borderRadius: '6px',
                    color: '#e0e0e0',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
              <div className="detail-section">
                <label>来源URL</label>
                <input
                  type="url"
                  value={editFormData.source_url}
                  onChange={(e) => setEditFormData({ ...editFormData, source_url: e.target.value })}
                  placeholder="https://example.com"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: 'rgba(15, 20, 25, 0.6)',
                    border: '1px solid rgba(102, 126, 234, 0.3)',
                    borderRadius: '6px',
                    color: '#e0e0e0',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
              <div className="form-actions" style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingDoc(null)
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(100, 100, 100, 0.3)',
                    border: '1px solid rgba(100, 100, 100, 0.4)',
                    borderRadius: '6px',
                    color: '#b0b0b0',
                    cursor: 'pointer'
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleSaveEdit}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%)',
                    border: '1px solid rgba(102, 126, 234, 0.4)',
                    borderRadius: '6px',
                    color: '#667eea',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
