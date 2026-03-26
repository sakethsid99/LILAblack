export default function MatchSummary({ summary }) {
  const stats = [
    { label: 'Players', value: summary.players, color: '#3b82f6' },
    { label: 'Bots', value: summary.bots, color: '#06b6d4' },
    { label: 'Kills', value: summary.kills, color: '#ef4444' },
    { label: 'Deaths', value: summary.deaths, color: '#f97316' },
    { label: 'Loot', value: summary.loot, color: '#eab308' },
  ]

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      padding: '12px 16px',
      minWidth: 140,
    }}>
      {stats.map(s => (
        <div key={s.label} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 13,
        }}>
          <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
          <span style={{ color: s.color, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {s.value}
          </span>
        </div>
      ))}
    </div>
  )
}
