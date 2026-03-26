// Must stay in sync with MapCanvas EVENT_COLORS / drawShape
const EVENT_STYLES = {
  Position:      { color: '#3b82f6', shape: '●' },
  BotPosition:   { color: '#22c55e', shape: '■' },
  Kill:          { color: '#ef4444', shape: '▲' },
  Killed:        { color: '#7f1d1d', shape: '✕' },
  BotKill:       { color: '#f97316', shape: '◆' },
  BotKilled:     { color: '#92400e', shape: '⬟' },
  KilledByStorm: { color: '#a855f7', shape: '★' },
  Loot:          { color: '#eab308', shape: '⬡' },
}

const CATEGORIES = {
  Movement:    ['Position', 'BotPosition'],
  Combat:      ['Kill', 'Killed', 'BotKill', 'BotKilled'],
  Environment: ['KilledByStorm'],
  Item:        ['Loot'],
}

export default function EventFilters({ filters, onToggleFilter }) {
  return (
    <div style={{ display: 'flex', gap: 24, padding: '8px 16px', alignItems: 'flex-start' }}>
      {Object.entries(CATEGORIES).map(([category, types]) => (
        <div key={category} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{
            fontSize: 10, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2,
          }}>
            {category}
          </span>
          <div style={{
            display: 'grid',
            gridTemplateColumns: category === 'Combat' ? '1fr 1fr' : '1fr',
            gap: '4px 16px',
          }}>
            {types.map(et => {
              const { color, shape } = EVENT_STYLES[et] || { color: '#fff', shape: '●' }
              return (
                <label key={et} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 12, color: 'var(--text-secondary)',
                  cursor: 'pointer', userSelect: 'none',
                }}>
                  <input
                    type="checkbox"
                    checked={filters[et] ?? true}
                    onChange={() => onToggleFilter(et)}
                    style={{ accentColor: color }}
                  />
                  <span style={{ color, fontSize: 10, lineHeight: 1 }}>{shape}</span>
                  {et}
                </label>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
