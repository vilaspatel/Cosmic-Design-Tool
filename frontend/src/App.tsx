import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Designer } from './components/Designer'
import { ImpactViewer } from './components/ImpactViewer'
import { ArchitectureExplorer } from './components/ArchitectureExplorer'
import { GlobalLayout } from './components/GlobalLayout'

function App() {
  return (
    <Router>
      <GlobalLayout>
        <Routes>
          <Route path="/" element={<Designer />} />
          <Route path="/impact" element={<ImpactViewer />} />
          <Route path="/explorer" element={<ArchitectureExplorer />} />
        </Routes>
      </GlobalLayout>
    </Router>
  )
}

export default App
