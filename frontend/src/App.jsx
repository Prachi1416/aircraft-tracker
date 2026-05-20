import { useState } from 'react'
import Scenario1 from './components/Scenario1'
import Scenario2 from './components/Scenario2'
import Scenario3 from './components/Scenario3'
import Scenario4 from './components/Scenario4'
import './App.css'

const TABS = [
  { id: 1, label: 'Aircraft by Country', sub: 'Grouped, auto-refresh 10s' },
  { id: 2, label: 'Airborne Count', sub: 'Per country' },
  { id: 3, label: 'Departures', sub: 'Last 20 minutes' },
  { id: 4, label: 'Aircraft Location', sub: 'Live map' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState(1)

  return (
    <div className="app">
      <header className="app-header">
        <h1>✈ Aircraft Traffic Monitor</h1>
        <p>Real-time global tracking · Powered by OpenSky Network</p>
      </header>

      <nav className="tab-nav">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-badge">S{tab.id}</span>
            <span className="tab-text">
              <span className="tab-label">{tab.label}</span>
              <span className="tab-sub">{tab.sub}</span>
            </span>
          </button>
        ))}
      </nav>

      <main className="main-content">
        {activeTab === 1 && <Scenario1 />}
        {activeTab === 2 && <Scenario2 />}
        {activeTab === 3 && <Scenario3 />}
        {activeTab === 4 && <Scenario4 />}
      </main>
    </div>
  )
}
