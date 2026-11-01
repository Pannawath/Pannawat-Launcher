import React, { Component } from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'

class RenderErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Launcher UI failed to render:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <main role="alert" style={{ minHeight: '100vh', padding: 32, color: '#f8fafc', background: '#07090e', fontFamily: 'Segoe UI, sans-serif' }}>
          <h1 style={{ marginBottom: 12 }}>Launcher could not load</h1>
          <p style={{ color: '#cbd5e1' }}>Restart the launcher. If this continues, share this error with support:</p>
          <pre style={{ marginTop: 16, whiteSpace: 'pre-wrap', color: '#fca5a5' }}>{String(this.state.error?.stack || this.state.error)}</pre>
        </main>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RenderErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </RenderErrorBoundary>
  </React.StrictMode>
)
