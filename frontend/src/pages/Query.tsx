import { useState } from 'react'
import { queryService, SemanticQueryResult } from '../services/query'
import './Query.css'

interface ApiError {
  error?: string
  message?: string
}

export default function Query() {
  const [query, setQuery] = useState('')
  const [topK, setTopK] = useState(5)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SemanticQueryResult[]>([])
  const [error, setError] = useState('')

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) {
      const showToast = window.showToast
      if (showToast) showToast('请输入查询内容', 'warning')
      return
    }
    try {
      setLoading(true)
      setError('')
      setResults([])
      const data = await queryService.semantic(query.trim(), topK)
      setResults(data || [])
      if (!data || data.length === 0) {
        setError('未找到相关文档，请尝试其他关键词')
      }
    } catch (error) {
      const apiError = error as ApiError
      let errorMsg = apiError.error || apiError.message || '查询失败'
      
      // 如果是超时错误，提供更友好的提示
      if (errorMsg.includes('timeout') || errorMsg.includes('超时')) {
        errorMsg = '查询超时。首次使用需要下载模型文件（约80MB），可能需要较长时间。请检查网络连接后重试。'
      } else if (errorMsg.includes('Failed to establish') || errorMsg.includes('连接')) {
        errorMsg = '无法连接到模型服务器。请检查网络连接，或联系管理员预先下载模型文件。'
      }
      
      setError(errorMsg)
      setResults([])
      const showToast = window.showToast
      if (showToast) {
        showToast(errorMsg, 'error')
      }
      console.error('语义查询错误:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="query">
      <div className="query-header">
        <h1>语义查询</h1>
        <p>基于向量相似度的智能检索，返回最相关的知识库文档。</p>
      </div>

      <form className="query-form" onSubmit={handleSearch}>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="请输入查询问题，例如：四川高县红星村的扶贫进展？"
          rows={3}
        />
        <div className="query-actions">
          <button type="submit" disabled={loading}>
            {loading ? '查询中...' : '查询'}
          </button>
          <div className="topk-control">
            <label>返回条数</label>
            <input
              type="number"
              min={1}
              max={20}
              value={topK}
              onChange={(e) => setTopK(Math.max(1, Math.min(20, Number(e.target.value))))}
            />
          </div>
        </div>
      </form>

      <div className="query-results">
        {loading && <div className="loading">查询中...</div>}
        {!loading && error && (
          <div className="error">{error}</div>
        )}
        {!loading && !error && results.length === 0 && (
          <div className="empty">暂无结果</div>
        )}
        {!loading && !error && results.length > 0 && (
          <div className="result-list">
            {results.map((item) => (
              <div key={item.id} className="result-card">
                <div className="result-header">
                  <div className="result-title">{item.title || '未命名'}</div>
                  <div className="result-meta">
                    <span className="source-type">{item.source_type.toUpperCase()}</span>
                    <span className="source-name">{item.source_name || '-'}</span>
                    <span className="score">相似度 {item.score.toFixed(4)}</span>
                  </div>
                </div>
                <div className="result-summary">
                  {item.summary || '暂无摘要'}
                </div>
                <div className="result-footer">
                  <span>{item.created_at ? new Date(item.created_at).toLocaleString() : '-'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
