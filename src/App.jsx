import { useState, useEffect, useCallback, useMemo } from 'react'
import LeftNav from './components/LeftNav'
import NavBar from './components/NavBar'
import MapCanvas from './components/MapCanvas'
import BottomPanel from './components/BottomPanel'
import Dashboard from './components/Dashboard'
import FieldAtlas from './components/FieldAtlas'

const DAYS = ['February_10', 'February_11', 'February_12', 'February_13', 'February_14']
const MAPS = ['AmbroseValley', 'GrandRift', 'Lockdown']
const MINIMAP_FILES = {
  AmbroseValley: '/maps/AmbroseValley_Minimap.png',
  GrandRift: '/maps/GrandRift_Minimap.png',
  Lockdown: '/maps/Lockdown_Minimap.jpg',
}

const EVENT_TYPES = ['Position', 'BotPosition', 'Kill', 'Killed', 'BotKill', 'BotKilled', 'KilledByStorm', 'Loot']

export default function App() {
  const [currentView, setCurrentView] = useState('journey')

  // ── Shared data ─────────────────────────────────────────────────────────────
  const [index, setIndex] = useState(null)

  // ── Journey Nexus state ──────────────────────────────────────────────────────
  const [selectedDay, setSelectedDay] = useState(DAYS[0])
  const [selectedMap, setSelectedMap] = useState(MAPS[0])
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [matchData, setMatchData] = useState(null)
  const [loading, setLoading] = useState(false)

  const [activeFilters, setActiveFilters] = useState(() => {
    const f = {}
    EVENT_TYPES.forEach(t => { f[t] = true })
    return f
  })

  const [playbackTime, setPlaybackTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })

  // ── Load shared index ────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/data/index.json')
      .then(r => r.json())
      .then(setIndex)
      .catch(console.error)
  }, [])

  // ── Match IDs for current day+map ────────────────────────────────────────────
  const matchIds = useMemo(() => {
    if (!index || !index[selectedDay] || !index[selectedDay][selectedMap]) return []
    return Object.keys(index[selectedDay][selectedMap].matches)
  }, [index, selectedDay, selectedMap])

  useEffect(() => {
    if (matchIds.length > 0 && (!selectedMatch || !matchIds.includes(selectedMatch))) {
      setSelectedMatch(matchIds[0])
    }
  }, [matchIds])

  // ── Load match data ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedDay || !selectedMap) return
    setLoading(true)
    fetch(`/data/${selectedDay}/${selectedMap}.json`)
      .then(r => r.json())
      .then(data => { setMatchData(data.matches); setLoading(false) })
      .catch(e => { console.error(e); setMatchData(null); setLoading(false) })
  }, [selectedDay, selectedMap])

  useEffect(() => {
    setPlaybackTime(0)
    setPlaying(false)
  }, [selectedMatch])

  // ── Derived journey state ────────────────────────────────────────────────────
  const currentEvents = useMemo(() => {
    if (!matchData || !selectedMatch) return []
    return matchData[selectedMatch] || []
  }, [matchData, selectedMatch])

  const timestamps = useMemo(() => {
    const ts = new Set(currentEvents.map(e => e.t))
    return Array.from(ts).sort((a, b) => a - b)
  }, [currentEvents])

  const timeRange = useMemo(() => {
    if (timestamps.length === 0) return { start: 0, end: 0, duration: 0 }
    const start = timestamps[0]
    const end = timestamps[timestamps.length - 1]
    return { start, end, duration: end - start }
  }, [timestamps])

  const currentGameTime = useMemo(() => {
    if (timeRange.duration === 0) return timeRange.start
    return timeRange.start + playbackTime * timeRange.duration
  }, [playbackTime, timeRange])

  const visibleEvents = useMemo(() => {
    if (timestamps.length === 0) return currentEvents.filter(e => activeFilters[e.e])
    return currentEvents.filter(e => e.t <= currentGameTime && activeFilters[e.e])
  }, [currentEvents, timestamps, currentGameTime, activeFilters])

  const matchSummary = useMemo(() => {
    const humans = new Set()
    const bots = new Set()
    let kills = 0, deaths = 0, loot = 0
    currentEvents.forEach(e => {
      if (e.b) bots.add(e.u); else humans.add(e.u)
      if (e.e === 'BotKill') kills++
      if (e.e === 'BotKilled') deaths++
      if (e.e === 'Loot') loot++
    })
    return { players: humans.size, bots: bots.size, kills, deaths, loot }
  }, [currentEvents])

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const toggleFilter = useCallback((eventType) => {
    setActiveFilters(prev => ({ ...prev, [eventType]: !prev[eventType] }))
  }, [])

  const handleZoomIn = useCallback(() => setZoom(z => Math.min(z * 1.3, 10)), [])
  const handleZoomOut = useCallback(() => setZoom(z => Math.max(z / 1.3, 0.45)), [])
  const handleReset = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }) }, [])

  const handleMapChange = useCallback((map) => {
    setSelectedMap(map)
    setSelectedMatch(null)
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  const handleSelectMatch = useCallback((record) => {
    setCurrentView('journey')
    setSelectedDay(record.day)
    handleMapChange(record.map)
    setSelectedMatch(record.matchId)
  }, [handleMapChange])

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* Left nav tray */}
      <LeftNav currentView={currentView} onViewChange={setCurrentView} />

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* ── Journey Nexus ── */}
        {currentView === 'journey' && (
          <>
            <NavBar
              days={DAYS}
              maps={MAPS}
              matchIds={matchIds}
              selectedDay={selectedDay}
              selectedMap={selectedMap}
              selectedMatch={selectedMatch}
              onDayChange={setSelectedDay}
              onMapChange={handleMapChange}
              onMatchChange={setSelectedMatch}
              index={index}
              onSelectMatch={handleSelectMatch}
            />
            <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
              <MapCanvas
                minimapSrc={MINIMAP_FILES[selectedMap]}
                mapId={selectedMap}
                events={visibleEvents}
                allMatchEvents={currentEvents}
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
            <BottomPanel
              summary={matchSummary}
              filters={activeFilters}
              onToggleFilter={toggleFilter}
              eventTypes={EVENT_TYPES}
              timeRange={timeRange}
              currentGameTime={currentGameTime}
              playbackTime={playbackTime}
              setPlaybackTime={setPlaybackTime}
              playing={playing}
              setPlaying={setPlaying}
              matchEvents={currentEvents}
            />
          </>
        )}

        {/* ── Dashboard ── */}
        {currentView === 'dashboard' && (
          <Dashboard index={index} />
        )}

        {/* ── Field Atlas ── */}
        {currentView === 'field-atlas' && (
          <FieldAtlas />
        )}

      </div>
    </div>
  )
}
