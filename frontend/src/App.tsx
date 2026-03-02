import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { Designer } from './components/Designer'
import { ImpactViewer } from './components/ImpactViewer'
import { Sidebar } from './components/Sidebar'
import { LayoutDashboard, ShieldAlert } from 'lucide-react'

function App() {
  return (
    <Router>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
        <nav style={{
          background: '#2c3e50',
          color: 'white',
          padding: '10px 20px',
          display: 'flex',
          gap: '20px',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, marginRight: '20px' }}>Cosmic Design Engine</h2>
          <Link to="/" style={{ color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <LayoutDashboard size={18} /> Designer
          </Link>
          <Link to="/impact" style={{ color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <ShieldAlert size={18} /> Impact Viewer
          </Link>
        </nav>

        <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
          <Routes>
            <Route path="/" element={
              <div style={{ display: 'flex', width: '100%', height: '100%' }}>
                <Sidebar />
                <Designer />
              </div>
            } />
            <Route path="/impact" element={<ImpactViewer />} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App
