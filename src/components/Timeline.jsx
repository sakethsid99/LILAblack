import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

const SPEED_OPTIONS = [1, 2, 5, 10]

// Combat events to mark on the scrubber (matches map shape/color)
const MARKER_EVENTS = {
  Kill:          { color: '#ef4444', label: '▲' },
  Killed:        { color: '#7f1d1d', label: '✕' },
  BotKill:       { color: '#f97316', label: '◆' },
  BotKilled:     { color: '#92400e', label: '⬟' },
  KilledByStorm: { color: '#a855f7', label: '★' },
}

// SVG shape paths centered at (0,0), sized ~8px
function MarkerShape({ type, color }) {
  const s = 5 // half-size
  switch (type) {
    case 'Kill':
      return <polygon points={`0,${-s} ${s},${s} ${-s},${s}`} fill={color} />
    case 'Killed': {
      const t = s * 0.35
      return <polygon points={[
        [-s,-t],[-t,-t],[-t,-s],[t,-s],[t,-t],[s,-t],
        [s,t],[t,t],[t,s],[-t,s],[-t,t],[-s,t],
      ].map(p=>p.join(',')).join(' ')} fill={color} />
    }
    case 'BotKill':
      return <polygon points={`0,${-s} ${s},0 0,${s} ${-s},0`} fill={color} />
    case 'BotKilled': {
      const pts = Array.from({length:5},(_,i)=>{
        const a = (Math.PI*2*i)/5 - Math.PI/2
        return `${(s*Math.cos(a)).toFixed(2)},${(s*Math.sin(a)).toFixed(2)}`
      }).join(' ')
      return <polygon points={pts} fill={color} />
    }
    case 'KilledByStorm': {
      const inner = s * 0.45
      const pts = Array.from({length:10},(_,i)=>{
        const a = (Math.PI*2*i)/10 - Math.PI/2
        const r = i%2===0 ? s : inner
        return `${(r*Math.cos(a)).toFixed(2)},${(r*Math.sin(a)).toFixed(2)}`
      }).join(' ')
      return <polygon points={pts} fill={color} />
    }
    default: return null
  }
}

export default function Timeline({
  timeRange, currentGameTime, playbackTime, setPlaybackTime,
  playing, setPlaying, matchEvents,
}) {
  const [speed, setSpeed] = useState(1)
  const rafRef = useRef(null)
  const lastFrameRef = useRef(null)
  const trackRef = useRef(null)

  // RAF playback
  useEffect(() => {
    if (!playing || timeRange.duration === 0) {
      lastFrameRef.current = null
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }
    const tick = (timestamp) => {
      if (lastFrameRef.current === null) lastFrameRef.current = timestamp
      const elapsed = (timestamp - lastFrameRef.current) / 1000
      lastFrameRef.current = timestamp
      const progressDelta = (elapsed * speed) / timeRange.duration
      setPlaybackTime(prev => {
        const next = prev + progressDelta
        if (next >= 1) { setPlaying(false); return 1 }
        return next
      })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [playing, speed, timeRange.duration, setPlaybackTime, setPlaying])

  // Click/drag on custom track
  const scrubFromEvent = useCallback((clientX) => {
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    setPlaybackTime(frac)
  }, [setPlaybackTime])

  const isDragging = useRef(false)
  const onTrackMouseDown = useCallback((e) => {
    isDragging.current = true
    scrubFromEvent(e.clientX)
    const onMove = (ev) => { if (isDragging.current) scrubFromEvent(ev.clientX) }
    const onUp = () => { isDragging.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [scrubFromEvent])

  const skip = useCallback((gameSeconds) => {
    if (timeRange.duration === 0) return
    setPlaybackTime(prev => Math.max(0, Math.min(1, prev + gameSeconds / timeRange.duration)))
  }, [timeRange.duration, setPlaybackTime])

  const handlePlayPause = useCallback(() => {
    if (playing) { setPlaying(false) }
    else { if (playbackTime >= 1) setPlaybackTime(0); setPlaying(true) }
  }, [playing, playbackTime, setPlaying, setPlaybackTime])

  const cycleSpeed = useCallback(() => {
    setSpeed(prev => SPEED_OPTIONS[(SPEED_OPTIONS.indexOf(prev) + 1) % SPEED_OPTIONS.length])
  }, [])

  const formatTime = (t) => {
    const elapsed = Math.max(0, t - timeRange.start)
    const m = Math.floor(elapsed / 60)
    const s = Math.floor(elapsed % 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }

  // Compute marker positions (deduplicated by type+approx position)
  const markers = useMemo(() => {
    if (!matchEvents || timeRange.duration === 0) return []
    return matchEvents
      .filter(e => MARKER_EVENTS[e.e])
      .map(e => ({ type: e.e, frac: e.t / timeRange.duration }))
      .filter(m => m.frac >= 0 && m.frac <= 1)
  }, [matchEvents, timeRange.duration])

  const btnStyle = {
    width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
    borderRadius: 8, color: 'var(--text-primary)', fontSize: 14, cursor: 'pointer',
    flexShrink: 0,
  }
  const playBtnStyle = { ...btnStyle, width: 36, height: 36, background: 'var(--accent)', border: 'none', fontSize: 16 }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', flex: 1 }}>
      {/* Rewind */}
      <button style={btnStyle} onClick={() => skip(-30)} title="Rewind 30s">⏪</button>

      {/* Play/Pause */}
      <button style={playBtnStyle} onClick={handlePlayPause}>
        {playing ? '⏸' : '▶'}
      </button>

      {/* Forward */}
      <button style={btnStyle} onClick={() => skip(30)} title="Forward 30s">⏩</button>

      {/* Speed */}
      <button
        style={{ ...btnStyle, width: 'auto', padding: '0 8px', fontSize: 11, fontWeight: 600 }}
        onClick={cycleSpeed}
      >
        {speed}x
      </button>

      {/* Custom scrubber with event markers */}
      <div
        ref={trackRef}
        onMouseDown={onTrackMouseDown}
        style={{
          flex: 1, height: 28, position: 'relative',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
        }}
      >
        {/* Track background */}
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 4,
          background: 'var(--bg-tertiary)', borderRadius: 2,
        }} />
        {/* Progress fill */}
        <div style={{
          position: 'absolute', left: 0, width: `${playbackTime * 100}%`, height: 4,
          background: 'var(--accent)', borderRadius: 2,
        }} />

        {/* Event markers */}
        {markers.map((m, i) => {
          const { color } = MARKER_EVENTS[m.type]
          return (
            <svg
              key={i}
              style={{
                position: 'absolute',
                left: `calc(${m.frac * 100}% - 6px)`,
                top: '50%', transform: 'translateY(-50%)',
                overflow: 'visible', pointerEvents: 'none',
              }}
              width={12} height={12}
              viewBox="-6 -6 12 12"
            >
              <MarkerShape type={m.type} color={color} />
            </svg>
          )
        })}

        {/* Thumb */}
        <div style={{
          position: 'absolute',
          left: `calc(${playbackTime * 100}% - 7px)`,
          width: 14, height: 14,
          background: 'var(--accent)', borderRadius: '50%',
          border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
          pointerEvents: 'none',
        }} />
      </div>

      {/* Time display */}
      <span style={{
        fontSize: 11, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums',
        minWidth: 90, textAlign: 'right', flexShrink: 0,
      }}>
        {formatTime(currentGameTime)} / {formatTime(timeRange.end)}
      </span>
    </div>
  )
}
