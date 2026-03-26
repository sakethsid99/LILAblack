import { useState } from 'react'

const NAV_ITEMS = [
  {
    id: 'journey',
    label: 'Journey Nexus',
    sub: 'Match replay & paths',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        <path d="M6.34 6.34l2.12 2.12M15.54 15.54l2.12 2.12M6.34 17.66l2.12-2.12M15.54 8.46l2.12-2.12" />
      </svg>
    ),
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    sub: 'Health & trends',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: 'field-atlas',
    label: 'Field Atlas',
    sub: 'Aggregate map view',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3,6 9,3 15,6 21,3 21,18 15,21 9,18 3,21" />
        <line x1="9" y1="3" x2="9" y2="18" />
        <line x1="15" y1="6" x2="15" y2="21" />
      </svg>
    ),
  },
]

export default function LeftNav({ currentView, onViewChange }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div style={{
      width: expanded ? 220 : 64,
      minWidth: expanded ? 220 : 64,
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.22s ease, min-width 0.22s ease',
      overflow: 'hidden',
      flexShrink: 0,
      zIndex: 10,
    }}>

      {/* Logo — height must match NavBar exactly */}
      <div style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: expanded ? '0 16px' : '0',
        justifyContent: expanded ? 'flex-start' : 'center',
        borderBottom: '1px solid var(--border-color)',
        flexShrink: 0,
        boxSizing: 'border-box',
      }}>
        <img
          src="/lilagames_logo.jpeg"
          alt="LILA"
          style={{ width: 30, height: 30, borderRadius: 4, objectFit: 'contain', flexShrink: 0 }}
        />
        {expanded && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              LILA Games
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              Nexus Studio
            </div>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NAV_ITEMS.map(item => {
          const active = currentView === item.id
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              title={!expanded ? item.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: expanded ? '10px 12px' : '10px 0',
                justifyContent: expanded ? 'flex-start' : 'center',
                background: active ? 'rgba(139,92,246,0.18)' : 'transparent',
                border: active ? '1px solid rgba(139,92,246,0.35)' : '1px solid transparent',
                borderRadius: 8,
                cursor: 'pointer',
                color: active ? '#a78bfa' : 'var(--text-secondary)',
                width: '100%',
                textAlign: 'left',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }
              }}
            >
              <span style={{ flexShrink: 0 }}>{item.icon}</span>
              {expanded && (
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: active ? 'rgba(167,139,250,0.7)' : 'var(--text-secondary)', whiteSpace: 'nowrap', marginTop: 1 }}>{item.sub}</div>
                </div>
              )}
            </button>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: expanded ? 'flex-end' : 'center',
          gap: 6,
          padding: '12px 16px',
          background: 'transparent',
          border: 'none',
          borderTop: '1px solid var(--border-color)',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          fontSize: 11,
          flexShrink: 0,
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
      >
        {expanded && <span>Collapse</span>}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {expanded
            ? <polyline points="15,18 9,12 15,6" />
            : <polyline points="9,18 15,12 9,6" />}
        </svg>
      </button>
    </div>
  )
}
