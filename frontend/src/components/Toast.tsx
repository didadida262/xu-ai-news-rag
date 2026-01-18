import { useEffect, useState } from 'react'
import './Toast.css'

declare global {
  interface Window {
    showToast?: (message: string, type?: ToastType, duration?: number) => void
  }
}

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastProps {
  toast: Toast
  onClose: (id: string) => void
}

function ToastItem({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id)
    }, toast.duration || 3000)

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onClose])

  return (
    <div className={`toast toast-${toast.type}`} onClick={() => onClose(toast.id)}>
      <div className="toast-content">
        <span className="toast-message">{toast.message}</span>
        <button className="toast-close" onClick={(e) => { e.stopPropagation(); onClose(toast.id) }}>×</button>
      </div>
    </div>
  )
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    // 全局函数，用于显示toast
    const showToast = (message: string, type: ToastType = 'info', duration?: number) => {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
      const newToast: Toast = { id, message, type, duration }
      setToasts(prev => [...prev, newToast])
    }

    // 将showToast挂载到window对象上
    window.showToast = showToast

    return () => {
      delete window.showToast
    }
  }, [])

  const handleClose = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={handleClose} />
      ))}
    </div>
  )
}
