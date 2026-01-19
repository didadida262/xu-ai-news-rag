import { useState, useEffect } from 'react'
import './Architecture.css'

const nodes = [
  {
    id: 'frontend',
    title: '前端（React）',
    desc: '路由、UI、Toast、表单、列表与图表',
    role: '用户入口，调用后端 API'
  },
  {
    id: 'backend',
    title: '后端（Flask API）',
    desc: '认证、数据源管理、文档、分析接口',
    role: '处理请求，落库，调度任务'
  },
  {
    id: 'celery',
    title: 'Celery Worker',
    desc: '定时/异步任务：RSS、网页、Agent 抓取',
    role: '从队列取任务，抓取并写库'
  },
  {
    id: 'redis',
    title: 'Redis（Broker）',
    desc: 'Celery 消息中间件/结果存储',
    role: '连接后端与 Worker 的任务队列'
  },
  {
    id: 'mysql',
    title: 'MySQL 数据库',
    desc: '用户、数据源、文档、分析结果存储',
    role: '所有核心业务数据'
  }
]

const flowSteps = [
  {
    step: 1,
    title: '用户点击"抓取"按钮',
    activeNodes: ['frontend'],
    activeEdges: [],
    description: '前端：用户触发抓取操作，准备发送请求'
  },
  {
    step: 2,
    title: '前端发送 HTTP 请求',
    activeNodes: ['frontend', 'backend'],
    activeEdges: ['frontend-backend'],
    description: '前端 → 后端：POST /api/data-sources/{id}/fetch'
  },
  {
    step: 3,
    title: '后端接收请求并验证',
    activeNodes: ['backend', 'mysql'],
    activeEdges: ['backend-mysql'],
    description: '后端：验证数据源状态，检查是否激活'
  },
  {
    step: 4,
    title: '后端推送任务到 Redis',
    activeNodes: ['backend', 'redis'],
    activeEdges: ['backend-redis'],
    description: '后端 → Redis：将抓取任务放入消息队列'
  },
  {
    step: 5,
    title: 'Celery Worker 拉取任务',
    activeNodes: ['celery', 'redis'],
    activeEdges: ['celery-redis'],
    description: 'Redis → Celery：Worker 从队列中获取任务'
  },
  {
    step: 6,
    title: 'Worker 执行抓取任务',
    activeNodes: ['celery'],
    activeEdges: [],
    description: 'Celery：执行 RSS/网页/Agent 抓取，获取文章数据'
  },
  {
    step: 7,
    title: 'Worker 写入抓取结果',
    activeNodes: ['celery', 'mysql'],
    activeEdges: ['celery-mysql'],
    description: 'Celery → MySQL：保存文章到数据库，更新数据源状态'
  },
  {
    step: 8,
    title: '前端轮询获取更新',
    activeNodes: ['frontend', 'backend', 'mysql'],
    activeEdges: ['frontend-backend', 'backend-mysql'],
    description: '前端 → 后端 → MySQL：定期查询文档列表，检测数据更新'
  },
  {
    step: 9,
    title: '前端展示新数据',
    activeNodes: ['frontend'],
    activeEdges: [],
    description: '前端：更新文档列表，显示新抓取的文章'
  }
]

export default function Architecture() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [stepDescription, setStepDescription] = useState('')

  useEffect(() => {
    if (isPlaying && currentStep < flowSteps.length) {
      const step = flowSteps[currentStep]
      setStepDescription(step.description)
      
      const timer = setTimeout(() => {
        if (currentStep < flowSteps.length - 1) {
          setCurrentStep(currentStep + 1)
        } else {
          setIsPlaying(false)
          setCurrentStep(0)
        }
      }, 3000) // 每步3秒

      return () => clearTimeout(timer)
    }
  }, [currentStep, isPlaying])

  const handlePlay = () => {
    setCurrentStep(0)
    setIsPlaying(true)
  }

  const handleReset = () => {
    setIsPlaying(false)
    setCurrentStep(0)
    setStepDescription('')
  }

  const handleStepClick = (stepIndex: number) => {
    setIsPlaying(false)
    setCurrentStep(stepIndex)
    setStepDescription(flowSteps[stepIndex].description)
  }

  const currentFlow = flowSteps[currentStep] || flowSteps[0]

  return (
    <div className="architecture-page">
      <div className="page-header">
        <h1>系统架构 - 数据流演示</h1>
        <p>完整展示从用户点击"抓取"到数据展示的完整流程</p>
      </div>

      <div className="flow-controls">
        <button 
          className="btn-play" 
          onClick={handlePlay}
          disabled={isPlaying}
        >
          {isPlaying ? '播放中...' : '▶ 开始演示'}
        </button>
        <button 
          className="btn-reset" 
          onClick={handleReset}
        >
          ⏹ 重置
        </button>
        <div className="step-indicator">
          步骤 {currentStep + 1} / {flowSteps.length}
        </div>
      </div>

      <div className="flow-info">
        <div className="flow-step-title">{currentFlow.title}</div>
        <div className="flow-step-desc">{stepDescription || currentFlow.description}</div>
      </div>

      <div className="arch-graph">
        <div className="arch-lines">
          {[
            { from: 'frontend', to: 'backend', id: 'frontend-backend' },
            { from: 'backend', to: 'mysql', id: 'backend-mysql' },
            { from: 'backend', to: 'redis', id: 'backend-redis' },
            { from: 'celery', to: 'redis', id: 'celery-redis' },
            { from: 'celery', to: 'mysql', id: 'celery-mysql' }
          ].map((edge) => {
            const isActive = currentFlow.activeEdges.includes(edge.id)
            return (
              <div key={edge.id} className={`edge edge-${edge.from}-${edge.to} ${isActive ? 'active' : ''}`}>
                <span className="edge-flow" />
                {isActive && <span className="edge-pulse" />}
              </div>
            )
          })}
        </div>

        <div className="arch-nodes">
          {nodes.map((node) => {
            const isActive = currentFlow.activeNodes.includes(node.id)
            return (
              <div 
                key={node.id} 
                className={`node ${node.id} ${isActive ? 'active' : ''}`}
              >
                <div className="node-header">{node.title}</div>
                <div className="node-body">
                  <p>{node.desc}</p>
                  <span className="node-role">{node.role}</span>
                </div>
                {isActive && (
                  <div className="node-activity">
                    <span className="activity-dot"></span>
                    <span className="activity-text">处理中...</span>
                  </div>
                )}
                <div className="node-glow" />
              </div>
            )
          })}
        </div>
      </div>

      <div className="flow-steps-list">
        <h3>流程步骤</h3>
        <div className="steps-grid">
          {flowSteps.map((step, idx) => (
            <div
              key={idx}
              className={`step-item ${currentStep === idx ? 'current' : ''} ${currentStep > idx ? 'completed' : ''}`}
              onClick={() => handleStepClick(idx)}
            >
              <div className="step-number">{step.step}</div>
              <div className="step-content">
                <div className="step-title">{step.title}</div>
                <div className="step-desc">{step.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
