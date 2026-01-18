import { useEffect, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar, Pie, Line } from 'react-chartjs-2'
import { analysisService, AnalysisParams, Keyword, SourceDistribution, TimeTrend } from '../services/analysis'
import './Analysis.css'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface ApiError {
  error?: string
  message?: string
}

export default function Analysis() {
  const [loading, setLoading] = useState(true)
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [sourceDistribution, setSourceDistribution] = useState<SourceDistribution[]>([])
  const [timeTrend, setTimeTrend] = useState<TimeTrend[]>([])
  const [totalDocuments, setTotalDocuments] = useState(0)
  
  const [filters, setFilters] = useState<AnalysisParams>({
    start_date: undefined,
    end_date: undefined,
    source_type: undefined,
  })

  const loadAnalysisData = async () => {
    setLoading(true)
    try {
      const overview = await analysisService.getOverview({
        ...filters,
        top_k: 10,
      })
      setKeywords(overview.keywords)
      setSourceDistribution(overview.source_distribution)
      setTimeTrend(overview.time_trend)
      setTotalDocuments(overview.total_documents)
    } catch (error) {
      const apiError = error as ApiError
      alert(apiError.error || apiError.message || '加载分析数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnalysisData()
  }, [])

  const handleFilterChange = (key: keyof AnalysisParams, value: string | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }))
  }

  const handleApplyFilters = () => {
    loadAnalysisData()
  }

  const handleResetFilters = () => {
    setFilters({
      start_date: undefined,
      end_date: undefined,
      source_type: undefined,
    })
    setTimeout(() => {
      loadAnalysisData()
    }, 100)
  }

  // 关键词柱状图数据
  const keywordsChartData = {
    labels: keywords.map(k => k.word),
    datasets: [
      {
        label: '出现次数',
        data: keywords.map(k => k.count),
        backgroundColor: 'rgba(102, 126, 234, 0.6)',
        borderColor: 'rgba(102, 126, 234, 1)',
        borderWidth: 1,
      },
    ],
  }

  // 来源分布饼图数据
  const sourceChartData = {
    labels: sourceDistribution.map(s => {
      const labels: Record<string, string> = {
        rss: 'RSS',
        web: '网页',
        api: 'API',
        upload: '上传',
      }
      return `${labels[s.source_type] || s.source_type} (${s.count})`
    }),
    datasets: [
      {
        data: sourceDistribution.map(s => s.count),
        backgroundColor: [
          'rgba(102, 126, 234, 0.6)',
          'rgba(118, 75, 162, 0.6)',
          'rgba(240, 147, 251, 0.6)',
          'rgba(52, 152, 219, 0.6)',
        ],
        borderColor: [
          'rgba(102, 126, 234, 1)',
          'rgba(118, 75, 162, 1)',
          'rgba(240, 147, 251, 1)',
          'rgba(52, 152, 219, 1)',
        ],
        borderWidth: 1,
      },
    ],
  }

  // 时间趋势折线图数据
  const timeTrendChartData = {
    labels: timeTrend.map(t => t.date),
    datasets: [
      {
        label: '文档数量',
        data: timeTrend.map(t => t.count),
        borderColor: 'rgba(102, 126, 234, 1)',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#e0e0e0',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(20, 25, 35, 0.9)',
        titleColor: '#fff',
        bodyColor: '#e0e0e0',
        borderColor: 'rgba(102, 126, 234, 0.5)',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#a0a0a0',
        },
        grid: {
          color: 'rgba(102, 126, 234, 0.1)',
        },
      },
      y: {
        ticks: {
          color: '#a0a0a0',
        },
        grid: {
          color: 'rgba(102, 126, 234, 0.1)',
        },
      },
    },
  }

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: '#e0e0e0',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(20, 25, 35, 0.9)',
        titleColor: '#fff',
        bodyColor: '#e0e0e0',
        borderColor: 'rgba(102, 126, 234, 0.5)',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            const label = context.label || ''
            const value = context.parsed || 0
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
            const percentage = ((value / total) * 100).toFixed(1)
            return `${label}: ${value} (${percentage}%)`
          },
        },
      },
    },
  }

  if (loading) {
    return (
      <div className="analysis">
        <div className="loading-state">加载中...</div>
      </div>
    )
  }

  return (
    <div className="analysis">
      <div className="page-header">
        <h1>数据分析</h1>
        <div className="header-info">
          <span className="total-count">总文档数: {totalDocuments}</span>
        </div>
      </div>

      <div className="filters-section">
        <div className="filter-group">
          <label>开始日期</label>
          <input
            type="date"
            value={filters.start_date || ''}
            onChange={(e) => handleFilterChange('start_date', e.target.value)}
            className="filter-input"
          />
        </div>
        <div className="filter-group">
          <label>结束日期</label>
          <input
            type="date"
            value={filters.end_date || ''}
            onChange={(e) => handleFilterChange('end_date', e.target.value)}
            className="filter-input"
          />
        </div>
        <div className="filter-group">
          <label>来源类型</label>
          <select
            value={filters.source_type || ''}
            onChange={(e) => handleFilterChange('source_type', e.target.value as any)}
            className="filter-select"
          >
            <option value="">全部</option>
            <option value="rss">RSS</option>
            <option value="web">网页</option>
            <option value="api">API</option>
            <option value="upload">上传</option>
          </select>
        </div>
        <div className="filter-actions">
          <button onClick={handleApplyFilters} className="btn-apply">应用筛选</button>
          <button onClick={handleResetFilters} className="btn-reset">重置</button>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h2 className="chart-title">关键词Top10分布</h2>
          <div className="chart-container">
            {keywords.length > 0 ? (
              <Bar data={keywordsChartData} options={chartOptions} />
            ) : (
              <div className="empty-chart">暂无数据</div>
            )}
          </div>
        </div>

        <div className="chart-card">
          <h2 className="chart-title">来源分布统计</h2>
          <div className="chart-container">
            {sourceDistribution.length > 0 ? (
              <Pie data={sourceChartData} options={pieChartOptions} />
            ) : (
              <div className="empty-chart">暂无数据</div>
            )}
          </div>
        </div>

        <div className="chart-card chart-card-full">
          <h2 className="chart-title">时间趋势分析</h2>
          <div className="chart-container">
            {timeTrend.length > 0 ? (
              <Line data={timeTrendChartData} options={chartOptions} />
            ) : (
              <div className="empty-chart">暂无数据</div>
            )}
          </div>
        </div>
      </div>

      {keywords.length > 0 && (
        <div className="keywords-table-section">
          <h2 className="section-title">关键词详情</h2>
          <div className="keywords-table-wrapper">
            <table className="keywords-table">
              <thead>
                <tr>
                  <th>排名</th>
                  <th>关键词</th>
                  <th>出现次数</th>
                  <th>频率 (%)</th>
                </tr>
              </thead>
              <tbody>
                {keywords.map((keyword, index) => (
                  <tr key={keyword.word}>
                    <td>{index + 1}</td>
                    <td>{keyword.word}</td>
                    <td>{keyword.count}</td>
                    <td>{keyword.frequency.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
