import { useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { getAircraftPosition } from '../api/aircraftApi'

// Fix Leaflet default icon paths broken by bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function FlyTo({ position }) {
  const map = useMap()
  map.flyTo(position, 7, { duration: 1.2 })
  return null
}

export default function Scenario4() {
  const [icao24, setIcao24] = useState('')
  const [aircraft, setAircraft] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mapReady, setMapReady] = useState(false)

  const handleSearch = async () => {
    const val = icao24.trim().toLowerCase()
    if (!val) return
    setLoading(true)
    setError(null)
    try {
      const result = await getAircraftPosition(val)
      setAircraft(result)
      if (result.latitude && result.longitude) setMapReady(true)
    } catch (e) {
      setAircraft(null)
      setError(
        e.response?.status === 404
          ? 'Aircraft not found. It may not be tracked right now.'
          : 'Failed to fetch aircraft position.'
      )
    } finally {
      setLoading(false)
    }
  }

  const position =
    aircraft?.latitude != null && aircraft?.longitude != null
      ? [aircraft.latitude, aircraft.longitude]
      : null

  return (
    <div className="scenario">
      <div className="scenario-header">
        <div>
          <h2>Aircraft Location</h2>
          <p>Enter an ICAO24 transponder code to see the aircraft on a live map</p>
        </div>
      </div>

      <div className="controls">
        <input
          className="search-input"
          placeholder="ICAO24 address (e.g. 3c6444, a0f0fc, 400f3c)…"
          value={icao24}
          onChange={e => setIcao24(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <button
          className="btn-primary"
          onClick={handleSearch}
          disabled={!icao24.trim() || loading}
        >
          {loading ? 'Locating…' : 'Find Aircraft'}
        </button>
      </div>

      <p className="hint-text">
        Tip: copy any ICAO24 from the other tabs to track that specific aircraft.
      </p>

      {error && <div className="error-banner">{error}</div>}

      {aircraft && (
        <div className="aircraft-detail">
          <div className="detail-grid">
            {[
              ['ICAO24', aircraft.icao24],
              ['Callsign', aircraft.callsign || '—'],
              ['Origin Country', aircraft.origin_country],
              ['Status', aircraft.on_ground ? 'On Ground' : 'Airborne'],
              ['Altitude', aircraft.baro_altitude != null ? `${aircraft.baro_altitude.toFixed(0)} m` : '—'],
              ['Speed', aircraft.velocity != null ? `${aircraft.velocity.toFixed(1)} m/s` : '—'],
              ['Heading', aircraft.true_track != null ? `${aircraft.true_track.toFixed(0)}°` : '—'],
              ['Vert. Rate', aircraft.vertical_rate != null ? `${aircraft.vertical_rate.toFixed(1)} m/s` : '—'],
              ['Coordinates', position ? `${position[0].toFixed(4)}, ${position[1].toFixed(4)}` : '—'],
              ['Squawk', aircraft.squawk || '—'],
            ].map(([label, value]) => (
              <div key={label} className="detail-card">
                <span className="detail-label">{label}</span>
                <span className={`detail-value ${label === 'Status' ? (aircraft.on_ground ? 'status-pill ground' : 'status-pill air') : ''}`}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          {mapReady && position ? (
            <div className="map-wrap">
              <MapContainer
                center={position}
                zoom={7}
                style={{ height: 420, width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                <FlyTo position={position} />
                <Marker position={position}>
                  <Popup>
                    <strong>{aircraft.callsign || aircraft.icao24}</strong><br />
                    {aircraft.origin_country}<br />
                    Alt: {aircraft.baro_altitude?.toFixed(0) ?? '—'} m &nbsp;
                    Speed: {aircraft.velocity?.toFixed(1) ?? '—'} m/s
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
          ) : (
            !position && (
              <div className="empty-state">No position data available for this aircraft.</div>
            )
          )}
        </div>
      )}
    </div>
  )
}
