import { useState, useEffect, useMemo, useCallback } from 'react'
import MapCanvas from './MapCanvas'
import EventFilters from './EventFilters'
import CalendarPicker from './CalendarPicker'

const DAYS = ['February_10', 'February_11', 'February_12', 'February_13', 'February_14']
const MAPS = ['AmbroseValley', 'GrandRift', 'Lockdown']
const MINIMAP_FILES = {
  AmbroseValley: '/maps/AmbroseValley_Minimap.png',
  GrandRift: '/maps/GrandRift_Minimap.png',
  Lockdown: '/maps/Lockdown_Minimap.jpg',
}
const EVENT_TYPES = ['Position', 'BotPosition', 'Kill', 'Killed', 'BotKill', 'BotKilled', 'KilledByStorm', 'Loot']

const DAY_TO_ISO = {
  'February_10': '2026-02-10',
  'February_11': '2026-02-11',
  'February_12': '2026-02-12',
  'February_13': '2026-02-13',
  'February_14': '2026-02-14',
}
const AVAILABLE_ISO = Object.values(DAY_TO_ISO)

// ── Stat pill ────────────────────────────────────────────────────────────────
function Pill({ label, value, color = 'var(--text-primary)' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid var(--border-color)',
      borderRadius: 6, padding: '5px 12px',
    }}>
      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
    </div>
  )
}

// ── Field Atlas ──────────────────────────────────────────────────────────────
export default function FieldAtlas() {
  const [range, setRange] = useState(['2026-02-10', '2026-02-14'])
  const [selectedMap, setSelectedMap] = useState('AmbroseValley')
  const [allEvents, setAllEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [activeFilters, setActiveFilters] = useState(() => {
    const f = {}
    EVENT_TYPES.forEach(t => { f[t] = true })
    return f
  })

  // Load all event data for the selected date range + map
  useEffect(() => {
    const [startISO, endISO] = range
    const selectedDays = DAYS.filter(day => {
      const iso = DAY_TO_ISO[day]
      return iso >= startISO && iso <= endISO
    })
    setLoading(true)
    setError(null)

    Promise.all(
      selectedDays.map(day =>
        fetch(`/data/${day}/${selectedMap}.json`)
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      )
    ).then(results => {
      const events = []
      results.forEach(data => {
        if (!data || !data.matches) return
        Object.values(data.matches).forEach(matchEvents => {
          events.push(...matchEvents)
        })
      })
      setAllEvents(events)
      setLoading(false)
    }).catch(e => {
      console.error(e)
      setError('Failed to load event data.')
      setLoading(false)
    })
  }, [range, selectedMap])

  // Reset zoom/pan on map change
  useEffect(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [selectedMap])

  const visibleEvents = useMemo(() => {
    return allEvents.filter(e => activeFilters[e.e])
  }, [allEvents, activeFilters])

  const summary = useMemo(() => {
    const humans = new Set()
    const bots = new Set()
    const matches = new Set()
    let kills = 0, deaths = 0, storm = 0
    allEvents.forEach(e => {
      if (e.b) bots.add(e.u); else humans.add(e.u)
      // derive match from event if possible — use user+approximate grouping
      if (e.e === 'Kill' || e.e === 'BotKill') kills++
      if (e.e === 'Killed' || e.e === 'BotKilled') deaths++
      if (e.e === 'KilledByStorm') storm++
    })
    return { humans: humans.size, bots: bots.size, kills, deaths, storm, total: allEvents.length }
  }, [allEvents])

  const toggleFilter = useCallback((type) => {
    setActiveFilters(prev => ({ ...prev, [type]: !prev[type] }))
  }, [])

  const handleZoomIn = useCallback(() => setZoom(z => Math.min(z * 1.3, 10)), [])
  const handleZoomOut = useCallback(() => setZoom(z => Math.max(z / 1.3, 0.45)), [])
  const handleReset = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }) }, [])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>

      {/* Top bar — height matches NavBar and LeftNav logo (56px) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        height: 56,
        padding: '0 20px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        flexShrink: 0,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}>
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="3,6 9,3 15,6 21,3 21,18 15,21 9,18 3,21" />
            <line x1="9" y1="3" x2="9" y2="18" />
            <line x1="15" y1="6" x2="15" y2="21" />
          </svg>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#67e8f9' }}>Field Atlas</span>
        </div>

        {/* Date range */}
        <CalendarPicker
          mode="range"
          value={range}
          onChange={setRange}
          availableDates={AVAILABLE_ISO}
          label="Date range"
        />

        {/* Map selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Map</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {MAPS.map(m => (
              <button
                key={m}
                onClick={() => setSelectedMap(m)}
                style={{
                  padding: '5px 10px',
                  borderRadius: 5,
                  fontSize: 12,
                  fontWeight: selectedMap === m ? 700 : 500,
                  background: selectedMap === m ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.05)',
                  color: selectedMap === m ? '#67e8f9' : 'var(--text-secondary)',
                  border: selectedMap === m ? '1px solid rgba(6,182,212,0.5)' : '1px solid transparent',
                  cursor: 'pointer',
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Stats pills */}
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
          <Pill label="Events" value={summary.total.toLocaleString()} color="#e2e8f0" />
          <Pill label="Humans" value={summary.humans} color="#06b6d4" />
          <Pill label="Bots" value={summary.bots} color="#22c55e" />
          <Pill label="Kills" value={summary.kills} color="#ef4444" />
          <Pill label="Deaths" value={summary.deaths} color="#f97316" />
          <Pill label="Storm" value={summary.storm} color="#a855f7" />
        </div>
      </div>

      {/* Map area */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {error && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', zIndex: 10 }}>
            {error}
          </div>
        )}
        <MapCanvas
          minimapSrc={MINIMAP_FILES[selectedMap]}
          mapId={selectedMap}
          events={visibleEvents}
          allMatchEvents={allEvents}
          zoom={zoom}
          pan={pan}
          setPan={setPan}
          setZoom={setZoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onReset={handleReset}
          loading={loading}
        />
      </div>

      {/* Filter bar */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-color)',
        padding: '8px 16px',
        flexShrink: 0,
      }}>
        <EventFilters
          filters={activeFilters}
          onToggleFilter={toggleFilter}
          eventTypes={EVENT_TYPES}
        />
      </div>
    </div>
  )
}
