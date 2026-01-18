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
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [showDetail, setShowDetail] = useState(false)
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
      web: '网页',
      api: 'API',
      upload: '上传'
    }
    return labels[type] || type.toUpperCase()
  }

  // 筛选选项
  const sourceTypeOptions: SelectOption[] = [
    { value: '', label: '全部类型' },
    { value: 'rss', label: 'RSS' },
    { value: 'web', label: '网页' },
    { value: 'api', label: 'API' },
    { value: 'upload', label: '上传' }
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
          <div className="documents-list">
            {documents.map((doc) => (
              <div key={doc.id} className="document-card">
                <div className="document-header">
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
              <button className="modal-close" onClick={() => setShowDetail(false)}>×</button>
            </div>
            <div className="detail-content">
              <div className="detail-section">
                <label>标题</label>
                <div className="detail-value">{selectedDoc.title}</div>
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
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
