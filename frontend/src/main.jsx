import React from 'react'
import ReactDOM from 'react-dom/client'
import Dashboard from './components/Dashboard'

// ============================================================================
// React Application Entry Point
// ============================================================================
// This is the main entry point for the React application.
// It:
// 1. Imports the main Dashboard component
// 2. Renders it into the DOM at element with id="root"
// 3. Enables React StrictMode for development warnings
// ============================================================================

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Dashboard />
  </React.StrictMode>,
)
