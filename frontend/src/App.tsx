import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <h1>智能新闻RAG系统</h1>
              <p>前端项目已初始化</p>
            </div>
          } />
        </Routes>
      </div>
    </Router>
  )
}

export default App

