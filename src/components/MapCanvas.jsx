import { useRef, useEffect, useCallback, useState, useMemo } from 'react'

// Color per event type
const EVENT_COLORS = {
  Position:      '#3b82f6', // blue
  BotPosition:   '#22c55e', // green
  Kill:          '#ef4444', // red
  Killed:        '#7f1d1d', // dark red
  BotKill:       '#f97316', // orange
  BotKilled:     '#92400e', // dark orange
  KilledByStorm: '#a855f7', // purple
  Loot:          '#eab308', // yellow
}

// Size per event type (radius/half-size in canvas px)
const EVENT_SIZE = {
  Position:      3,
  BotPosition:   3,
  Kill:          5,
  Killed:        5,
  BotKill:       5,
  BotKilled:     5,
  KilledByStorm: 6,
  Loot:          5,
}

// Draw the correct shape for each event type
function drawShape(ctx, type, cx, cy, r) {
  ctx.beginPath()
  switch (type) {
    case 'Position':
      // Circle ●
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      break
    case 'BotPosition':
      // Square ■
      ctx.rect(cx - r, cy - r, r * 2, r * 2)
      break
    case 'Kill':
      // Triangle ▲
      ctx.moveTo(cx, cy - r)
      ctx.lineTo(cx + r, cy + r)
      ctx.lineTo(cx - r, cy + r)
      ctx.closePath()
      break
    case 'Killed': {
      // Cross ✕
      const t = r * 0.35
      ctx.moveTo(cx - r, cy - t); ctx.lineTo(cx - t, cy - t)
      ctx.lineTo(cx - t, cy - r); ctx.lineTo(cx + t, cy - r)
      ctx.lineTo(cx + t, cy - t); ctx.lineTo(cx + r, cy - t)
      ctx.lineTo(cx + r, cy + t); ctx.lineTo(cx + t, cy + t)
      ctx.lineTo(cx + t, cy + r); ctx.lineTo(cx - t, cy + r)
      ctx.lineTo(cx - t, cy + t); ctx.lineTo(cx - r, cy + t)
      ctx.closePath()
      break
    }
    case 'BotKill': {
      // Diamond ◆
      ctx.moveTo(cx, cy - r)
      ctx.lineTo(cx + r, cy)
      ctx.lineTo(cx, cy + r)
      ctx.lineTo(cx - r, cy)
      ctx.closePath()
      break
    }
    case 'BotKilled': {
      // Pentagon ⬟
      for (let i = 0; i < 5; i++) {
        const a = (Math.PI * 2 * i) / 5 - Math.PI / 2
        i === 0 ? ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
                : ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
      }
      ctx.closePath()
      break
    }
    case 'KilledByStorm': {
      // Star ★ (5-pointed)
      const inner = r * 0.45
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI * 2 * i) / 10 - Math.PI / 2
        const rad = i % 2 === 0 ? r : inner
        i === 0 ? ctx.moveTo(cx + rad * Math.cos(a), cy + rad * Math.sin(a))
                : ctx.lineTo(cx + rad * Math.cos(a), cy + rad * Math.sin(a))
      }
      ctx.closePath()
      break
    }
    case 'Loot': {
      // Hexagon
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI * 2 * i) / 6 - Math.PI / 6
        i === 0 ? ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
                : ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
      }
      ctx.closePath()
      break
    }
    default:
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
  }
}

// Per-map config from player_data/README.md (minimap images are 1024x1024 px)
const MAP_CONFIG_BY_MAP = {
  AmbroseValley: { scale: 900,  originX: -370, originZ: -473 },
  GrandRift:     { scale: 581,  originX: -290, originZ: -290 },
  Lockdown:      { scale: 1000, originX: -500, originZ: -500 },
}

function getDrawRect(img, canvasW, canvasH) {
  const imgAspect = img.width / img.height
  const canAspect = canvasW / canvasH
  let drawW, drawH, offsetX, offsetY

  if (canAspect > imgAspect) {
    drawW = canvasW
    drawH = canvasW / imgAspect
    offsetX = 0
    offsetY = (canvasH - drawH) / 2
  } else {
    drawH = canvasH
    drawW = canvasH * imgAspect
    offsetX = (canvasW - drawW) / 2
    offsetY = 0
  }

  return { drawW, drawH, offsetX, offsetY }
}

function gameToCanvas(x, z, mapId, img, canvasW, canvasH, zoom, pan) {
  const cfg = MAP_CONFIG_BY_MAP[mapId] || MAP_CONFIG_BY_MAP.AmbroseValley

  // README formula: world coords → UV (0..1) → canvas position
  const u = (x - cfg.originX) / cfg.scale
  const v = (z - cfg.originZ) / cfg.scale  // v=0 at bottom, v=1 at top

  const { drawW, drawH, offsetX, offsetY } = getDrawRect(img, canvasW, canvasH)
  const cx = offsetX + u * drawW
  const cy = offsetY + (1 - v) * drawH      // Y flipped: image origin is top-left

  return {
    x: (cx - canvasW / 2) * zoom + canvasW / 2 + pan.x,
    y: (cy - canvasH / 2) * zoom + canvasH / 2 + pan.y,
  }
}

