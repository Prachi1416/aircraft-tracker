import { useState, useEffect } from 'react'
import { getCountries, getAirborneByCountry } from '../api/aircraftApi'

export default function Scenario2() {
  const [countries, setCountries] = useState([])
  const [selected, setSelected] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingCountries, setLoadingCountries] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getCountries()
      .then(setCountries)
      .catch(() => setError('Failed to load country list'))
      .finally(() => setLoadingCountries(false))
  }, [])

  const handleFetch = async () => {
    if (!selected) return
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const result = await getAirborneByCountry(selected)
      setData(result)
    } catch {
      setError('Failed to fetch airborne data — please try again')
    } finally {
      setLoading(false)
    }
  }

  const airborneRate =
    data && data.total_tracked > 0
      ? ((data.airborne_count / data.total_tracked) * 100).toFixed(1)
      : null

  return (
    <div className="scenario">
      <div className="scenario-header">
        <div>
          <h2>Airborne Aircraft by Country</h2>
          <p>Select a country to see how many aircraft are currently airborne</p>
        </div>
      </div>

      <div className="controls">
        <select
          className="select-input"
          value={selected}
          onChange={e => setSelected(e.target.value)}
          disabled={loadingCountries}
        >
          <option value="">
            {loadingCountries ? 'Loading countries…' : '— Select a country —'}
          </option>
          {countries.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          className="btn-primary"
          onClick={handleFetch}
          disabled={!selected || loading}
        >
          {loading ? 'Loading…' : 'Get Airborne Count'}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {data && (
        <>
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-num green">{data.airborne_count}</div>
              <div className="stat-label">Airborne</div>
            </div>
            <div className="stat-card">
              <div className="stat-num">{data.total_tracked - data.airborne_count}</div>
              <div className="stat-label">On Ground</div>
            </div>
            <div className="stat-card">
              <div className="stat-num">{data.total_tracked}</div>
              <div className="stat-label">Total Tracked</div>
            </div>
            {airborneRate !== null && (
              <div className="stat-card">
                <div className="stat-num blue">{airborneRate}%</div>
                <div className="stat-label">Airborne Rate</div>
              </div>
            )}
          </div>

          {data.aircrafts.length > 0 ? (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ICAO24</th>
                    <th>Callsign</th>
                    <th>Altitude (m)</th>
                    <th>Speed (m/s)</th>
                    <th>Heading (°)</th>
                    <th>Vert. Rate (m/s)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.aircrafts.slice(0, 100).map(a => (
                    <tr key={a.icao24}>
                      <td><code>{a.icao24}</code></td>
                      <td>{a.callsign || '—'}</td>
                      <td>{a.baro_altitude?.toFixed(0) ?? '—'}</td>
                      <td>{a.velocity?.toFixed(1) ?? '—'}</td>
                      <td>{a.true_track?.toFixed(0) ?? '—'}</td>
                      <td>{a.vertical_rate?.toFixed(1) ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.aircrafts.length > 100 && (
                <p className="table-note">Showing 100 of {data.aircrafts.length}</p>
              )}
            </div>
          ) : (
            <div className="empty-state">No airborne aircraft found for {data.country}.</div>
          )}
        </>
      )}
    </div>
  )
}
