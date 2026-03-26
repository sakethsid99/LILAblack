/**
 * CalendarPicker — hotel-booking-style date picker
 *
 * Props:
 *   mode         'single' | 'range'
 *   value        string (ISO) for single, [string, string] for range (null = unset)
 *   onChange     (iso: string) => void   for single
 *                ([start, end]: string[]) => void  for range
 *   availableDates  string[]  ISO dates that are selectable (others greyed out)
 *   label        string  shown before the trigger button
 */

import { useState, useEffect, useRef, useCallback } from 'react'

const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

// Build a 6-row × 7-col grid for a given year+month (Mo–Su order)
function buildGrid(year, month) {
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7 // Mo=0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month + 1).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    cells.push({ day: d, iso: `${year}-${mm}-${dd}` })
  }
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

function formatRange(start, end) {
  if (!start && !end) return null
  const fmt = iso => {
    if (!iso) return '…'
    const [, m, d] = iso.split('-')
    return `${MONTH_NAMES[parseInt(m) - 1].slice(0, 3)} ${parseInt(d)}`
  }
  if (!end || start === end) return fmt(start)
  return `${fmt(start)} – ${fmt(end)}`
}

function formatSingle(iso) {
  if (!iso) return null
  const [, m, d] = iso.split('-')
  return `${MONTH_NAMES[parseInt(m) - 1].slice(0, 3)} ${parseInt(d)}`
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CalendarPicker({
  mode = 'single',
  value,
  onChange,
  availableDates = [],
  label,
}) {
  const available = new Set(availableDates)

  // Derive initial view month from available dates or value
  const initialIso = mode === 'range' ? (value?.[0] || availableDates[0]) : (value || availableDates[0])
  const initYear  = initialIso ? parseInt(initialIso.split('-')[0]) : new Date().getFullYear()
  const initMonth = initialIso ? parseInt(initialIso.split('-')[1]) - 1 : new Date().getMonth()

  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(initYear)
  const [viewMonth, setViewMonth] = useState(initMonth)
  const [hoverIso, setHoverIso] = useState(null)
  // For range: track whether we're picking start or end
  const [pickingEnd, setPickingEnd] = useState(false)

  const triggerRef = useRef(null)
  const popoverRef = useRef(null)
  const [popPos, setPopPos] = useState({ top: 0, left: 0 })

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) {
        setOpen(false)
        setPickingEnd(false)
        setHoverIso(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const openCalendar = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      // Position below the trigger, aligned left, with scroll awareness
      let top = rect.bottom + 6
      let left = rect.left
      // Clamp to viewport
      if (left + 280 > window.innerWidth) left = window.innerWidth - 290
      if (top + 340 > window.innerHeight) top = rect.top - 346
      setPopPos({ top, left })
    }
    setOpen(o => !o)
    setPickingEnd(false)
    setHoverIso(null)
  }

  const handleDayClick = useCallback((iso) => {
    if (!available.has(iso)) return

    if (mode === 'single') {
      onChange(iso)
      setOpen(false)
      return
    }

    // Range mode
    if (!pickingEnd) {
      // First click — set start, clear end
      onChange([iso, iso])
      setPickingEnd(true)
    } else {
      // Second click — set end (swap if needed)
      const [start] = Array.isArray(value) ? value : [iso, iso]
      const [s, e] = iso < start ? [iso, start] : [start, iso]
      onChange([s, e])
      setPickingEnd(false)
      setOpen(false)
      setHoverIso(null)
    }
  }, [mode, onChange, pickingEnd, value, available])

  // For range display: effective range considering hover preview
  const rangeStart = Array.isArray(value) ? value[0] : null
  const rangeEnd   = Array.isArray(value) ? value[1] : null

  const effectiveStart = pickingEnd && rangeStart && hoverIso
    ? (hoverIso < rangeStart ? hoverIso : rangeStart)
    : rangeStart
  const effectiveEnd = pickingEnd && rangeStart && hoverIso
    ? (hoverIso < rangeStart ? rangeStart : hoverIso)
    : rangeEnd

  const isInRange = (iso) => {
    if (!effectiveStart || !effectiveEnd) return false
    return iso > effectiveStart && iso < effectiveEnd
  }
  const isRangeStart = (iso) => iso === effectiveStart
  const isRangeEnd   = (iso) => iso === effectiveEnd && effectiveEnd !== effectiveStart

  // Month navigation
  const canPrev = availableDates.some(d => d < `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`)
  const canNext = availableDates.some(d => d >= `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-32`.replace('-32', '-') + '32' || d.startsWith(`${viewYear}-${String(viewMonth + 2).padStart(2, '0')}`))

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  // Trigger label
  const triggerText = mode === 'single'
    ? formatSingle(value) || label || 'Select date'
    : formatRange(rangeStart, rangeEnd) || label || 'Select range'

  const weeks = buildGrid(viewYear, viewMonth)

  // ── Cell renderer ───────────────────────────────────────────────────────────
  const renderCell = (cell, colIdx) => {
    if (!cell) return <td key={colIdx} style={{ width: 40, height: 40 }} />

    const { day, iso } = cell
    const isAvail   = available.has(iso)
    const isStart   = mode === 'range' ? isRangeStart(iso) : iso === value
    const isEnd     = mode === 'range' ? isRangeEnd(iso) : false
    const inRange   = mode === 'range' ? isInRange(iso) : false
    const isMonday  = colIdx === 0
    const isSunday  = colIdx === 6
    const isHovered = hoverIso === iso
    const selected  = isStart || isEnd

    const accentColor = '#8b5cf6'
    const bandColor   = 'rgba(139,92,246,0.18)'
    const hoverBand   = 'rgba(139,92,246,0.10)'

    // Strip extends across full cell; capped at edges for start/end/week boundaries
    const stripLeft  = (isStart || isMonday) ? '50%' : '0%'
    const stripRight = (isEnd   || isSunday) ? '50%' : '0%'
    const showStrip  = inRange || ((isStart || isEnd) && effectiveStart && effectiveEnd && effectiveStart !== effectiveEnd)

    return (
      <td key={colIdx} style={{ padding: 0, position: 'relative' }}>
        <div
          style={{
            position: 'relative',
            width: 40, height: 40,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: isAvail ? 'pointer' : 'default',
          }}
          onMouseEnter={() => isAvail && setHoverIso(iso)}
          onMouseLeave={() => setHoverIso(null)}
          onClick={() => handleDayClick(iso)}
        >
          {/* Range band */}
          {showStrip && (
            <div style={{
              position: 'absolute',
              top: 4, bottom: 4,
              left: stripLeft,
              right: stripRight,
              background: bandColor,
              pointerEvents: 'none',
            }} />
          )}

          {/* Hover highlight for non-selected available dates */}
          {isAvail && !selected && isHovered && (
            <div style={{
              position: 'absolute', inset: 4, borderRadius: '50%',
              background: hoverBand, pointerEvents: 'none',
            }} />
          )}

          {/* Selected circle */}
          {selected && (
            <div style={{
              position: 'absolute', inset: 4, borderRadius: '50%',
              background: accentColor, pointerEvents: 'none',
            }} />
          )}

          {/* Day number */}
          <span style={{
            position: 'relative', zIndex: 1,
            fontSize: 13,
            fontWeight: selected ? 700 : isAvail ? 500 : 400,
            color: selected
              ? '#fff'
              : isAvail
                ? inRange ? '#c4b5fd' : 'var(--text-primary)'
                : '#3a3a4a',
            lineHeight: 1,
            userSelect: 'none',
          }}>
            {day}
          </span>
        </div>
      </td>
    )
  }

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {label && (
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{label}</span>
      )}

      {/* Trigger button */}
      <button
        ref={triggerRef}
        onClick={openCalendar}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px',
          background: open ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.06)',
          border: open ? '1px solid rgba(139,92,246,0.5)' : '1px solid var(--border-color)',
          borderRadius: 7,
          color: rangeStart || value ? 'var(--text-primary)' : 'var(--text-secondary)',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'background 0.15s, border 0.15s',
        }}
      >
        {/* Calendar icon */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        {triggerText}
        {mode === 'range' && pickingEnd && (
          <span style={{ fontSize: 10, color: '#a78bfa', marginLeft: 2 }}>pick end →</span>
        )}
      </button>

      {/* Popover */}
      {open && (
        <div
          ref={popoverRef}
          style={{
            position: 'fixed',
            top: popPos.top,
            left: popPos.left,
            zIndex: 1000,
            background: '#16162a',
            border: '1px solid rgba(139,92,246,0.3)',
            borderRadius: 12,
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            padding: '16px 12px 12px',
            width: 292,
          }}
        >
          {/* Month navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, padding: '0 4px' }}>
            <button
              onClick={prevMonth}
              disabled={!canPrev}
              style={{
                background: 'none', border: 'none', cursor: canPrev ? 'pointer' : 'default',
                color: canPrev ? 'var(--text-primary)' : '#333', padding: 4, borderRadius: 4,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15,18 9,12 15,6" />
              </svg>
            </button>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              onClick={nextMonth}
              disabled={!canNext}
              style={{
                background: 'none', border: 'none', cursor: canNext ? 'pointer' : 'default',
                color: canNext ? 'var(--text-primary)' : '#333', padding: 4, borderRadius: 4,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9,18 15,12 9,6" />
              </svg>
            </button>
          </div>

          {/* Day-of-week headers */}
          <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
            <thead>
              <tr>
                {DOW.map(d => (
                  <th key={d} style={{
                    width: 40, height: 32,
                    fontSize: 11, fontWeight: 600,
                    color: '#555570',
                    textAlign: 'center',
                    letterSpacing: '0.03em',
                  }}>
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, wi) => (
                <tr key={wi}>
                  {week.map((cell, ci) => renderCell(cell, ci))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer hint */}
          <div style={{ marginTop: 10, padding: '8px 4px 0', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 11, color: '#555570', textAlign: 'center' }}>
            {mode === 'range'
              ? pickingEnd ? 'Click end date' : 'Click start date'
              : 'Greyed dates have no data'}
          </div>
        </div>
      )}
    </div>
  )
}
