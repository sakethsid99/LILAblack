import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { parseQuery, flattenIndex } from '../utils/searchQuery'

const PLACEHOLDERS = [
  'Ask Nexus — show me matches with KilledByStorm events',
  'Show me the matches where a bot killed a player',
  'Show me matches on GrandRift with kills',
  'Show me matches on Feb 12',
  'Show me matches with no bots',
]

const EVENT_BADGE = {
  KilledByStorm: { label: 'Storm',    bg: '#4c1d95', color: '#c4b5fd' },
  BotKill:       { label: 'BotKill',  bg: '#431407', color: '#fed7aa' },
  BotKilled:     { label: 'BotKilled',bg: '#431407', color: '#f97316' },
  Kill:          { label: 'Kill',     bg: '#450a0a', color: '#fca5a5' },
  Killed:        { label: 'Killed',   bg: '#450a0a', color: '#ef4444' },
  Loot:          { label: 'Loot',     bg: '#422006', color: '#fde68a' },
}

function Badge({ type, count }) {
  const cfg = EVENT_BADGE[type]
  if (!cfg || !count) return null
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
      background: cfg.bg, color: cfg.color,
    }}>
      {cfg.label} ×{count}
    </span>
  )
}

export default function SearchBar({ index, onSelectMatch }) {
  const [query, setQuery] = useState('')
  const [phIdx, setPhIdx] = useState(0)
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  // Cycle placeholder text every 3s
  useEffect(() => {
    const id = setInterval(() => setPhIdx(i => (i + 1) % PLACEHOLDERS.length), 3000)
    return () => clearInterval(id)
  }, [])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const allRecords = useMemo(() => index ? flattenIndex(index) : [], [index])

  const results = useMemo(() => {
    const filter = parseQuery(query)
    if (!filter) return []
    return allRecords.filter(filter).slice(0, 50)
  }, [query, allRecords])

  const handleChange = useCallback((e) => {
    setQuery(e.target.value)
    setOpen(true)
  }, [])

  const handleSelect = useCallback((record) => {
    onSelectMatch(record)
    setOpen(false)
    setQuery('')
  }, [onSelectMatch])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') { setOpen(false); setQuery('') }
  }, [])

  const showResults = open && query.trim().length > 0

  return (
    <div ref={containerRef} style={{ position: 'relative', flex: 1, maxWidth: 480 }}>
      {/* Input */}
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
          fontSize: 14, color: 'var(--text-muted)', pointerEvents: 'none',
        }}>🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => query && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={PLACEHOLDERS[phIdx]}
          style={{
            width: '100%', boxSizing: 'border-box',
            paddingLeft: 32, paddingRight: 12, height: 34,
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            borderRadius: 8, fontSize: 12,
            color: 'var(--text-primary)',
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocusCapture={e => e.target.style.borderColor = 'var(--accent)'}
          onBlurCapture={e => e.target.style.borderColor = 'var(--border-color)'}
        />
      </div>

      {/* Results popup */}
      {showResults && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 1000, maxHeight: 420, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{
            padding: '8px 14px', borderBottom: '1px solid var(--border-color)',
            fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between',
          }}>
            <span>
              {results.length === 0
                ? 'No matches found'
                : `${results.length} match${results.length !== 1 ? 'es' : ''} found`}
            </span>
            {results.length > 0 && <span>Click to open</span>}
          </div>

          {/* Result rows */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {results.length === 0 ? (
              <div style={{ padding: '16px 14px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                Try: "storm", "bot killed", "GrandRift kills", "Feb 12", "no bots"
              </div>
            ) : results.map((r) => (
              <div
                key={r.matchId}
                onClick={() => handleSelect(r)}
                style={{
                  padding: '8px 14px', cursor: 'pointer',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  display: 'flex', flexDirection: 'column', gap: 4,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Row 1: date + map */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {r.day.replace('_', ' ')}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '1px 6px',
                    borderRadius: 4, background: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                  }}>{r.map}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                    {r.humans} human{r.humans !== 1 ? 's' : ''} · {r.bots} bot{r.bots !== 1 ? 's' : ''}
                  </span>
                </div>
                {/* Row 2: match ID + event badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                    {r.matchId.slice(0, 8)}…
                  </span>
                  {Object.entries(r.events).map(([type, count]) =>
                    <Badge key={type} type={type} count={count} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
