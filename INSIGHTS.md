# Game Insights — Journey Nexus

Three data-backed observations for level designers, derived from five days of telemetry (Feb 10–14) across AmbroseValley, GrandRift, and Lockdown.

---

## Insight 1 — The Storm Is Barely a Threat on GrandRift

**What caught our eye**

Using the Journey Nexus search bar — type *"storm"* or *"KilledByStorm"* — and filter results by map. The contrast between maps is stark.

**The data**

Across all five days, `KilledByStorm` appears in **39 matches total**. Breaking that down by map (counted directly from the event report):

| Map | Matches with KilledByStorm | Share |
|---|---|---|
| AmbroseValley | 17 | 43.6% |
| Lockdown | 17 | 43.6% |
| GrandRift | **5** | **12.8%** |

GrandRift accounts for 13% of storm deaths — one-third the rate of either other map. The timeline scrubber confirms the pattern: on GrandRift matches that do have a `KilledByStorm` event, it appears very late in the match clock — players who die to the storm on GrandRift are outliers, not a regular population.

**Why a level designer should care**

The storm is a core tension mechanic — it is meant to shrink the play space and force engagements. If players are not dying to it on GrandRift, they are either (a) navigating the map faster, (b) the storm circle is landing in positions that are easy to escape, or (c) the map's geometry makes the storm boundary obvious early. The storm is effectively decorative on GrandRift right now.

**Actionable items**

- Audit GrandRift's safe zone spawn probability. If the final circles consistently favour the large central area, players with positional awareness will never be caught.
- Add natural bottlenecks near map edges to punish late rotations — currently players can loop around without committing to a direction.
- Track: `KilledByStorm rate per match` per map. Target parity (±20%) across all three maps as a design health metric.

---

## Insight 2 — Bots Are Killing Players at 11× the Rate of the Storm

**What caught our eye**

Searching *"bot killed"* in the search bar returns results across almost every session. Switching to the Death Zones heatmap (💀) and comparing it to the Kill Zones heatmap (🔥) shows the death density is higher and more spread out than kill density — deaths are not concentrated at the same choke points as kills.

**The data**

- `KilledByStorm`: **39 matches** contain this event
- `BotKilled` (human killed by a bot): **432 matches** contain this event — **11× more common**

Individual matches show up to **11 BotKilled events in a single match** (e.g. February 10, AmbroseValley). The match summary panel in Journey Nexus shows this directly: load a high-bot match and watch the Deaths counter. Playing the timeline forward, bot kills cluster in the first half of the match clock, not the final circle — meaning bots are not just cleanup, they are active early threats.

**Why a level designer should care**

If bots are the primary cause of player death, they are effectively setting the game's difficulty ceiling. Players who die early to bots never reach the storm or PvP phase, which means the late-game content (storm shrink, final PvP) is not being experienced. This may be intentional for onboarding, but the ratio deserves a deliberate decision.

**Actionable items**

- Segment `BotKilled` events by time-in-match. If the majority happen in the first 30% of match duration, bot aggression in the early zone needs review.
- Compare `BotKilled` rate across maps. If one map has significantly higher bot-kill density (visible on the Death Zones heatmap), check bot spawn placement relative to player landing zones.
- Track: `% of player deaths attributed to bots` as a tuning dial. A target band (e.g. 30–50%) would make bot contribution intentional rather than accidental.

---

## Insight 3 — Loot Density and Kill Density Overlap in Predictable Chokepoints

**What caught our eye**

Enabling the Kill Zones heatmap (🔥) and then using the event filter to toggle Loot markers on, the red glow clusters and the yellow hexagons occupy the same map regions. This is not random — players are fighting where the loot is.

The match summary panel's **Loot** counter is the fastest signal: matches with high loot counts (34+ events, as seen on February 10 AmbroseValley) consistently show high kill counts in the same session. Low-loot matches trend toward lower combat engagement overall.

**The data**

- On AmbroseValley, the Kill Zones heatmap concentrates in the central compound area and the south-east building cluster — the same areas where Loot markers appear densest when the event filter is active.
- Matches with ≥ 7 kills (visible in the match summary) tend to also show ≥ 20 loot events. Matches with 0–2 kills rarely exceed 10 loot events.
- The correlation is visible directly in the tool: scrub the timeline to mid-match on a high-kill session and watch kill events appear immediately after loot events at the same coordinates.

**Why a level designer should care**

Loot placement is a lever for controlling where conflict happens. If loot and kills are co-located, the current loot layout is successfully funnelling players into the intended engagement zones. But it also means players who land away from loot-dense areas are opting out of combat entirely — they survive longer but contribute less to match intensity.

**Actionable items**

- Use the Traffic heatmap (〰) alongside the Kill Zones heatmap to separate *movement corridors* from *conflict zones*. If traffic flows through an area but kills do not, that area is being used as a pass-through rather than a destination — an opportunity to place a loot cache and create emergent fights.
- Identify loot-dense areas with *zero* kill activity (visible as yellow hexagons with no red glow nearby). These are "safe farm" zones that reduce game tension — consider thinning loot there or adding dynamic cover.
- Track: `kills per loot event` per zone as a conflict efficiency metric. A zone where players loot but never fight is a pacing problem.

---

## How We Found These — PM Feature Highlights

All three insights were found using features built into Journey Nexus without writing a single query:

**Natural-language search bar** — Typing *"storm"*, *"bot killed"*, or *"GrandRift kills"* instantly surfaces the relevant matches from the full dataset. No SQL, no spreadsheet. This was the fastest way to isolate the KilledByStorm rarity (Insight 1) and the BotKilled dominance (Insight 2).

**Timeline scrubber with real-game timestamps** — The scrubber displays actual match duration in MM:SS (e.g. *0:00 / 4:12*) and supports 1×–10× playback speed. Watching when in the match bot kills happen — first half vs. final circle — was only possible because the timestamps reflect real elapsed game time, not arbitrary tick indices.

**Match summary panel** — The live counts of Players, Bots, Kills, Deaths, and Loot events gave us the first signal for Insight 3. Sorting mentally by Loot count while switching matches revealed the kill/loot correlation before we even opened the heatmap.
