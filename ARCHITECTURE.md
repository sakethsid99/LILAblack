# Architecture — Journey Nexus

## What We Built and Why

| Choice | Rationale |
|---|---|
| **React + Vite** | Fast HMR during iteration; React's component model maps cleanly to the panel layout (nav / map / timeline / filters) |
| **Canvas 2D (no WebGL)** | Matches have at most a few thousand events per session — Canvas 2D is more than fast enough and requires zero GPU setup or shader knowledge |
| **Static JSON (no backend)** | All data is read-only and pre-known. Serving flat files from `public/` removes a whole infrastructure tier and makes the tool work offline |
| **Python preprocessing** | Parquet → JSON in one script (`preprocess.py`). Keeps the frontend dumb: it just fetches JSON, no Parquet parsing in the browser |
| **No CSS framework** | The UI surface is small and dark-themed. CSS variables + inline styles give full control without fighting a framework's design assumptions |

---

## Data Flow

```
player_data/*.parquet
        │
        ▼  preprocess.py
        │  • Reads parquet with pandas/pyarrow
        │  • Groups rows by match_id (multiple player UUIDs share one match_id)
        │  • Converts timestamps: 1 stored millisecond = 1 real game second
        │  • Normalises timestamps to match-relative seconds (t=0 at match start)
        │  • Writes public/data/index.json  (match catalogue)
        │  • Writes public/data/{Day}/{Map}.json  (full event arrays)
        │
        ▼  Browser — App.jsx
        │  • Fetches index.json once on mount
        │  • Fetches {Day}/{Map}.json when the user changes day or map
        │  • Derives currentEvents, timestamps, timeRange, visibleEvents from state
        │
        ├──▶ NavBar  (day / map / match selectors, search bar)
        ├──▶ MapCanvas  (Canvas draw loop — minimap + trails + markers + heatmap)
        └──▶ BottomPanel
               ├──▶ MatchSummary  (players / bots / kills / deaths / loot)
               ├──▶ Timeline  (RAF playback loop, custom scrubber, event markers)
               └──▶ EventFilters  (per-type toggle checkboxes)
```

---

## Coordinate Mapping — Game World → Minimap Pixel

This was the trickiest part. Each minimap image is 1024 × 1024 px and represents a fixed region of the game world. The README in `player_data/` gives per-map calibration constants:

```
AmbroseValley:  originX = -370,  originZ = -473,  scale = 900
GrandRift:      originX = -290,  originZ = -290,  scale = 581
Lockdown:       originX = -500,  originZ = -500,  scale = 1000
```

The formula:

```
u = (worldX − originX) / scale        // 0..1 left→right
v = (worldZ − originZ) / scale        // 0..1 bottom→top

canvasX = offsetX + u × drawWidth
canvasY = offsetY + (1 − v) × drawHeight   // Y-flip: image origin is top-left
```

`offsetX/Y` and `drawWidth/Height` come from a letterbox-fit calculation that centres the minimap image inside the canvas while preserving aspect ratio. Zoom and pan are applied as a CSS-like translate/scale transform around the canvas centre point.

Early prototypes used a viewport-remapping layer with pixel-space bounds (e.g. `right: 3874`) that produced severe offsets — points appeared in the black border outside the map. The fix was to discard that layer entirely and apply the README formula directly.

---

## Assumptions Made

| Ambiguity | Assumption |
|---|---|
| **Timestamp units** | Stored values are in milliseconds but represent seconds (1 ms stored = 1 real second). Evidence: a match recorded as 252 ms span = exactly 4 m 12 s of real gameplay. |
| **Multiple UUIDs per match** | Rows with different `user_id` values sharing a `match_id` are the same match. All are merged into one event array during preprocessing. |
| **`b` flag = bot** | The boolean column `b` in the parquet schema is treated as `is_bot`. Bots use `BotPosition`/`BotKill`/`BotKilled`; humans use `Position`/`Kill`/`Killed`. |
| **Lockdown absent Feb 14** | No Lockdown data exists for February 14. Treated as expected — no error is shown, the day/map combination simply returns no matches. |
| **Event counts in index** | `index.json` summarises event type counts per match at preprocessing time. These are the source of truth for the search feature and match summary badges. |

---

## Major Tradeoffs

| Decision | Alternative Considered | Why We Chose This |
|---|---|---|
| Static JSON files | Live query against parquet / DuckDB | Simpler deploy, works offline, sufficient for this dataset size |
| Canvas 2D draw-on-state-change | Animated WebGL renderer | Overkill for event counts; Canvas redraws in < 2 ms |
| Regex keyword search | Embedding-based semantic search (AI) | No API key, no latency, fully deterministic, works offline |
| Single JSON file per day+map | One file per match | Reduces fetch count from ~200 to ~15; match data is small enough to hold all in memory |
| Heatmap via radial gradient blobs | Binned density grid + colour ramp | Simpler code, no pixel-buffer manipulation, visually smooth at this point density |
