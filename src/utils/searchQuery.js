/**
 * Parse a natural language query into a filter function that runs
 * against flattened match records from index.json.
 *
 * Each record: { day, map, matchId, humans, bots, events, total }
 * events: { Kill, Killed, BotKill, BotKilled, KilledByStorm, Loot, Position, BotPosition }
 */

const ev = (record, type) => record.events[type] || 0

export function parseQuery(raw) {
  const q = raw.toLowerCase().trim()
  if (!q) return null

  const filters = []

  // ── Event types ──────────────────────────────────────────────────
  if (/storm|killed.?by.?storm/.test(q))
    filters.push(r => ev(r, 'KilledByStorm') > 0)

  // "bot kill" = human killed a bot
  if (/bot.?kill(?!ed)|human killed.?bot|player killed.?bot/.test(q))
    filters.push(r => ev(r, 'BotKill') > 0)

  // "bot killed" = bot killed a human
  if (/bot.?killed|killed by.?bot|died.?to.?bot/.test(q))
    filters.push(r => ev(r, 'BotKilled') > 0)

  // "kill" / "kills" (human-vs-human) — avoid matching botkill/botkilled above
  if (/\b(player killed|human killed|pvp|player vs|kill(?!ed by bot|ed by storm|s? a bot|s? bots))\b/.test(q)
      || (/\bkill(s|ed)?\b/.test(q) && !/bot|storm/.test(q)))
    filters.push(r => ev(r, 'Kill') > 0)

  // "player died" / "human died" (any death)
  if (/player died|human died|someone died/.test(q))
    filters.push(r => ev(r, 'Killed') + ev(r, 'BotKilled') + ev(r, 'KilledByStorm') > 0)

  if (/\bloot(ed|ing)?\b/.test(q))
    filters.push(r => ev(r, 'Loot') > 0)

  // ── Bots ────────────────────────────────────────────────────────
  if (/no bots?|without bots?|bot.?free|only human/.test(q))
    filters.push(r => r.bots === 0)
  else if (/\bbots?\b/.test(q))
    filters.push(r => r.bots > 0)

  // ── Maps ────────────────────────────────────────────────────────
  if (/ambrose|valley/.test(q))        filters.push(r => r.map === 'AmbroseValley')
  if (/grand.?rift|rift/.test(q))      filters.push(r => r.map === 'GrandRift')
  if (/lockdown/.test(q))              filters.push(r => r.map === 'Lockdown')

  // ── Dates (Feb 10–14) ───────────────────────────────────────────
  const dateMatch = q.match(/feb(?:ruary)?\s*(1[0-4]|10)/)
  if (dateMatch)
    filters.push(r => r.day === `February_${parseInt(dateMatch[1])}`)

  if (!filters.length) return null  // unknown query

  return (record) => filters.every(f => f(record))
}

/** Flatten index.json into an array of match records */
export function flattenIndex(index) {
  const records = []
  for (const [day, maps] of Object.entries(index)) {
    for (const [map, mapData] of Object.entries(maps)) {
      for (const [matchId, info] of Object.entries(mapData.matches)) {
        records.push({ day, map, matchId, ...info })
      }
    }
  }
  return records
}
