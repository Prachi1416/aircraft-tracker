import { useState, useEffect, useCallback } from 'react'
import { getGroupedStates } from '../api/aircraftApi'

const REFRESH_INTERVAL = 10

export default function Scenario1() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL)
  const [expandedCountry, setExpandedCountry] = useState(null)
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async (isBackground = false) => {
    if (isBackground) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const result = await getGroupedStates()
      setData(result)
      setCountdown(REFRESH_INTERVAL)
    } catch {
      setError('Failed to fetch aircraft data. OpenSky API may be rate-limited — try again shortly.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData(false)
    const interval = setInterval(() => fetchData(true), REFRESH_INTERVAL * 1000)
    return () => clearInterval(interval)
  }, [fetchData])

  useEffect(() => {
    const timer = setInterval(() => setCountdown(c => (c > 1 ? c - 1 : REFRESH_INTERVAL)), 1000)
    return () => clearInterval(timer)
  }, [])

  const filtered = data
    ? Object.entries(data.countries).filter(([country]) =>
        country.toLowerCase().includes(search.toLowerCase())
      )
    : []

  if (loading) return <div className="loading-state">Loading aircraft data from OpenSky Network…</div>

  return (
    <div className="scenario">
      <div className="scenario-header">
        <div>
          <h2>Aircraft by Origin Country</h2>
          <p>
            {data?.total?.toLocaleString()} aircraft tracked across{' '}
            {Object.keys(data?.countries || {}).length} countries
          </p>
        </div>
        <div className="refresh-badge">
          {refreshing ? (
            <span className="refreshing-dot" />
          ) : (
            <span className="countdown">{countdown}s</span>
          )}
          <span className="refresh-label">auto-refresh</span>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <input
        className="search-input full-width"
        placeholder="Filter by country name…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div className="country-list">
        {filtered.map(([country, aircrafts]) => {
          const airborne = aircrafts.filter(a => !a.on_ground).length
          const isOpen = expandedCountry === country
          return (
            <div key={country} className="country-card">
              <div
                className="country-row"
                onClick={() => setExpandedCountry(isOpen ? null : country)}
              >
                <div className="country-left">
                  <span className="country-name">{country}</span>
                  <span className="pill purple">{aircrafts.length} total</span>
                  <span className="pill green">{airborne} airborne</span>
                </div>
                <span className="chevron">{isOpen ? '▲' : '▼'}</span>
              </div>

              {isOpen && (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ICAO24</th>
                        <th>Callsign</th>
                        <th>Status</th>
                        <th>Altitude (m)</th>
                        <th>Speed (m/s)</th>
                        <th>Heading (°)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aircrafts.slice(0, 50).map(a => (
                        <tr key={a.icao24}>
                          <td><code>{a.icao24}</code></td>
                          <td>{a.callsign || '—'}</td>
                          <td>
                            <span className={`status-pill ${a.on_ground ? 'ground' : 'air'}`}>
                              {a.on_ground ? 'Ground' : 'Airborne'}
                            </span>
                          </td>
                          <td>{a.baro_altitude?.toFixed(0) ?? '—'}</td>
                          <td>{a.velocity?.toFixed(1) ?? '—'}</td>
                          <td>{a.true_track?.toFixed(0) ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {aircrafts.length > 50 && (
                    <p className="table-note">Showing first 50 of {aircrafts.length}</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
