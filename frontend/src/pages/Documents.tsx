import { useEffect, useState } from 'react'
import { documentService, Document, DocumentListParams } from '../services/document'
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

  useEffect(() => {
    loadDocuments()
  }, [filters])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      const response = await documentService.list(filters)
      setDocuments(response.items)
      setPagination(response.pagination)
    } catch (error) {
      console.error('加载文档失败:', error)
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
    } catch (error) {
      const apiError = error as ApiError
      alert(apiError.error || apiError.message || '删除失败')
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

  return (
    <div className="documents">
      <div className="page-header">
        <h1>文档列表</h1>
        <div className="header-actions">
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
          <select
            value={filters.source_type || ''}
            onChange={(e) => handleFilterChange('source_type', e.target.value)}
            className="filter-select"
          >
            <option value="">全部类型</option>
            <option value="rss">RSS</option>
            <option value="web">网页</option>
            <option value="api">API</option>
            <option value="upload">上传</option>
          </select>
          <select
            value={filters.is_processed !== undefined ? filters.is_processed.toString() : ''}
            onChange={(e) => handleFilterChange('is_processed', e.target.value ? e.target.value === 'true' : undefined)}
            className="filter-select"
          >
            <option value="">全部状态</option>
            <option value="true">已处理</option>
            <option value="false">未处理</option>
          </select>
          <select
            value={filters.is_vectorized !== undefined ? filters.is_vectorized.toString() : ''}
            onChange={(e) => handleFilterChange('is_vectorized', e.target.value ? e.target.value === 'true' : undefined)}
            className="filter-select"
          >
            <option value="">向量化状态</option>
            <option value="true">已向量化</option>
            <option value="false">未向量化</option>
          </select>
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
                {doc.summary && (
                  <p className="document-summary">{doc.summary}</p>
                )}
                <div className="document-content-preview">
                  {doc.content.substring(0, 200)}
                  {doc.content.length > 200 && '...'}
                </div>
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