function drawImageFit(ctx, img, canvasW, canvasH, zoom, pan) {
  const { drawW, drawH, offsetX, offsetY } = getDrawRect(img, canvasW, canvasH)

  ctx.save()
  ctx.translate(canvasW / 2 + pan.x, canvasH / 2 + pan.y)
  ctx.scale(zoom, zoom)
  ctx.translate(-canvasW / 2, -canvasH / 2)
  ctx.drawImage(img, offsetX, offsetY, drawW, drawH)
  ctx.restore()
}

const HEATMAP_MODES = {
  kills:   { label: '🔥', title: 'Kill Zones',   events: ['Kill', 'BotKill'],                          color: '#ef4444' },
  deaths:  { label: '💀', title: 'Death Zones',  events: ['Killed', 'BotKilled', 'KilledByStorm'],     color: '#a855f7' },
  traffic: { label: '〰', title: 'Traffic',       events: ['Position', 'BotPosition'],                  color: '#3b82f6' },
}

function drawHeatmap(ctx, mode, allEvents, mapId, img, w, h, zoom, pan) {
  const cfg = MAP_CONFIG_BY_MAP[mapId] || MAP_CONFIG_BY_MAP.AmbroseValley
  const { events: types, color } = HEATMAP_MODES[mode]
  const points = []

  allEvents.forEach(e => {
    if (!types.includes(e.e)) return
    const u = (e.x - cfg.originX) / cfg.scale
    const v = (e.z - cfg.originZ) / cfg.scale
    if (u < 0 || u > 1 || v < 0 || v > 1) return
    points.push(gameToCanvas(e.x, e.z, mapId, img, w, h, zoom, pan))
  })

  if (points.length === 0) return

  const radius = Math.max(20, 30 * zoom)
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  points.forEach(({ x, y }) => {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius)
    grad.addColorStop(0,   color + 'cc')
    grad.addColorStop(0.4, color + '55')
    grad.addColorStop(1,   color + '00')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.restore()
}

export default function MapCanvas({
  minimapSrc, mapId, events, allMatchEvents, zoom, pan, setPan, setZoom,
  onZoomIn, onZoomOut, onReset, loading,
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const imgRef = useRef(null)
  const draggingRef = useRef(false)
  const lastPosRef = useRef({ x: 0, y: 0 })
  const [imgLoaded, setImgLoaded] = useState(false)
  const [heatmapMode, setHeatmapMode] = useState(null)

  const toggleHeatmap = useCallback((mode) => {
    setHeatmapMode(prev => prev === mode ? null : mode)
  }, [])

  // Load minimap image
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      setImgLoaded(true)
    }
    img.onerror = () => {
      imgRef.current = null
      setImgLoaded(false)
    }
    img.src = minimapSrc
    setImgLoaded(false)
  }, [mapId, minimapSrc])

  // Render
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const rect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    canvas.style.width = rect.width + 'px'
    canvas.style.height = rect.height + 'px'

    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    const w = rect.width
    const h = rect.height

    // Background
    ctx.fillStyle = '#111111'
    ctx.fillRect(0, 0, w, h)

    // Draw grid
    ctx.save()
    ctx.translate(w / 2 + pan.x, h / 2 + pan.y)
    ctx.scale(zoom, zoom)
    ctx.translate(-w / 2, -h / 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 1
    const gridSize = 40
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
    }
    ctx.restore()

    // Draw minimap
    const img = imgRef.current
    if (img && imgLoaded) {
      drawImageFit(ctx, img, w, h, zoom, pan)
    }

    // Draw heatmap overlay (under event markers, over minimap)
    if (img && imgLoaded && heatmapMode && allMatchEvents?.length) {
      drawHeatmap(ctx, heatmapMode, allMatchEvents, mapId, img, w, h, zoom, pan)
    }

    // Draw events
    if (img && imgLoaded) {
      const cfg = MAP_CONFIG_BY_MAP[mapId] || MAP_CONFIG_BY_MAP.AmbroseValley

      // --- Dashed paths per player (Position + BotPosition only) ---
      const pathsByUser = {}
      events.forEach(e => {
        if (e.e !== 'Position' && e.e !== 'BotPosition') return
        const u = (e.x - cfg.originX) / cfg.scale
        const v = (e.z - cfg.originZ) / cfg.scale
        if (u < 0 || u > 1 || v < 0 || v > 1) return
        if (!pathsByUser[e.u]) pathsByUser[e.u] = { color: EVENT_COLORS[e.e], points: [] }
        pathsByUser[e.u].points.push(gameToCanvas(e.x, e.z, mapId, img, w, h, zoom, pan))
      })

      Object.values(pathsByUser).forEach(({ color, points }) => {
        if (points.length < 2) return
        ctx.save()
        ctx.setLineDash([4, 6])
        ctx.lineDashOffset = 0
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5
        ctx.globalAlpha = 0.5
        ctx.beginPath()
        ctx.moveTo(points[0].x, points[0].y)
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y)
        }
        ctx.stroke()
        ctx.restore()
      })

      // --- Shaped markers on top ---
      events.forEach(e => {
        const u = (e.x - cfg.originX) / cfg.scale
        const v = (e.z - cfg.originZ) / cfg.scale
        if (u < 0 || u > 1 || v < 0 || v > 1) return

        const pos = gameToCanvas(e.x, e.z, mapId, img, w, h, zoom, pan)
        const color = EVENT_COLORS[e.e] || '#ffffff'
        const size = (EVENT_SIZE[e.e] || 3) * Math.min(zoom, 3)

        ctx.globalAlpha = 0.85
        ctx.fillStyle = color
        drawShape(ctx, e.e, pos.x, pos.y, size)
        ctx.fill()
        ctx.globalAlpha = 1
      })
    }

    // Loading indicator
    if (loading) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = '#ffffff'
      ctx.font = '16px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Loading...', w / 2, h / 2)
    }
  }, [events, allMatchEvents, mapId, zoom, pan, imgLoaded, loading, heatmapMode])

  // Resize observer
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(() => {
      // Trigger re-render by forcing state update
      setImgLoaded(prev => prev)
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  // Pan handlers
  const onMouseDown = useCallback((e) => {
    draggingRef.current = true
    lastPosRef.current = { x: e.clientX, y: e.clientY }
  }, [])

  const onMouseMove = useCallback((e) => {
    if (!draggingRef.current) return
    const dx = e.clientX - lastPosRef.current.x
    const dy = e.clientY - lastPosRef.current.y
    lastPosRef.current = { x: e.clientX, y: e.clientY }
    setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }))
  }, [setPan])

  const onMouseUp = useCallback(() => {
    draggingRef.current = false
  }, [])

  // Zoom with wheel
  const onWheel = useCallback((e) => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.1 : 0.9
    setZoom(z => Math.max(0.45, Math.min(10, z * factor)))
  }, [setZoom])

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      el.requestFullscreen()
    }
  }, [])

  const toolBtnStyle = {
    width: 40, height: 40,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 10,
    color: 'var(--text-primary)',
    fontSize: 18,
    cursor: 'pointer',
  }

  const heatBtnStyle = (mode) => ({
    ...toolBtnStyle,
    background: heatmapMode === mode ? 'var(--accent)' : 'var(--bg-secondary)',
    border: heatmapMode === mode ? '1px solid var(--accent)' : '1px solid var(--border-color)',
    fontSize: 16,
  })

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', cursor: draggingRef.current ? 'grabbing' : 'grab' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
      />

      {/* Zoom indicator */}
      <div style={{
        position: 'absolute', top: 12, right: 12,
        background: 'rgba(42,42,42,0.85)', borderRadius: 6,
        padding: '4px 10px', fontSize: 12, color: 'var(--text-secondary)',
      }}>
        {Math.round(zoom * 100)}%
      </div>

      {/* Floating tools — bottom right */}
      <div style={{
        position: 'absolute', bottom: 12, right: 12,
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {/* Heatmap group — combined box */}
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 10,
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          {Object.entries(HEATMAP_MODES).map(([mode, cfg], i) => (
            <div key={mode}>
              {i > 0 && <div style={{ height: 1, background: 'var(--border-color)' }} />}
              <button
                style={{ ...heatBtnStyle(mode), border: 'none', borderRadius: 0 }}
                onClick={() => toggleHeatmap(mode)}
                title={cfg.title}
              >
                {cfg.label}
              </button>
            </div>
          ))}
        </div>

        {/* Zoom group — combined box */}
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 10,
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          <button
            style={{ ...toolBtnStyle, border: 'none', borderRadius: 0 }}
            onClick={onZoomIn} title="Zoom In"
          >+</button>
          <div style={{ height: 1, background: 'var(--border-color)' }} />
          <button
            style={{ ...toolBtnStyle, border: 'none', borderRadius: 0 }}
            onClick={onZoomOut} title="Zoom Out"
          >−</button>
        </div>

        <button style={toolBtnStyle} onClick={onReset} title="Reset View">↺</button>
        <button style={toolBtnStyle} onClick={toggleFullscreen} title="Fullscreen">⛶</button>
      </div>

      {/* Legend — top left */}
      <div style={{
        position: 'absolute', top: 12, left: 12,
        background: 'rgba(42,42,42,0.85)', borderRadius: 8,
        padding: '8px 12px', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        {Object.entries(EVENT_COLORS).map(([name, color]) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block',
            }} />
            <span style={{ color: 'var(--text-secondary)' }}>{name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
