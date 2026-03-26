import { useEffect, useMemo, useState } from 'react'
import SearchBar from './SearchBar'
import CalendarPicker from './CalendarPicker'

// Map between internal DAYS format and ISO dates
const DAY_TO_ISO = {
  'February_10': '2026-02-10',
  'February_11': '2026-02-11',
  'February_12': '2026-02-12',
  'February_13': '2026-02-13',
  'February_14': '2026-02-14',
}
const ISO_TO_DAY = Object.fromEntries(Object.entries(DAY_TO_ISO).map(([k, v]) => [v, k]))
const AVAILABLE_ISO = Object.values(DAY_TO_ISO)

export default function NavBar({
  days, maps, matchIds,
  selectedDay, selectedMap, selectedMatch,
  onDayChange, onMapChange, onMatchChange,
  index, onSelectMatch,
}) {
  const [matchQuery, setMatchQuery] = useState(selectedMatch || '')

  useEffect(() => {
    setMatchQuery(selectedMatch || '')
  }, [selectedMatch])

  const filteredMatchIds = useMemo(() => {
    const query = matchQuery.trim().toLowerCase()
    if (!query) return matchIds
    return matchIds.filter(id => id.toLowerCase().includes(query))
  }, [matchIds, matchQuery])

  // Derive available ISO dates for the selected map from index
  const availableForMap = useMemo(() => {
    if (!index) return AVAILABLE_ISO
    return AVAILABLE_ISO.filter(iso => {
      const day = ISO_TO_DAY[iso]
      return index[day] && index[day][selectedMap]
    })
  }, [index, selectedMap])

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      height: 56,
      padding: '0 20px',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-color)',
      flexShrink: 0,
      boxSizing: 'border-box',
    }}>
      {/* Search Bar */}
      <SearchBar index={index} onSelectMatch={onSelectMatch} />

      {/* Date — calendar single picker */}
      <CalendarPicker
        mode="single"
        value={DAY_TO_ISO[selectedDay] || null}
        onChange={iso => onDayChange(ISO_TO_DAY[iso])}
        availableDates={availableForMap}
        label="Date"
      />

      {/* Map Picker */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
        Map
        <select value={selectedMap} onChange={e => onMapChange(e.target.value)}>
          {maps.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </label>

      {/* Match ID Picker */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
        Match
        <div style={{ position: 'relative', width: 320 }}>
          <input
            type="text"
            list="match-id-options"
            value={matchQuery}
            placeholder="Search or select match ID"
            onChange={e => {
              const nextValue = e.target.value
              setMatchQuery(nextValue)
              if (matchIds.includes(nextValue)) onMatchChange(nextValue)
            }}
            onBlur={() => {
              if (!matchQuery && selectedMatch) setMatchQuery(selectedMatch)
            }}
          />
          <datalist id="match-id-options">
            {filteredMatchIds.map(id => (
              <option key={id} value={id} />
            ))}
          </datalist>
        </div>
      </label>
    </nav>
  )
}
