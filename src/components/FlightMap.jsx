import { useState, useEffect, useMemo } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  Line,
  Marker,
  ZoomableGroup
} from 'react-simple-maps'
import { getAirportCoordinates, getAirportCoordinatesAsync } from '../utils/geoUtils'
import './FlightMap.css'

// World topology JSON (low resolution for performance)
const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

const FlightMap = ({ flights, isModal = false, onClose }) => {
  const [mapData, setMapData] = useState({ routes: [], airports: new Map() })
  const [loading, setLoading] = useState(true)
  const [position, setPosition] = useState({ coordinates: [10, 30], zoom: 1 })

  // Process flights into routes and airports
  useEffect(() => {
    async function processFlights() {
      if (!flights || flights.length === 0) {
        setMapData({ routes: [], airports: new Map() })
        setLoading(false)
        return
      }

      setLoading(true)

      const routes = []
      const airportSet = new Set()
      const airportCoords = new Map()

      // Collect unique airports
      flights.forEach(flight => {
        if (flight.origin) airportSet.add(flight.origin.toUpperCase())
        if (flight.destination) airportSet.add(flight.destination.toUpperCase())
      })

      // Resolve coordinates for all airports (parallel)
      const airportPromises = Array.from(airportSet).map(async (icao) => {
        // Try sync first (from static DB or cache)
        let coords = getAirportCoordinates(icao)

        // If not found, try async API
        if (!coords) {
          coords = await getAirportCoordinatesAsync(icao)
        }

        return { icao, coords }
      })

      const resolved = await Promise.all(airportPromises)

      // Build airport map (only include those with coordinates)
      resolved.forEach(({ icao, coords }) => {
        if (coords) airportCoords.set(icao, coords)
      })

      // Build routes (only for flights where both airports have coords)
      // Count route frequency for potential styling
      const routeMap = new Map()

      flights.forEach(flight => {
        const origin = flight.origin?.toUpperCase()
        const dest = flight.destination?.toUpperCase()

        if (origin && dest && airportCoords.has(origin) && airportCoords.has(dest)) {
          const routeKey = `${origin}-${dest}`
          const reverseKey = `${dest}-${origin}`

          // Check if we already have this route (in either direction)
          if (!routeMap.has(routeKey) && !routeMap.has(reverseKey)) {
            routeMap.set(routeKey, {
              from: airportCoords.get(origin),
              to: airportCoords.get(dest),
              origin,
              destination: dest,
              count: 1
            })
          } else {
            // Increment count
            const existing = routeMap.get(routeKey) || routeMap.get(reverseKey)
            if (existing) existing.count++
          }
        }
      })

      setMapData({
        routes: Array.from(routeMap.values()),
        airports: airportCoords
      })
      setLoading(false)
    }

    processFlights()
  }, [flights])

  // Zoom controls
  const handleZoomIn = () => {
    setPosition(pos => ({ ...pos, zoom: Math.min(pos.zoom * 1.5, 8) }))
  }

  const handleZoomOut = () => {
    setPosition(pos => ({ ...pos, zoom: Math.max(pos.zoom / 1.5, 1) }))
  }

  const handleReset = () => {
    setPosition({ coordinates: [10, 30], zoom: 1 })
  }

  const handleMoveEnd = (newPosition) => {
    setPosition(newPosition)
  }

  // Close modal on Escape key
  useEffect(() => {
    if (!isModal) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isModal, onClose])

  // Loading state
  if (loading) {
    return (
      <div className={`flight-map ${isModal ? 'modal' : 'mini'}`}>
        <div className="flight-map-loading">
          <div className="loading-spinner"></div>
        </div>
      </div>
    )
  }

  // Empty state
  if (mapData.airports.size === 0) {
    return (
      <div className={`flight-map ${isModal ? 'modal' : 'mini'}`}>
        <div className="flight-map-empty">
          <span>Keine Flugrouten verfügbar</span>
        </div>
      </div>
    )
  }

  // Calculate marker size based on zoom and modal state
  const markerSize = isModal ? 4 / Math.sqrt(position.zoom) : 3

  const mapContent = (
    <ComposableMap
      projection="geoMercator"
      projectionConfig={{
        scale: isModal ? 150 : 140,
        center: [10, 35]
      }}
      className="flight-map-svg"
    >
      <ZoomableGroup
        zoom={position.zoom}
        center={position.coordinates}
        onMoveEnd={handleMoveEnd}
        minZoom={1}
        maxZoom={8}
      >
        {/* World geography */}
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                className="flight-map-country"
              />
            ))
          }
        </Geographies>

        {/* Flight routes as curved lines */}
        {mapData.routes.map((route, idx) => (
          <Line
            key={`route-${idx}`}
            from={[route.from.lon, route.from.lat]}
            to={[route.to.lon, route.to.lat]}
            stroke="#4fc3f7"
            strokeWidth={1.5 + (route.count > 1 ? 0.5 : 0)}
            strokeLinecap="round"
            className="flight-map-route"
          />
        ))}

        {/* Airport markers */}
        {Array.from(mapData.airports.entries()).map(([icao, coords]) => (
          <Marker key={icao} coordinates={[coords.lon, coords.lat]}>
            <circle
              r={markerSize}
              className="flight-map-marker"
            />
            {isModal && position.zoom >= 2 && (
              <text
                textAnchor="middle"
                y={-8}
                className="flight-map-label"
              >
                {icao}
              </text>
            )}
          </Marker>
        ))}
      </ZoomableGroup>
    </ComposableMap>
  )

  // Modal version
  if (isModal) {
    return (
      <div className="flight-map-modal-overlay" onClick={onClose}>
        <div className="flight-map-modal" onClick={(e) => e.stopPropagation()}>
          <button className="flight-map-modal-close" onClick={onClose} title="Schließen">
            ×
          </button>

          <div className="flight-map-modal-header">
            <h3>Flugrouten</h3>
            <span className="flight-map-stats">
              {mapData.airports.size} Flughäfen · {mapData.routes.length} Routen
            </span>
          </div>

          <div className="flight-map modal">
            {mapContent}
          </div>

          <div className="flight-map-controls">
            <button onClick={handleZoomIn} title="Vergrößern">+</button>
            <button onClick={handleZoomOut} title="Verkleinern">−</button>
            <button onClick={handleReset} className="reset-btn" title="Zurücksetzen">Reset</button>
          </div>

          <div className="flight-map-legend">
            <div className="flight-map-legend-item">
              <span className="legend-line"></span>
              <span>Flugroute</span>
            </div>
            <div className="flight-map-legend-item">
              <span className="legend-dot"></span>
              <span>Flughafen</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Mini preview version
  return (
    <div className="flight-map mini">
      {mapContent}
    </div>
  )
}

export default FlightMap
