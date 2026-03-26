import { useMemo, useState } from 'react'
import CalendarPicker from './CalendarPicker'

const DAYS = ['February_10', 'February_11', 'February_12', 'February_13', 'February_14']
const MAPS = ['AmbroseValley', 'GrandRift', 'Lockdown']
const MAP_COLORS = { AmbroseValley: '#8b5cf6', GrandRift: '#06b6d4', Lockdown: '#f97316' }

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

// ── Simple SVG bar chart ─────────────────────────────────────────────────────
function BarChart({ data, height = 120, label }) {
  // data: [{ label, values: { AmbroseValley: n, GrandRift: n, Lockdown: n } }]
  if (!data || data.length === 0) return null
  const maxVal = Math.max(...data.flatMap(d => Object.values(d.values)))
  const W = 460
  const barGroupW = W / data.length
  const barW = Math.min(16, (barGroupW - 8) / 3)
  const padX = (barGroupW - barW * 3 - 4) / 2

  return (
    <div>
      {label && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{label}</div>}
      <svg width="100%" viewBox={`0 0 ${W} ${height + 24}`} style={{ overflow: 'visible' }}>
        {data.map((d, gi) => {
          const gx = gi * barGroupW
          return (
            <g key={d.label}>
              {MAPS.map((map, mi) => {
                const val = d.values[map] || 0
                const bh = maxVal > 0 ? (val / maxVal) * height : 0
                const bx = gx + padX + mi * (barW + 2)
                return (
                  <g key={map}>
                    <rect
                      x={bx} y={height - bh}
                      width={barW} height={bh}
                      fill={MAP_COLORS[map]}
                      opacity={0.85}
                      rx={2}
                    />
                    {val > 0 && bh > 16 && (
                      <text x={bx + barW / 2} y={height - bh + 11} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.8)">{val}</text>
                    )}
                  </g>
                )
              })}
              <text x={gx + barGroupW / 2} y={height + 16} textAnchor="middle" fontSize={10} fill="var(--text-secondary)">{d.label}</text>
            </g>
          )
        })}
        <line x1={0} y1={height} x2={W} y2={height} stroke="var(--border-color)" strokeWidth={1} />
      </svg>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
        {MAPS.map(m => (
          <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-secondary)' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: MAP_COLORS[m] }} />
            {m}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Horizontal bar ───────────────────────────────────────────────────────────
function HBar({ label, value, max, color, suffix = '' }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{value.toLocaleString()}{suffix}</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)' }}>
        <div style={{ height: '100%', borderRadius: 3, background: color, width: `${pct}%`, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  )
}

// ── Metric card ──────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, color = '#8b5cf6', icon }) {
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: 10,
      padding: '16px 20px',
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 5 }}>{sub}</div>}
        </div>
        {icon && <span style={{ fontSize: 22, opacity: 0.6 }}>{icon}</span>}
      </div>
    </div>
  )
}

// ── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard({ index }) {
  // Range stored as [startISO, endISO]
  const [range, setRange] = useState(['2026-02-10', '2026-02-14'])

  const selectedDays = useMemo(() => {
    const [s, e] = range
    return DAYS.filter(day => {
      const iso = DAY_TO_ISO[day]
      return iso >= s && iso <= e
    })
  }, [range])

  const stats = useMemo(() => {
    if (!index) return null

    let totalMatches = 0
    const matchesByMap = { AmbroseValley: 0, GrandRift: 0, Lockdown: 0 }
    const matchesByDay = {}
    const eventsByMap = { AmbroseValley: {}, GrandRift: {}, Lockdown: {} }
    let totalKills = 0, totalDeaths = 0, totalStorm = 0, totalBotKills = 0, totalLoot = 0
    let totalHumans = 0, totalBots = 0

    selectedDays.forEach(day => {
      matchesByDay[day] = { AmbroseValley: 0, GrandRift: 0, Lockdown: 0 }
      if (!index[day]) return
      MAPS.forEach(map => {
        const mapData = index[day][map]
        if (!mapData) return
        const count = mapData.matchCount || Object.keys(mapData.matches).length
        matchesByDay[day][map] = count
        matchesByMap[map] += count
        totalMatches += count

        Object.values(mapData.matches).forEach(match => {
          totalHumans += match.humans || 0
          totalBots += match.bots || 0
          const ev = match.events || {}
          Object.entries(ev).forEach(([type, cnt]) => {
            eventsByMap[map][type] = (eventsByMap[map][type] || 0) + cnt
          })
          totalKills += (ev.Kill || 0) + (ev.BotKill || 0)
          totalDeaths += (ev.Killed || 0) + (ev.BotKilled || 0) + (ev.KilledByStorm || 0)
          totalStorm += ev.KilledByStorm || 0
          totalBotKills += ev.BotKilled || 0
          totalLoot += ev.Loot || 0
        })
      })
    })

    const chartData = selectedDays.map(day => {
      const iso = DAY_TO_ISO[day]
      const dayNum = iso.split('-')[2]
      return { label: dayNum, values: matchesByDay[day] }
    })

    const maxMapMatches = Math.max(...Object.values(matchesByMap), 1)
    const [s, e] = range
    const fmtIso = iso => { const [,m,d] = iso.split('-'); return `Feb ${parseInt(d)}` }

    return {
      totalMatches, matchesByMap, maxMapMatches, chartData,
      totalKills, totalDeaths, totalStorm, totalBotKills, totalLoot,
      totalHumans, totalBots, eventsByMap,
      rangeLabel: `${fmtIso(s)} – ${fmtIso(e)}`,
    }
  }, [index, selectedDays, range])

  if (!index) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
      Loading index…
    </div>
  )

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', minHeight: 0 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Player health & map behaviour
          </p>
        </div>
        <CalendarPicker
          mode="range"
          value={range}
          onChange={setRange}
          availableDates={AVAILABLE_ISO}
          label="Date range"
        />
      </div>

      {stats && (
        <>
          {/* Metric cards */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <MetricCard label="Total Matches" value={stats.totalMatches} sub={stats.rangeLabel} color="#8b5cf6" icon="🎮" />
            <MetricCard label="Total Kills" value={stats.totalKills.toLocaleString()} sub="Kill + BotKill events" color="#ef4444" icon="⚔️" />
            <MetricCard label="Total Deaths" value={stats.totalDeaths.toLocaleString()} sub="Killed + BotKilled + Storm" color="#f97316" icon="💀" />
            <MetricCard label="Storm Deaths" value={stats.totalStorm} sub={`${stats.totalMatches > 0 ? ((stats.totalStorm / stats.totalMatches) * 100).toFixed(1) : 0}% of matches`} color="#a855f7" icon="🌀" />
            <MetricCard label="Loot Events" value={stats.totalLoot.toLocaleString()} sub="Across all matches" color="#eab308" icon="📦" />
          </div>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

            {/* Matches per day */}
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Matches per Day</div>
              <BarChart data={stats.chartData} label="" height={110} />
            </div>

            {/* Map breakdown */}
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Matches by Map</div>
              {MAPS.map(map => (
                <HBar
                  key={map}
                  label={map}
                  value={stats.matchesByMap[map]}
                  max={stats.maxMapMatches}
                  color={MAP_COLORS[map]}
                />
              ))}
            </div>
          </div>

          {/* Event breakdown per map */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Event Distribution by Map</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['Map', 'Position', 'BotPosition', 'Kill', 'Killed', 'BotKill', 'BotKilled', 'Storm Deaths', 'Loot'].map(h => (
                      <th key={h} style={{ textAlign: h === 'Map' ? 'left' : 'right', padding: '6px 12px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border-color)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MAPS.map(map => {
                    const ev = stats.eventsByMap[map]
                    return (
                      <tr key={map}>
                        <td style={{ padding: '8px 12px', color: MAP_COLORS[map], fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: MAP_COLORS[map] }} />
                            {map}
                          </div>
                        </td>
                        {['Position', 'BotPosition', 'Kill', 'Killed', 'BotKill', 'BotKilled', 'KilledByStorm', 'Loot'].map(type => (
                          <td key={type} style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                            {(ev[type] || 0).toLocaleString()}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Player vs Bot */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Human vs Bot Activity</div>
              <div style={{ display: 'flex', gap: 24 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#06b6d4' }}>{stats.totalHumans.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Human participations</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#22c55e' }}>{stats.totalBots.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Bot participations</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#ef4444' }}>{stats.totalBotKills.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Deaths by bot</div>
                </div>
              </div>
              {(stats.totalHumans + stats.totalBots) > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ height: 8, borderRadius: 4, background: '#22c55e', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ background: '#06b6d4', width: `${(stats.totalHumans / (stats.totalHumans + stats.totalBots)) * 100}%` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                    <span style={{ color: '#06b6d4' }}>Humans {((stats.totalHumans / (stats.totalHumans + stats.totalBots)) * 100).toFixed(0)}%</span>
                    <span style={{ color: '#22c55e' }}>Bots {((stats.totalBots / (stats.totalHumans + stats.totalBots)) * 100).toFixed(0)}%</span>
                  </div>
                </div>
              )}
            </div>

            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Storm Death Rate by Map</div>
              {MAPS.map(map => {
                const stormCount = stats.eventsByMap[map]['KilledByStorm'] || 0
                const mapMatches = stats.matchesByMap[map]
                const rate = mapMatches > 0 ? ((stormCount / mapMatches) * 100).toFixed(1) : '0.0'
                return (
                  <div key={map} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: MAP_COLORS[map] }}>{map}</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{stormCount} deaths ({rate}%)</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)' }}>
                      <div style={{ height: '100%', borderRadius: 3, background: '#a855f7', width: `${Math.min(parseFloat(rate) * 4, 100)}%` }} />
                    </div>
                  </div>
                )
              })}
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 12, marginBottom: 0 }}>
                % = matches with ≥1 storm death ÷ total matches on that map
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
