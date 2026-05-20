import { useState, useEffect, useRef } from 'react'
import { getAirports, getDepartures } from '../api/aircraftApi'

function formatTime(ts) {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function Scenario3() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [selectedAirport, setSelectedAirport] = useState(null)
  const [departures, setDepartures] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const results = await getAirports(query)
        setSuggestions(results)
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  const selectAirport = airport => {
    setSelectedAirport(airport)
    setQuery(`${airport.iata_code} — ${airport.name}`)
    setSuggestions([])
  }

  const handleFetch = async () => {
    if (!selectedAirport) return
    setLoading(true)
    setError(null)
    setDepartures(null)
    try {
      const result = await getDepartures(selectedAirport.icao_code)
      setDepartures(result)
    } catch {
      setError('Failed to fetch departure data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="scenario">
      <div className="scenario-header">
        <div>
          <h2>Recent Departures</h2>
          <p>Flights that departed from a selected airport in the last 20 minutes</p>
        </div>
      </div>

      <div className="controls">
        <div className="autocomplete-wrap">
          <input
            className="search-input"
            placeholder="Search by airport name or IATA code (e.g. EDDF, Heathrow)…"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedAirport(null) }}
          />
          {searching && <span className="hint-text">Searching…</span>}
          {suggestions.length > 0 && (
            <ul className="suggestion-list">
              {suggestions.slice(0, 10).map(a => (
                <li key={a.ident} onClick={() => selectAirport(a)}>
                  <strong>{a.iata_code}</strong>
                  <span className="sug-name"> {a.name}</span>
                  <span className="sug-loc"> · {a.municipality}, {a.iso_country}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          className="btn-primary"
          onClick={handleFetch}
          disabled={!selectedAirport || loading}
        >
          {loading ? 'Loading…' : 'Get Departures'}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {departures && (
        <div>
          <h3 className="section-title">
            Departures from <strong>{departures.airport}</strong> — last {departures.window_minutes} min
          </h3>
          {departures.departures.length === 0 ? (
            <div className="empty-state">
              <p>No departures recorded in this window.</p>
              <p className="hint-text" style={{ marginTop: 6 }}>
                Try a major hub: EDDF (Frankfurt), EGLL (London), KLAX (Los Angeles), OMDB (Dubai)
              </p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ICAO24</th>
                    <th>Callsign</th>
                    <th>First Seen</th>
                    <th>Last Seen</th>
                    <th>Est. Arrival Airport</th>
                  </tr>
                </thead>
                <tbody>
                  {departures.departures.map((d, i) => (
                    <tr key={i}>
                      <td><code>{d.icao24}</code></td>
                      <td>{d.callsign || '—'}</td>
                      <td>{formatTime(d.firstSeen)}</td>
                      <td>{formatTime(d.lastSeen)}</td>
                      <td>{d.estArrivalAirport || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
