# Module: Live Map & Live Operations

> Source file: `eyvar_ops_panel_v40_fixed.html` (21,857 lines) | Page id `live` (`<div class="page" id="p-live">`) | HTML lines **L768–L845** (section comment at L767; next page `p-trips` begins L848)

All line citations below are `Lnnnn` into that single file.

---

## 1. Purpose

Two screens fused into one page (L768–L845):

1. **Left column (L773–L828)** — a map card with two mutually exclusive modes:
   - **Live** (`MAP_MODE='live'`, L11512) — a 2D **canvas** city map (`#map-canvas`, L817) drawn by `drawMap()` (L12812) showing the currently selected trip's route plus every other in-progress trip as a "flight-tracker" dot. The trip table underneath is *disabled* in this mode (L11513).
   - **History** (`MAP_MODE='history'`) — the same canvas, but with a date picker, a replayable trip picker, status filter chips and a full table of that date's trips (L11522, L12660).
2. **Right sidebar (L830–L843)** — the Live-Ops dispatch board: Active trips (L831–L834), Sub trip requests (L835–L838), Ride requests (L839–L842), rendered by `renderLiveOps()` (L11504).

The page header text is hardcoded: `Live map & Route history` / `Track active trips, monitor requests, and step in when needed` (L770). The toolbar title/subtitle come from the `titles` / `subs` maps: `live:'Live Map & Route History'` (L2168) and `live:'Track active trips and replay historical routes'` (L2169).

---

## 2. Entry points & routing

| Path | Line | Notes |
|---|---|---|
| Sidebar nav item `go('live',this)` | L498 | label `Live map`, `data-i18n="nav.live"` |
| Router branch in `window.go` | **L8790** | `if(id==='live'){renderMapFilterSelects();renderMapTripsTable();setTimeout(function(){setMapMode(MAP_MODE||'live');},50);renderLiveOps();}` |
| `showEntityLocation()` modal footer → `closeModal();go('live',null)` | L8251 | "Open full map" (driver branch) |
| `showNearbyDriversMap()` modal footer → `closeModal();go('live',null)` | L8451 | "Open full ops map" (no trip context) |

`window.go` itself: L8774; it clears `.on` from every `.page`, adds `.on` to `#p-live`, and sets `#tb-title` / `#tb-sub` (L8780–L8789).

**Router ordering quirk (verified):** `renderMapTripsTable()` (L12660) fills the tbody with the date's trips, then 50 ms later `setMapMode('live')` (L11513) *overwrites* the tbody with the placeholder row `Switch to History to browse trips.` So the table is only ever populated in History mode, or briefly for 50 ms on entry.

---

## 3. Layout map

```
p-live (L768)
├─ .ph  header (L769–771)   "Live map & Route history"
└─ grid 1fr / 340px (L772)
   ├─ .card  MAP (L773–828)
   │   ├─ #live-mode-bar          (L775)  green dot · "Live tracking" · "· 3 active trips · updates every second" · #live-last-update
   │   ├─ .tab-row                (L776–779)  #tab-live (active) | #tab-history
   │   ├─ .map-filter-row         (L780–787)  display:none by default — 5 chips
   │   ├─ .map-ctrl #map-history-ctrl (L788–813) display:none by default
   │   │    ├─ Date  → #map-date-wrap  (L791)
   │   │    ├─ Trip  → #map-trip-wrap  (L795)
   │   │    ├─ #replay-btn "Replay route" (L798–801)
   │   │    ├─ #replay-time-lbl "0:00 / 0:00" + .replay-progress > #rp-fill (L803–804)
   │   │    └─ static legend: Start ● #2E7D32 | End ● #C62828 | Actual route ▬ #1A73E8 | Planned ▭ #E8A33D (L807–812)
   │   ├─ .map-stat #map-stats    (L815)  filled by updateMapStats()
   │   ├─ <canvas id="map-canvas" width=800 height=360> (L817)
   │   └─ trips table (L819–827)  "All trips — selected date" + table.dt > #map-trips-tbody
   └─ sticky sidebar (L830–843)
       ├─ .card  "🚕 Active trips now" + #active-trips-count (L831–834) → #active-trips-list
       ├─ .card  "📋 Sub trip requests" + #sub-req-count      (L835–838) → #sub-requests-list.grp-scroll
       └─ .card  "🔍 Ride requests" + #ride-req-count         (L839–842) → #ride-req-list
```

Relevant CSS: `.map-ctrl` L215, `.map-stat` L217 **and re-declared L365** (the later one wins: `display:flex;gap:0` with column `.ms-item` L366), `.ms-lbl` L367, `.ms-val` L368, `.replay-btn` L221, `.replay-progress` L223, `.rp-fill` L224, `.tab-row` L336, `.map-tab` L337–341, `.map-filter-row` L344, `.map-fchip` L345–347, `.ping-dot` L327, `.sla-bar` L333, `.grp-scroll` L95, `#map-canvas` L214, `#map-leaflet` L349 (**orphan rule — no such element exists**).

---

## 4. Map modes, layers & markers

### 4.1 Modes

`var MAP_MODE='live'` (L11512). `window.setMapMode(mode)` L11513–L11522.

| Mode | Tab button | What `setMapMode` does |
|---|---|---|
| `live` | `#tab-live` "⬤ Live" (L777) | Sets both tabs' class (`map-tab` + ` active` on the matching one). Hides `#map-filter-row` and `#map-history-ctrl` (`display:none`). Replaces `#map-trips-tbody` with `<tr><td colspan="9">Switch to History to browse trips.</td></tr>`. Shows `#live-mode-bar` (`display:flex`). Shows `#map-canvas`. Calls `drawMap()` (no arg ⇒ `pct=1`) and `updateMapStats()`. (L11513, L11520–L11521) |
| `history` | `#tab-history` "⟳ History" (L778) | Shows `#map-filter-row` and `#map-history-ctrl` as `display:flex`. **Hides** `#live-mode-bar`. Shows `#map-canvas`. Calls `renderMapFilterSelects()`, `renderMapTripsTableFiltered()`, `drawMap(1)`. (L11522) |

The canvas is shown in **both** modes — the comment at L11514–L11519 explains a previous version switched Live mode to a Leaflet map bound to `#map-leaflet`, an element that does not exist in the markup, so the map went blank; the canvas renderer was kept instead.

### 4.2 Canvas layers — `drawMap(pct)` L12812–L12960

Canvas is 800×360 logical px (L817). Drawn in this order:

| # | Layer | Detail | Line |
|---|---|---|---|
| 1 | Background | solid `#EAE6DF` full rect | L12819 |
| 2 | City blocks | 18 hardcoded rects, fill `#F2EFE8` | L12822–L12826 |
| 3 | Major roads (horizontal) | white, `y=90/230/350`, 12px tall | L12829–L12830 |
| 4 | Major roads (vertical) | white, `x=130,260,400,520,650` | L12832 |
| 5 | Minor road lines | `rgba(255,255,255,.6)` 1px; y=45,180; x=190,335,440,590 | L12835–L12837 |
| 6 | Road centre lines | `rgba(200,190,160,.5)` .5px dashed `[8,8]`; y=96,236,356; x=136,264,404,526,656 | L12840–L12843 |
| 7 | Road labels | `KING FAHD ROAD` @ (10,88), `NORTHERN RING` @ (10,228), `OLAYA ST` rotated at (138,120), `KING ABDULLAH RD` rotated at (408,120) | L12846–L12850 |
| 8 | Planned route | dashed `rgba(232,163,61,.5)` 2px, dash `[5,5]`, full `MAP_ROUTES[activeTrip].pts` polyline | L12860–L12863 |
| 9 | Actual route shadow | `rgba(26,115,232,.2)` 6px, drawn up to `pct` | L12872–L12884 |
| 10 | Actual route main | `#1A73E8` 3px, drawn up to `pct` | L12885–L12897 |
| 11 | Start marker "A" | filled circle r=9 `#2E7D32`, white bold 10px `A` centred | L12899–L12903 |
| 12 | End marker "B" | filled circle r=9 `#C62828`, white `B` | L12905–L12908 |
| 13 | Car glow | radial gradient `rgba(26,115,232,.3)`→transparent, r=14 | L12923–L12926 |
| 14 | Car dot | circle r=7 fill `#1A73E8`, white 2px stroke | L12927–L12930 |
| 15 | **Flight-tracker layer** | for every `DB.liveTrips` entry ≠ `activeTrip` that has a `MAP_ROUTES` entry: faded route `rgba(122,90,248,.22)` 3px + dot r=6 `#7A5AF8` white 1.5px stroke + white label box with the driver's **first name** in `#4A2889` 9px | L12932–L12950 |
| 16 | Start/end text labels | white 85% box + `fromLbl` in `#2E7D32` and `toLbl` in `#C62828`, both parsed from `DB.trips[activeTrip].route.split('→')` | L12952–L12957 |

Car position (L12910–L12921): `pct>=1` ⇒ last point; else interpolated along the segment; else falls back to `pathPoint(pts, liveTrip.prog ?? 0.3)`.

`drawMap` **returns early** (nothing but the city drawn) if `MAP_ROUTES[activeTrip]` or `DB.trips[activeTrip]` is missing (L12853–L12855).

### 4.3 Canvas geometry source — `MAP_ROUTES` (L11933–L11941)

Presentation-only polylines in **canvas pixel space** (not geo), one per real trip id. 7 entries, all hardcoded:

| Trip | Points |
|---|---|
| `TRP-7741` | 10 pts, `[80,300] … [530,60]` (L11934) |
| `TRP-7738` | 10 pts, `[60,310] … [540,55]` (L11935) |
| `TRP-7735` | 11 pts, `[50,320] … [560,55]` (L11936) |
| `TRP-7742` | 10 pts, `[90,305] … [520,85]` (L11937) |
| `TRP-9012` | 9 pts, `[520,320] … [290,60]` (L11938) |
| `TRP-9008` | 9 pts, `[130,60] … [510,318]` (L11939) |
| `TRP-9005` | 9 pts, `[700,300] … [380,60]` (L11940) |

The comment at L11927–L11932 states the geometry is deliberately decoupled: names / km / duration / on-time / vehicle / status / rating are read live from `DB.trips` / `DB.drivers` at render time.

`DB.trips['TRP-9003']` (Cancelled, L2683) has **no** `MAP_ROUTES` entry → not selectable, not replayable.

### 4.4 Canvas click hit-testing — `initMapClicks()` L12626–L12641

Wired once at boot (L14599), guarded by `cv.__wired`. Converts client coords to canvas coords, then for each `DB.liveTrips` entry with a `MAP_ROUTES` route computes `pathPoint(rt.pts, lt.prog ?? 0.3)` and takes the nearest within **18 px** (`bd=18`, L12632). On hit: `selectTrip(best)` + `toast('Tracking '+best,'info')` (L12639).

### 4.5 Leaflet layer — **inert: nothing it draws ever reaches the screen** (see §18)

L11526–L11635 defines a complete Leaflet/OSM implementation:

- `var _lmap=null` L11529, `_carMarkers={}` L11530, `_routeLines={}` L11531, `_selectedLine=null` L11532.
- `TRIP_COORDS` L11534–L11549 — real Riyadh lat/lng `start`/`end`/`path` for 7 trip ids (`TRP-7741`, `TRP-9012`, `TRP-7742`, `TRP-7738`, `TRP-7735`, `TRP-9005`, `TRP-9008`).
- `TRIP_COLORS` L11551–L11552 — `TRP-7741 #1A73E8`, `TRP-9012 #7B1FA2`, `TRP-7742 #D84315`, `TRP-7738 #1B5E20`, `TRP-7735 #E65100`, `TRP-9005 #006064`, `TRP-9008 #4A148C`.
- `carIcon(color,heading)` L11554–L11560 — `L.divIcon` 28×28 SVG: coloured circle r=13 with white 2px stroke, opacity .92, plus a white arrow polygon rotated by `heading-90`.
- `mapBearing(a,b)` L11561, `lerpPath(path,pct)` L11562–L11568.
- `initLeafletMap()` L11569–L11578 — `L.map('map-leaflet',…).setView([24.7136,46.6753],12)` + `L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19})`; `invalidateSize()` after 300 ms.
- `updateLiveMarkers()` L11579–L11622 — would set `#live-last-update` to `'Updated: '+HH:MM:SS`; draws per live trip: dashed polyline (`weight:4, opacity:.4, dashArray:'8 5'`), green start `circleMarker` r=7 `#1E7B34` tooltip `"<rider> — Start"`, red end `circleMarker` r=7 `#C62828` tooltip `"End"`, and a car `L.marker` with a bound popup containing trip id (coloured), 🚗 driver, 👤 rider, route, `ETA: <eta>`, and a red **⚠ Intervene** button calling `closeModal();interveneTrip(id)`. Fits bounds once via `_lmap._fittedOnce`.
- `showHistoryRoute(tripId)` L11623–L11631 — removes prior `_selectedLine`, adds a solid 5px `opacity .85` polyline + start/end circleMarkers r=8, then `flyToBounds(…,{padding:[40,40],duration:.7})`.
- `renderLiveMap()` L11632–L11635 — `initLeafletMap()` then `invalidateSize()`+`updateLiveMarkers()` after 250 ms.

**Reachability:** `renderLiveMap()` has **no caller anywhere** (`grep -on renderLiveMap` → 1 hit, its own declaration L11632). `initLeafletMap()` has exactly one call site — L11633, *inside* `renderLiveMap()` — so it too never executes. `updateLiveMarkers()` *is* called from `tickEngine` L12598 and `showHistoryRoute()` from `selectTrip` L12688, but both bail on their first line because `_lmap` is `null` (L11580, L11624). Consequently `#live-last-update` (L775) is **always empty**, and no Leaflet marker, tile, popup or tooltip is ever rendered on this page. Note that "dead" here means *produces no output*, not *costs nothing*: the Leaflet CSS and JS still load from unpkg on every page load (L469–L470).

---

## 5. KPIs & live counters

| Name | Element | Source | Formula | Thresholds / notes | Line |
|---|---|---|---|---|---|
| "· 3 active trips · updates every second" | inline text in `#live-mode-bar` | **hardcoded string** | none | Never recomputed — stays "3" even after trips complete or are added | L775 |
| Last update stamp | `#live-last-update` | `updateLiveMarkers()` | `'Updated: '+new Date().toLocaleTimeString([],{hour,minute,second:'2-digit'})` | **Never written** (dead Leaflet path) | L775 / L11581–L11583 |
| Active trips count | `#active-trips-count` | `DB.liveTrips.length` | direct length | HTML seeds literal `3` (L832); overwritten by `renderActiveTrips()` | L832 / L11661 |
| Sub trip requests count | `#sub-req-count` | filtered `DB.upcomingSubTrips` | count of trips whose `tripScenario(t).key` ∈ {`unassigned`,`unavailable`,`late`} | HTML seeds `0` (L836) | L836 / L11638–L11644 |
| Ride requests count | `#ride-req-count` | `DB.rideRequests.length` | direct length | HTML seeds literal `3` (L840) | L840 / L11852 |
| Map stats bar (10 cells) | `#map-stats` | `DB.trips[activeTrip]` + `DB.drivers` / `DB.riders` | see §6 | Empty-state: `No trip selected` / `No trips recorded for <date>` | L815 / L12745–L12771 |
| Replay clock | `#replay-time-lbl` | `DB.trips[activeTrip].min` | `Math.floor(replayPct*total)+':00 / '+total+':00` | Reset to `'0:00 / '+t.min+':00'` by `updateMapStats` (L12769–L12770); `'0:00 / 0:00'` when no trip | L803 / L12975 |
| Replay progress bar | `#rp-fill` width | `replayPct` | `replayPct*100 + '%'` | Forced to `100%` by `selectTrip` (L12696–L12697) | L804 / L12974 |
| SLA bar per sub request | `.sla-fill` inline | `t.minutesUntil` | width `= max(0,min(100, 100 - round(minutesUntil/90*100)))`% | colour: `#C62828` if ≤15 min, `#B45309` if ≤30, else `#1E7B34` | L11652 |
| Per-trip GPS ping | `pingHTML(t)` | `t.lastPing` (seconds, incremented 1/tick) | `<120`s ⇒ green `"Ns ago"`; `<300`s ⇒ amber `"Mm Ss — check"`; `≥300`s ⇒ red `"Mm — no signal ⚠"` | thresholds 120 s / 300 s | L11656 |
| Stage pipeline | `stagePipelineHTML(t.stage)` | `t.stage` (1–5) | 5 bars, filled `var(--blue)` while `index+1 <= stage`, last bar 7px wide, rest 16px; caption `STAGES[stage-1]` | `STAGES=['Requested','Driver assigned','En route to pickup','In trip','Completed']` L11495 | L11496–L11503 |

---

## 6. Data displayed

### 6.1 Map stats bar — `updateMapStats()` L12745–L12771

Reads `var t=DB.trips[activeTrip]` (L12748).

| Cell label | Value | Source | Notes |
|---|---|---|---|
| `Driver` | `drv.name` | `DB.drivers[t.driver].name` | clickable → `openProfile(t.driver)` (L12758) |
| `\|` | separator | hardcoded | L12759 |
| `Rider` | `rdr.name` | `DB.riders[t.rider].name` | clickable → `openProfile(t.rider)` (L12760) |
| `From` | `route.split('→')[0].trim()` | `DB.trips[*].route` | L12753, L12762 |
| `→ To` | `route.split('→')[1].trim()` | same | falls back to `'—'` |
| `Distance` | `t.km + ' km'` | `DB.trips[*].km` (string) | L12765 |
| `Duration` | `t.min + ' min'` | `DB.trips[*].min` (string) | L12766 |
| `On time?` | `Yes (+0 min)` / `No (+N min)` / `Cancelled` | derived by `tripOnTime(t)` (L12654) | colour `var(--green)` / `var(--amber-dk)` / `var(--ghost)` (L12755–L12756); cell at L12767 |
| `Driver ★` | `'★ '+drv.rating` or `—` | `DB.drivers[*].rating` | colour `var(--amber-dk)` (L12768) |

Empty state (L12749): a single `.ms-item` reading `No trip selected` / `No trips recorded for <mapDateLabel()>`, and `#replay-time-lbl` reset to `0:00 / 0:00`.

### 6.2 Active-trips sidebar rows — `renderActiveTrips()` L11658–L11682

| Element | Source | Line |
|---|---|---|
| Trip id (blue, clickable) | `t.id` → `openProfile(t.id)` | L11667 |
| `ETA <span class="js-eta" data-trip=…>` | `t.eta` (`DB.liveTrips[*].eta`) | L11668 |
| driver → rider names | `nm2(t.driver)` / `nm2(t.rider)`, each `openProfile()`-clickable | L11669 |
| route + `+N stop(s)` | `t.route`, `t.stops.length` | L11670 |
| ping line | `pingHTML(t)` from `t.lastPing` | L11671 |
| stage pipeline | `stagePipelineHTML(t.stage)` | L11672 |
| unread chat badge | `t.unreadChat` | L11678 |

### 6.3 Sub-requests sidebar rows — `renderSubRequests()` L11637–L11655

Source: `DB.upcomingSubTrips` (seed L6177–L6241; a second `DB.upcomingSubTrips=DB.upcomingSubTrips||[…]` at L6243 is a no-op safety net since the first assignment already ran).

| Element | Source | Line |
|---|---|---|
| Rider name (blue, clickable) | `nm2(t.rider)` → `openProfile(t.rider)` | L11648 |
| Red badge text | `lbls[scenario.key]` — `unassigned:'No driver assigned'`, `unavailable:'Driver unavailable'`, `late:'Driver not moving'` | L11639, L11648 |
| Route + countdown | `t.route + ' · in ' + fmtCountdown(t.minutesUntil)` (`fmtCountdown` L8710: `≥1440⇒'Tomorrow'`, `≥60⇒'Nh Mm'`, else `'N min'`) | L11649 |
| SLA bar | see §5 | L11650 |

Empty state (L11654): `✓ All upcoming subscription trips have moving drivers.` in `var(--green)`.

### 6.4 Ride-requests sidebar rows — `renderRideRequests()` L11850–L11870

Source: `DB.rideRequests` (seed L2786–L2790).

| Element | Source | Line |
|---|---|---|
| Rider name (blue, clickable) | `nm2(r.rider)` → `openProfile(r.rider)` | L11861 |
| Badge | `No drivers found` (`b-red`) when `r.status==='no_drivers'`, else `⏳ <span class="js-wait" data-req>`+`r.waiting` (`b-amber`) | L11862 |
| pickup → dest | `r.pickup`, `r.dest` | L11863 |
| Type badge + request id | `r.type` (`b-com` if `Comfort` else `b-eco`), `r.id` | L11864 |
| Row background | `var(--red-lt)` when `status==='no_drivers'` | L11859–L11860 |

Empty state (L11853): `No pending requests.`

---

## 7. Input fields / filters / selects

| id | Type | Options (all) | Default | Effect |
|---|---|---|---|---|
| `tab-live` / `tab-history` | `<button class="map-tab">` (L777–L778) | Live / History | `tab-live` has class `active` in markup; `MAP_MODE='live'` (L11512) | `setMapMode(mode)` — see §4.1 |
| `.map-fchip[data-filt]` (5 chips, L782–L786) | clickable spans | `""` (All), `In trip`, `Done`, `Late`, `Cancelled` | `All` (`class="map-fchip on"`, L782) | `setMapFilter(chip,val)` L11522: sets `MAP_FILT`, toggles `.on` on the chip whose `data-filt` equals `val`, then `renderMapTripsTableFiltered()`. Filter predicate (L11523): empty ⇒ all; `Late` ⇒ `/Late/.test(t.status)`; otherwise strict `t.status===MAP_FILT`. **Affects the table only — the canvas is not redrawn.** |
| `map-date` (hidden input inside custom select `csel-map-date`, injected into `#map-date-wrap` L791) | `customSelectHTML` (L5336) | `today` → `Today — 25 Jun`; `yesterday` → `Yesterday — 24 Jun`; `day2` → `23 Jun (2 days ago)` | `today` | onChange `onMapDateChange()` (L12733): `rebuildMapTripSelect(); renderMapTripsTable(); drawMap(); updateMapStats();`. `mapDateLabel()` (L12643) maps `yesterday→'24 Jun'`, `day2→'23 Jun'`, anything else→`'25 Jun'`. Injected **once**, guarded by `if(!document.getElementById('csel-map-date'))` (L12708). |
| `map-trip` (hidden input inside `csel-map-trip`, injected into `#map-trip-wrap` L795) | `customSelectHTML` | **Dynamic** — `tripsForMapDate().filter(t=>MAP_ROUTES[t.id])`, each labelled `driverName + ' → ' + riderName + ' · ' + HH:MM` (L12720–L12724) | first option, or `activeTrip` if still present (L12729–L12730) | onChange `updateMap()` (L12740) → `selectTrip(value)`. **Rebuilt on every `renderMapFilterSelects()` call** (L12716). If no replayable trips: renders `No replayable trips` text instead (L12725–L12728). |
| `#replay-btn` | button (L798) | — | — | `startReplay()` (L12962) |
| `#map-canvas` | canvas (L817) | — | — | click → nearest live-trip dot within 18 px → `selectTrip()` (L12626) |
| `add-stop-location` | text input (modal, L11689) | free text | empty | `commitAddStop()` reads via `val()` |
| `ops-chat-msg` | textarea (modal, L11737) | free text | empty | `commitSendChatMsg()` |
| `lt-cancel-reason` (`csel-lt-cancel-reason`) | custom select (modal, L11814–L11818) | `rider_request` → "Rider requested cancellation" (hint: `5 SAR fee applies — driver already committed`); `rider_noshow` → "Rider no-show at pickup" (hint `10 SAR fee applies`); `ops_decision` → "Operational issue (driver/safety/system)" (hint "No fee — not the rider's fault") | `rider_request` | `confirmCancelLiveTrip()` |
| `call-note-ta` | textarea (priority-call modal, L9158) | free text | empty | `logPriorityCall()` |
| `drv-response` (`csel-drv-response`) | custom select (L8555) | `moving` → "Driver confirmed — now moving"; `delay` → "Driver will be 10-15 min late"; `unavailable` → "Driver cannot make it — needs replacement" | `moving` | `logDriverCall()` |
| `ndv-response` (`csel-ndv-response`) | custom select (L8510) | `accept` → "Accepted — heading to pickup"; `busy` → "Can't take it right now"; `no_answer` → "No answer — try next driver" | `accept` | `logNdvContact()` |

There is **no free-text search box** on this page (unlike `#trips-search` on the Trips page, L852).

---

## 8. Actions

Legend: `Perm` = `requirePerm(key)` gate (L3126: logs `permission_denied` + red toast on failure). `Audit` = `logAction(...)` (L3133).

### 8.1 Map card

| Label | Handler | Effect | Writes to | Perm | Audit | Confirms? |
|---|---|---|---|---|---|---|
| `⬤ Live` (L777) | `setMapMode('live')` | mode switch, redraw canvas, blank table | `MAP_MODE` | none | no | no |
| `⟳ History` (L778) | `setMapMode('history')` | mode switch, show filters+controls, rebuild selects + table | `MAP_MODE` | none | no | no |
| Filter chips ×5 (L782–786) | `setMapFilter(this,val)` | filters table rows only | `MAP_FILT` | none | no | no |
| `Replay route` (L798) | `startReplay()` L12962 | 3000 ms `requestAnimationFrame` sweep of `drawMap(pct)`; updates `#rp-fill` and `#replay-time-lbl`. If no `DB.trips[activeTrip]` or no `MAP_ROUTES[activeTrip]` ⇒ `toast('No recorded route for this trip','warn')` | `replayPct`, `replayAnim` | none | no | no |
| Table row click | `selectTrip(id)` L12687 | sets `activeTrip`, `cselSetValue('csel-map-trip','map-trip',id)`, highlights the row `var(--blue-lt)`, cancels any replay, forces `replayPct=1` and `#rp-fill` to 100%, `drawMap()`, `updateMapStats()`; also calls dead `showHistoryRoute()` in history mode | `activeTrip` | none | no | no |
| `▶ Replay` per row (L12684) | `stopEv(event);selectTrip(id);startReplay()` | as above | — | none | no | no |
| Canvas dot click | `selectTrip(best)` + info toast | as above | `activeTrip` | none | no | no |

### 8.2 Active-trips sidebar row buttons (L11673–L11679)

| Label | Handler | Effect | Writes to | Perm | Audit | Confirms? |
|---|---|---|---|---|---|---|
| `🗺 Track` | `focusLiveTrip(t.mapTrip)` L11760 | If `!tripId \|\| !MAP_ROUTES[tripId] \|\| !DB.trips[tripId]` ⇒ `toast('No route geometry recorded for this trip yet','warn')`. Else `selectTrip(id)` + `toast('Tracking '+id,'info')` | `activeTrip` | none | no | no |
| `📞 Rider` | `priorityCall(riderName)` L9149 | opens Priority-call modal | none until Log | none | on Log only | no |
| `📞 Driver` | `priorityCall(driverName)` | same | — | none | on Log only | no |
| `➕ Add stop` | `openAddStopModal(t.id)` L11683 → `commitAddStop` L11697 | pushes the typed location into `t.stops`; emails the rider; toast `✅ Stop added — +N SAR will apply to the final fare`; `renderActiveTrips()` | `DB.liveTrips[*].stops`; `sendSystemEmail(t.rider, …,'transactional')` L11706 | **`live_ops`** (L11698) | `logAction('add_stop','trip',tripId,…,{},{stops:n})` L11705 | validation only: empty location ⇒ `toast('⚠ Enter a stop location first','warn')` |
| `💬 Chat` (+ unread badge) | `openTripChatView(t.id)` L11754 | sets `t.unreadChat=0`, re-renders, then `openProfile(tripId)` | `DB.liveTrips[*].unreadChat` | none | no | no |
| `⚠ Intervene` | `interveneTrip(t.id)` L11765 | opens the Intervene modal (§11) | none | none *on open* | no | no |

### 8.3 Intervene modal buttons (L11783–L11787)

| Label | Handler | Effect | Writes to | Perm | Audit | Confirms? |
|---|---|---|---|---|---|---|
| `📞 Call rider — <name>` | `closeModal();priorityCall(rn,'live_trip',id)` | priority-call modal with context | — | none | on Log | no |
| `📞 Call driver — <name>` | `closeModal();priorityCall(dn,'live_trip',id)` | same | — | none | on Log | no |
| `🔄 Reassign driver` | `reassignLiveDriver(id)` L11789 → `showNearbyDriversMap(t.rider,id)` | opens the unified nearby-driver picker in `live` context | — | none *on open* | no | no |
| `✕ Cancel & refund rider` | `cancelLiveTrip(id)` L11804 | opens the cancel modal | — | **`live_ops`** (L11805) | no | **yes — second modal with reason + "Confirm cancel"** |
| `🎧 Escalate to support` | `closeModal();openSupportTicket(id,t.rider,rn)` L2542 | ticket-creation modal → `createTicketFor()` unshifts into `DB.tickets` | `DB.tickets` | none | no | no |
| `Close` | `closeModal()` | — | — | — | — | — |

### 8.4 Sub-requests sidebar

| Label | Handler | Effect | Perm | Audit |
|---|---|---|---|---|
| `Find driver` (danger, L11653) | `showNearbyDriversMap(t.rider, t.id)` (UST- context) | opens unified picker; assignment commits via `assignNearestDriver` | commit-side `live_ops` (L8483) | commit-side `assign_driver` (L8492) |

### 8.5 Ride-requests sidebar (L11866–L11868)

| Label | Handler | Effect | Writes to | Perm | Audit | Confirms? |
|---|---|---|---|---|---|---|
| `Assign driver` (primary) | `assignManually(r.id)` L11871 | claim-lock then open picker — see §10.1 | `r.claimedBy`, `r.claimedAt` | commit-side `live_ops` (L11885) | commit-side `manual_assign` (L11902) | no |
| `📞 Call` | `priorityCall(rn)` | modal | — | none | on Log | no |
| `Cancel` (danger) | `cancelRequest(r.id)` L11915 | splices the request out of `DB.rideRequests`, re-renders live ops + requests page + nav counts, `toast('Request X cancelled','warn')` | `DB.rideRequests` | **`live_ops`** (L11916) | `logAction('cancel_ride_request',…,{status:'pending'},{status:'cancelled'})` L11924 | **yes** — `GATE_SWEEP.cancelRequest` L20871, `d:true` |

### 8.6 Priority-call modal (L9149–L9163)

| Label | Handler | Effect |
|---|---|---|
| `✕ End` | `closeModal()` | nothing logged |
| `✓ Log` | `logPriorityCall(name,ctx,entityId)` L9161 | reads `#call-note-ta`, `logAction('priority_call','contact',entityId\|\|name,'Called <name> (<ctx>)…',null,{contacted,context,note})`, closes, `toast('✅ Call logged — '+name,'ok')` |

---

## 9. Live trips table

`<table class="dt">` L822–L825, header row L823, body `#map-trips-tbody` L824, wrapped in `.tbl-scroll` with `max-height:380px`. Section caption: `All trips — selected date` (L820).

**Columns, in order (L823):** `Time` · `Driver` · `Rider` · `Vehicle` · `Distance` · `Duration` · `On time?` · `Status` · *(unlabelled actions)* — 9 columns.

**Two renderers exist:**

| Renderer | Line | Used by |
|---|---|---|
| `renderMapTripsTable()` | L12660–L12686 | router (L8790) and `onMapDateChange()` (L12735) — **unfiltered** |
| `renderMapTripsTableFiltered()` | L11522–L11524 | `setMapMode('history')` and `setMapFilter()` — applies `MAP_FILT` |

**Row source & sort:** `tripsForMapDate()` (L12648–L12653) — `Object.keys(DB.trips)` mapped to values, filtered by `t.date.indexOf(mapDateLabel())===0`, sorted ascending by `mapTripTime(t)` = `t.date.split(' ')[2]` (the `HH:MM` fragment) via `localeCompare`.

**Cell mapping:**

| Column | Value | Source |
|---|---|---|
| Time | `mapTripTime(t)` = 3rd space-token of `t.date` | `DB.trips[*].date` (L12676; the filtered variant uses the inline equivalent at L11524) |
| Driver | `rowLink(t.driver, drv.name)` — monospace blue span, `openProfile(id)` on click (L3283) | `DB.drivers[*].name` |
| Rider | `rowLink(t.rider, rdr.name)` | `DB.riders[*].name` |
| Vehicle | badge `b-com` when `drv.type==='Comfort'` else `b-eco`; text `drv.type \|\| 'Economy'` | `DB.drivers[*].type` |
| Distance | `t.km + ' km'` | `DB.trips[*].km` |
| Duration | `t.min + ' min'` | `DB.trips[*].min` |
| On time? | `tripOnTime(t)` (L12654): `/Late \+(\d+)/` ⇒ `+N min` `b-amber`; `/Cancelled/i` ⇒ `—` `b-grey`; else `Yes` `b-green` | `DB.trips[*].status` |
| Status | `statusBadge(t.status)` (L3730) — see §13 | `DB.trips[*].status` |
| *(actions)* | `▶ Replay` button when `MAP_ROUTES[t.id]` exists **and** status is not `/Cancelled/i`; else `—` | — |

**Row click:** only rows with a `MAP_ROUTES` entry get `cursor:pointer` + `onclick="selectTrip('<id>')"` (L12675). The selected row gets `background:var(--blue-lt)`.

**Empty states:**
- `renderMapTripsTable()` — `No trips recorded for <mapDateLabel()>.` (colspan 9, L12665).
- `renderMapTripsTableFiltered()` — `No trips match.` (colspan 9, L11523).
- Live mode — `Switch to History to browse trips.` (colspan 9, L11513).

**Data reality check:** all 8 seeded `DB.trips` records carry `date:'25 Jun …'` (L2671–L2683). Therefore selecting **Yesterday — 24 Jun** or **23 Jun** yields the "No trips recorded" empty state and `No replayable trips` in the trip select (L12726) — the two non-today date options are effectively decorative with the seed data.

---

## 10. Dispatch flows

All four assign contexts funnel through one picker: `showNearbyDriversMap(riderId, ctxId)` (L8354). It stores `window._ndvCtx={kind, id, riderId}` (L8366) where `kind` is derived from the id prefix: `REQ-`⇒`request`, `TRP-`⇒`live`, `UST-`⇒`ust`, `SREQ-`⇒`sreq`. `pickNearbyDriver(drvId)` (L10243) dispatches to the matching commit function.

Candidate list: `nearestAvailableDrivers(riderId, limit, kind)` (L8167) — excludes drivers with no `mapPos`, suspended, or `driverAutoRestricted`; sorts available-before-busy then by `estimateEtaMin` (road distance = straight-line × `ROAD_CIRCUITY_FACTOR 1.35`, speed `URBAN_AVG_SPEED_KMH 26`, × zone congestion multiplier, L7261–L7280); caps by `DB.opsConfig.quickRideRadiusKm` (default 6) or `subRadiusKm` (default 8), auto-expanding when nothing qualifies unless `autoExpandRadius===false`.

### 10.1 Manual assign — instant ride request (`Assign driver`)

1. `assignManually(id)` L11871.
2. Look up `DB.rideRequests` by id; bail if missing (L11872–L11873).
3. If `r._locking` ⇒ `toast('Already assigning a driver to this request…','info')` and stop (L11874).
4. If `r.claimedBy` is set and is not `currentUserName()` ⇒ `toast('🔒 <name> is already handling this request — check with them before acting on it.','warn')` and stop (L11875).
5. Set `r.claimedBy=currentUserName(); r.claimedAt='Just now'`; `renderRequestsPage(); renderRideRequests();` (L11876–L11877).
6. `showNearbyDriversMap(r.rider, id)` (L11878) — modal shows the rider pin, radius rings, dashed connector lines and driver rows with `📞 Call` / `✅ Assign`.
7. Clicking `✅ Assign` → `pickNearbyDriver(drvId)` (L10243) → busy-check `toast('This driver is currently on a trip','err')` → `commitRequestAssign(id,drvId)`.
8. `commitRequestAssign` L11884:
   - `requirePerm('live_ops')` (L11885).
   - `closeModal()`, re-apply `_locking`/`claimedBy`/`claimedAt`, `toast('Assigning <driver>…','info')` (L11891–L11893).
   - `simulateAsyncCommit(onSuccess,onFail)` — 550 ms delay, **8 % random failure** (L10259–L10263).
   - Success: splice the request out of `DB.rideRequests`; push a new `DB.liveTrips` entry `{id:'TRP-'+(9100+rand(0..899)), rider, driver, type, stage:2, eta:'3 min to pickup', route:pickup+' → '+dest, mapTrip:null}` (L11898); `renderLiveOps(); renderRequestsPage(); renderDashboard(); refreshNavCounts()`; `logAction('manual_assign','ride_request',reqId,…,{status,driver:'—'},{status:'assigned',driver})` (L11902); `toast('✅ <driver> assigned to <req>','ok', → openProfile(rider))`.
   - Failure: `delete r._locking/claimedBy/claimedAt`, re-render, `toast('❌ Could not assign … connection issue. Please try again.','err', → assignManually(reqId))` (L11904–L11908).

*Note:* new live trips get `mapTrip:null` and a random `TRP-91xx` id with no `MAP_ROUTES` geometry — so `🗺 Track` on them always warns, and they render no canvas dot.

### 10.2 Cancel a pending ride request

`cancelRequest(id)` L11915 — `requirePerm('live_ops')`, splice from `DB.rideRequests`, `renderRideRequests()`, `renderRequestsPage()`, `refreshNavCounts()`, `logAction('cancel_ride_request',…)`, `toast('Request X cancelled','warn')`. **Confirmation gate:** `GATE_SWEEP.cancelRequest` (L20871, `d:true`), installed by `installGateSweep()` (L20903) — the operator sees *"Cancel this request"* before the splice.

### 10.3 Reassign a live trip (backup assign)

1. Intervene modal → `🔄 Reassign driver` → `reassignLiveDriver(id)` L11789 → `showNearbyDriversMap(t.rider, id)` with a `TRP-` context.
2. The picker filters out the current driver (L8377: `if(liveT)nearby=nearby.filter(n=>n.id!==liveT.driver).slice(0,5)`), section header reads `… · reassigning <TRP-id> — now: <current driver>` (L8403), and assign buttons read `🔁 Reassign` (L8421).
3. `pickNearbyDriver` → `commitLiveReassign(id,drvId)` L11794:
   - `requirePerm('live_ops')`.
   - `t.driver=drvId` (in-place mutation of `DB.liveTrips[*]`), `closeModal()`, `renderActiveTrips()`.
   - `logAction('reassign_driver','trip',id,'Reassigned live trip …: old → new',{driver:old},{driver:new})` (L11801).
   - `toast('✅ <new driver> now driving <id> · rider notified','ok')` — *the "rider notified" claim has no corresponding send call.*
   - **No confirmation.** `DB.trips[id].driver` is **not** updated — only the live-ops record.

### 10.4 Cancel a live trip (+ refund/fee)

1. `cancelLiveTrip(id)` L11804 — `requirePerm('live_ops')`; reads `getCancellationRule('qr_after_grace')` and `('qr_rider_noshow')` (L5548; seeds at L13939 `feeAmount:5, enabled:true` and L13942 `feeAmount:10, enabled:true`).
2. Modal shows a red warning `This cannot be undone. Pulls <driver> off an in-progress ride with <rider>.` (L11812) plus the reason select (§7).
3. `Confirm cancel` → `confirmCancelLiveTrip(id)` L11824:
   - `requirePerm('live_ops')` again.
   - Find index in `DB.liveTrips`; read `#lt-cancel-reason` (default `rider_request`).
   - Map reason → rule id: `rider_request→qr_after_grace`, `rider_noshow→qr_rider_noshow`, `ops_decision→null` (L11831).
   - `fee = rule.enabled ? rule.feeAmount : 0`.
   - **`DB.liveTrips.splice(idx,1)`**, `closeModal()`, `renderActiveTrips()`.
   - If `fee>0`: `debitRiderWallet(rider,fee,'Cancellation fee — <id>')`. On insufficient balance ⇒ `logAction('wallet_debit',…)` and the toast suffix becomes `· N SAR fee added to next trip (insufficient wallet balance)`; otherwise `· N SAR fee charged to wallet` (L11838–L11846).
   - `logAction('cancel_live_trip','trip',id,…,{status:'active'},{status:'cancelled',fee})` (L11847).
   - `toast('✕ <id> cancelled'+feeNote,'err')`.
   - **`DB.trips[id].status` is not changed** — the historical record keeps `In trip`.

### 10.5 Assign a driver to an upcoming subscription trip (`Find driver`)

1. `showNearbyDriversMap(t.rider, t.id)` with a `UST-` context (L11653).
2. `tripScenario(t)` (L8292) drives the banner and which driver is pinned:
   - `unassigned` (no driver / driver not in `DB.drivers`) — red, primary `assign`.
   - `unavailable` (`driverStatus==='unavailable'`) — red, primary `assign`.
   - `late` (`minutesUntil<=30 && driverStatus==='not_started'`) — red, primary `call_current`; the currently-assigned driver is pinned in a "Currently assigned" block with `📌 Assigned — not moving yet` and a red `📞 Call now` → `callDriverUrgent()` (L8384–L8397), and the list below is retitled `Backup options nearby` (L8400).
   - `unconfirmed` (`minutesUntil<=60 && !riderConfirmed`) — amber, primary `call_rider`.
   - `watch` (`minutesUntil<=90 && driverStatus==='not_started'`) — amber, primary `monitor`.
   - `watch_confirm` (`!riderConfirmed && minutesUntil<=180`) — amber, primary `monitor`.
   - `ok` — green, primary `view`.
   For `watch`/`watch_confirm`/`unconfirmed`/`ok` the Assign button is de-emphasised (`btn sm` instead of `btn p sm`, L8380).
3. `✅ Assign` → `pickNearbyDriver` → `assignNearestDriver(driverId,riderId,ustId)` L8482:
   - `requirePerm('live_ops')` (L8483).
   - Bail with `toast('Could not find this trip','err')` if the UST is gone; `toast('This driver is currently on a trip','err')` if busy.
   - `t.driver=driverId; t.driverStatus='moving'` (L8491).
   - `logAction('assign_driver','trip',t.id,'Assigned <driver> to <rider> for <id> (<km> away)',{driver:prev},{driver,distance})`.
   - `closeModal(); renderReadiness(); renderDashboard(); refreshNavCounts();` + `toast('✅ … assigned … · <km> away','ok')`.
4. Escalation path: when the scenario is urgent **and** zero non-busy candidates remain, a red block appears — `🚫 No available driver nearby right now` with `🎧 Escalate to support` → `openReadinessTicket(...)` (L8425–L8430).

### 10.6 Priority / urgent calls

- `priorityCall(name, context, entityId)` L9149 — pure UI: avatar circle, name, `context · entityId`, a green pulsing "Calling — HH:MM" pill, an optional note textarea. `✓ Log` ⇒ `logPriorityCall` (L9161) writes an audit entry `priority_call`; `✕ End` writes nothing.
- `callDriverUrgent(driverId, ustId)` L8547 — amber phone modal with the driver's `DB.drivers[*].phone`, plus a **Driver response** select. `Log response` ⇒ `logDriverCall(ustId,driverId)` L8559: `moving` ⇒ `t.driverStatus='moving'`; `unavailable` ⇒ `t.driverStatus='unavailable'; t.unavailReason='Declined trip after call'` and, after 400 ms, auto-opens `resolveUnavailable(ustId)`; `delay` changes no state. Toast per branch (L8568). **No `logAction` audit entry is written by this flow.**
- `quickContactDriver(driverId,riderId,ustId)` L8500 / `logNdvContact` L8515 — the equivalent inside the nearby-drivers modal; toast-only, no state change, returns to the picker.

### 10.7 `cancelSubDispatch()` — L5022

Not reachable from `p-live`. It belongs to the *new-subscription* dispatch modal (`_nsDispatch`): clears `_nsDispatch.interval`, nulls `_nsDispatch`, `closeModal()`. It is the `✕`/"Cancel request"/"Cancel — don't retry" handler at L5021 and L5058. Listed here only because it was named in the module brief.

### 10.8 `selDriver(el)` — L5872

Generic radio-card selector: clears `.selected` from every `#modal-box .plan-option`, marks the clicked one, checks its radio. Used by the **Export** modal (L5033–L5040) and other plan-option lists — **not by any Live-Map control**.

### 10.9 `simulateCall(known)` — L20368

Support/CTI demo helper: picks a random `DB.riders` key and calls `onIncomingCall(phone)` with either that rider's real phone or the literal `'+966 50 000 0000'`. Buttons live in the contact-simulator panel (L20361–L20362), **not** on `p-live`.

---

## 11. Modals opened

| Modal | Opened by | Definition | Footer actions |
|---|---|---|---|
| Add a stop — `<tripId>` | `➕ Add stop` | L11683–L11696 | `Cancel` / `Add stop` → `commitAddStop` |
| Send message — `<tripId>` | `openSendChatModal` (defined L11732; **no caller on this page**) | L11732–L11741 | `Cancel` / `Send` → `commitSendChatMsg` |
| Intervene — `<tripId>` | `⚠ Intervene` | L11765–L11788 | 5 action buttons + `Close` (see §8.3) |
| Cancel live trip — `<tripId>` | Intervene → `✕ Cancel & refund rider` | L11804–L11823 | `Keep trip` / `Confirm cancel` |
| 🗺️ Nearby drivers — `<rider>` | `Find driver`, `Assign driver`, `🔄 Reassign driver` | L8354–L8479 | `Close` + context-dependent back button (`← Back to candidate list` / `← Back to location` / `Open full ops map`) |
| 📞 Contact driver — `<driver>` (blue) | `📞 Call` inside the nearby-drivers list | L8500–L8513 | `← Back to list` / `Log response` |
| 📞 Contact driver — `<driver>` (amber, urgent) | `📞 Call now` on the pinned driver | L8547–L8558 | `Cancel` / `Log response` |
| 📞 Priority call | `📞 Rider` / `📞 Driver` / Intervene call buttons | L9149–L9159 | `✕ End` / `✓ Log` |
| Open support ticket — `<name>` | Intervene → `🎧 Escalate to support` | L2542–L2551 | `Cancel` / `Create ticket` |
| 📍 `<Driver\|Rider>` location — `<name>` | `showEntityLocation` (reached from the nearby-drivers back button L8450, and from pin buttons elsewhere in the app) | L8226–L8281 | `Close` + `🚗 View nearby drivers` (rider) or `Open full map` → `go('live')` (driver) |

All use the shared overlay `#modal-overlay` / `#modal-box` / `#modal-content` (L475–L477), opened with `classList.add('open')`.

---

## 12. Timers / simulation loops

| Name | Period | Started at | What it mutates |
|---|---|---|---|
| `startTickEngine()` → `setInterval(tickEngine,1000)` | **1 s** | L11966–L11969; invoked from the boot block at **L14598** | guarded by `__tickStarted` |
| `tickEngine()` | every tick | L12508–L12607 | `__tickCount++` |
| `initMapClicks()` | one-shot | L12626, invoked L14599 | wires the canvas click listener |
| `startReplay()` `requestAnimationFrame` loop | ~16 ms, total **3000 ms** | L12962–L12981 | `replayPct` 0→1, `#rp-fill` width, `#replay-time-lbl`, repeated `drawMap(pct)` |
| `simulateAsyncCommit` | 550 ms `setTimeout` | L10259 | 8 % simulated failure on assign |
| Router deferral | 50 ms `setTimeout` | L8790 | delays `setMapMode` |
| Canvas modal draws | 80 ms `setTimeout` | L8265, L8454 | draws `#loc-canvas`, `#ndv-canvas` |

### `tickEngine()` sub-schedules that touch this page

| Cadence | Effect | Line |
|---|---|---|
| every tick | `r.waiting=bumpWait(r.waiting)` for `searching`/`offered` requests (adds 1 s, rolls at 60) | L12530, L12555 |
| every tick | auto-dispatch: after `AUTO_OFFER_DELAY_SEC=6` s (`1` s for VIP) sends an offer to the nearest candidate | L11987, L12538–L12541 |
| every tick | at `waiting>=180` s: `r.status='no_drivers'`, `playAlertBeep()`, red toast `🔴 SLA breached …`, `pushOpsNotification`, `logAction('sla_breach',…)` | L12548–L12553 |
| every tick | offered-driver acceptance simulation: `acceptChance = 0.30 + (rating-3)*0.08`; `OFFER_WINDOW_SEC=12` s timeout | L11988, L12559–L12563 |
| every tick | update every `.js-wait` span to `r.waiting` | L12576–L12579 |
| every tick | for each live trip: `t.prog += TICK_ACCEL/totalSec` where `TICK_ACCEL=30` (L11952) and `totalSec=(DB.trips[t.id].min \|\| 18)*60`; at `prog>=1` ⇒ `completeTrip(t)` (L12406) which splices the trip out of `DB.liveTrips`, materialises/updates `DB.trips[id]` to `Done`, simulates ratings and tips | L12580–L12586 |
| every tick | `t.lastPing++`; at exactly **120** ⇒ amber toast `⏳ Weak signal from …`; at exactly **300** ⇒ red toast `⚠ No signal … 5 min without a ping` + `pushOpsNotification('alert',…)` + dashboard re-render | L12587–L12593 |
| every tick | 2 % chance ⇒ `simulateLiveChatMessage(t)` — pushes a random `CHAT_TEMPLATES` line into `DB.commLogs[t.id]`, `t.unreadChat++`, re-renders the active-trips list | L12593, L11716–L11731 |
| every tick (when `#p-live` is `.on` and no replay in flight) | `MAP_MODE==='live'` ⇒ `updateLiveMarkers()` (**dead — returns immediately**); otherwise `drawMap()` | L12596–L12600 |
| every 5 ticks | ETA decrement for each live trip (`'N min'` → `'N-1 min'`, `1` → `'Arriving'`); update every `.js-eta` span; `renderSubRequests()`; re-render the Requests page if open | L12601–L12610 |
| every 60 ticks | `t.minutesUntil--` on every `DB.upcomingSubTrips` entry; `renderSubRequests()`; `renderDashboard()`; `complianceScan()`; `recalcDriverTiers()`; `recalcRiderTiers()` | L12611–L12624 |
| every 15 / 20 / 30 / 45 ticks | `slaSweep()`, `refreshInbox()`, `markPresence()`, `liveSubtitles()` | L12512–L12516 (L12514 inside that span is a separate `%60` `updateOnCallChip()`) |

**Replay guard:** while `0 < replayPct < 1` the tick engine skips the map redraw so the replay animation is not fought over (L12595–L12600).

---

## 13. States & badges

### Trip status badge — `statusBadge(s)` L3730

| Regex on status | Class | Applies to seeded statuses |
|---|---|---|
| `/done\|resolved\|closed/i` | `b-green` | `Done` |
| `/trip\|active/i` | `b-blue` | `In trip` |
| `/late\|expir\|pend/i` | `b-amber` | `Late +8` |
| `/cancel\|risk\|refund/i` | `b-red` | `Cancelled` |
| fallback | `b-grey` | anything else |

### On-time badge — `tripOnTime(t)` L12654

| Condition | Label | Class |
|---|---|---|
| `/Late \+(\d+)/` matches | `+N min` | `b-amber` |
| `/Cancelled/i` matches | `—` | `b-grey` |
| otherwise | `Yes` | `b-green` |

### Vehicle badge

`drv.type==='Comfort'` ⇒ `b-com`, else `b-eco` (L12679, L11524).

### Ping badge — `pingHTML(t)` L11656

| `t.lastPing` | Dot class | Text | Colour |
|---|---|---|---|
| `<120` s | `ping-ok` | `Ns ago` | `#1E7B34` |
| `120–299` s | `ping-warn` | `Mm Ss — check` | `#B45309` |
| `≥300` s | `ping-dead` | `Mm — no signal ⚠` | `#C62828` |

`pingBorderStyle(t)` L11657 returns `border-left:3px solid #C62828` at ≥300 s, `#B45309` at ≥120 s, else `''` — **but see §18: it is never actually applied.**

### Ride-request badges (L11862)

| Condition | Badge |
|---|---|
| `r.status==='no_drivers'` | `b-red` "No drivers found" + row background `var(--red-lt)` |
| otherwise | `b-amber` "⏳ `<waiting>`" |

### Sub-request badges (L11648)

`b-red` with text from `lbls`: `No driver assigned` / `Driver unavailable` / `Driver not moving`.

### Stage pipeline (L11496)

5 segments; segment `i` filled `var(--blue)` when `i+1 <= t.stage`, else `var(--border2)`. Caption = `STAGES[stage-1]`. Seeded live trips use `stage:3` (TRP-7741, TRP-9012) and `stage:2` (TRP-7742) (L2782–L2784); auto-created trips use `stage:2` (L11898, L12483).

### Live-mode bar (L775)

Static green dot `background:#1E7B34` with `box-shadow:0 0 0 3px rgba(30,123,52,.2)`; text `Live tracking` in `var(--blue)`. Shown only in Live mode.

---

## 14. Cross-module links

| From | Call | Target |
|---|---|---|
| Table Driver / Rider cells (`rowLink`, L3283) | `openProfile(id)` | 360° profile page (`window.openProfile` L8827) |
| Map stats Driver / Rider (L12758, L12760) | `openProfile(t.driver/t.rider)` | profile |
| Active-trip id / driver / rider (L11667, L11669) | `openProfile(...)` | profile |
| `💬 Chat` (L11678) → `openTripChatView` (L11754) | `openProfile(tripId)` | trip profile with the comm log |
| Sub-request rider name (L11648) | `openProfile(t.rider)` | profile |
| Ride-request rider name (L11861) | `openProfile(r.rider)` | profile |
| Intervene → `🎧 Escalate to support` (L11787) | `openSupportTicket(id,rider,name)` → `createTicketFor` (L2552) | Support Center (`DB.tickets`) |
| Nearby-drivers escalation (L8429) | `openReadinessTicket(...)` | Support Center |
| `showEntityLocation` driver footer (L8251) | `go('live',null)` | **into** this page |
| `showNearbyDriversMap` no-context footer (L8451) | `go('live',null)` | **into** this page |
| Assign success toast (L11903) | `openProfile(r.rider)` | profile |
| Signal-loss toasts / notifications (L12588, L12590–L12591) | `openProfile(t.id)` | trip profile |
| Commits also refresh | `renderRequestsPage()`, `renderDashboard()`, `renderReadiness()`, `refreshNavCounts()`, `renderCompliancePage()`, `renderPredictivePage()` | Requests, Dashboard, Trip Readiness, sidebar counters, Compliance, Predictive |

---

## 15. External dependencies

| Dependency | Line | Used by this page? |
|---|---|---|
| `https://unpkg.com/leaflet@1.9.4/dist/leaflet.css` (CDN stylesheet) | **L469** | ❗ No — the Leaflet layer is inert — see §4.5 |
| `https://unpkg.com/leaflet@1.9.4/dist/leaflet.js` (CDN script) | **L470** | ❗ No — not by this page; every `L.*` reference reachable from `p-live` sits inside `initLeafletMap`/`updateLiveMarkers`/`showHistoryRoute`, which never execute or no-op on a `null` `_lmap`. The one *live* Leaflet consumer in the file is the Settings → Cities preview (L7872–L7874). |
| `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` (OSM raster tiles) | **L11574** (this page's `initLeafletMap`), also L7873 (city-preview map, a different feature) | ❗ Never requested from `p-live` |

**Both CDN URLs are external-network dependencies loaded on every page load** and would fail offline. The comment at L11514–L11519 explicitly notes the canvas renderer was chosen because it has "no external dependency (no CDN, no network, nothing to fail)" — yet the `<link>`/`<script>` tags were left in place. The only *live* consumer of Leaflet in the whole file is `cityPreviewMapInstance` in the Settings → Cities preview (L7871–L7874), which is guarded by `if(typeof L==='undefined')return;`.

No other external assets, fonts, or APIs are used by this module. All icons are inline SVG or emoji.

---

## 16. Hardcoded / mock / demo values

| Value | Line | Nature |
|---|---|---|
| `"· 3 active trips · updates every second"` | L775 | hardcoded, never recomputed |
| `#active-trips-count` seeded `3`, `#ride-req-count` seeded `3`, `#sub-req-count` seeded `0` | L832, L840, L836 | markup placeholders |
| `#replay-time-lbl` seeded `0:00 / 0:00` | L803 | markup placeholder |
| History-mode legend colours `#2E7D32` / `#C62828` / `#1A73E8` / `#E8A33D` | L808–L811 | static legend |
| Date select labels `Today — 25 Jun`, `Yesterday — 24 Jun`, `23 Jun (2 days ago)` | L12710–L12712 | hardcoded demo dates |
| `mapDateLabel()` returns `'24 Jun'` / `'23 Jun'` / `'25 Jun'` | L12643–L12647 | hardcoded |
| `MAP_ROUTES` — 7 hardcoded canvas polylines (§4.3) | L11933–L11941 | mock geometry |
| `var activeTrip='TRP-7741'` | L11942 | hardcoded default selection |
| `TRIP_COORDS` — 7 hardcoded Riyadh lat/lng paths | L11534–L11549 | **mock geo coordinates** (dead) |
| Riyadh centre `[24.7136, 46.6753]`, zoom `12`, `maxZoom:19` | L11573–L11575 | **hardcoded map coordinates** (dead) |
| `TRIP_COLORS` — 7 hardcoded hex colours | L11551–L11552 | dead |
| Canvas city grid: 18 block rects, 3 h-roads, 5 v-roads, minor lines, centre lines | L12822–L12843 | fake city |
| Road name labels `KING FAHD ROAD`, `NORTHERN RING`, `OLAYA ST`, `KING ABDULLAH RD` | L12846–L12850 | hardcoded |
| Canvas palette `#EAE6DF`, `#F2EFE8`, `#1A73E8`, `#2E7D32`, `#C62828`, `#7A5AF8`, `#4A2889` | L12820–L12957 | hardcoded |
| Replay duration `3000` ms | L12973 | demo constant |
| `TICK_ACCEL=30` (30× real time) | L11952 | demo constant |
| Default trip duration fallback `18` min | L12583 | demo constant |
| `AUTO_OFFER_DELAY_SEC=6`, `OFFER_WINDOW_SEC=12` | L11987–L11988 | demo constants |
| Driver accept chance `0.30 + (rating-3)*0.08` | L12561 | random simulation |
| Chat-message chance `Math.random()<0.02` per tick | L12593 | random simulation |
| `CHAT_TEMPLATES` — 7 canned rider/driver lines | L11716–L11724 | mock content |
| New trip id `'TRP-'+(9100+Math.floor(Math.random()*900))` | L11898, L12483 | random ids |
| `simulateAsyncCommit` 550 ms delay, 8 % failure | L10259–L10262 | simulated network |
| Ping thresholds 120 s / 300 s | L11656 | hardcoded |
| SLA-bar denominator `90` minutes | L11652 | hardcoded |
| SLA breach at `180` s | L12548 | hardcoded |
| Multi-stop fee fallback `3` SAR (`DB.multiStopConfig={extraStopFeeSAR:3}` L13862) | L11685, L11703 | config default |
| Cancellation fees `5` SAR (`qr_after_grace`) / `10` SAR (`qr_rider_noshow`) | L13939, L13942 | seed policy |
| `ROAD_CIRCUITY_FACTOR=1.35`, `URBAN_AVG_SPEED_KMH=26` | L7261–L7262 | ETA model constants |
| Radius defaults 6 km (quick) / 8 km (sub) | L8175–L8176 | config fallbacks |
| `DB.liveTrips` — 3 seeded trips (`TRP-7741`, `TRP-9012`, `TRP-7742`) | L2781–L2785 | seed data |
| `DB.rideRequests` — 3 seeded requests (`REQ-501`, `REQ-502`, `REQ-503`) | L2786–L2790 | seed data |
| `DB.trips` — 8 seeded trips, **all dated `25 Jun`** | L2671–L2683 | seed data |
| `DB.upcomingSubTrips` — 8 seeded scenarios `UST-1`…`UST-8` | L6177–L6241 | seed data |
| `simulateCall` unknown number `'+966 50 000 0000'` | L20371 | mock phone |
| Priority-call "Calling — HH:MM" pill (no dialler) | L9156 | pure UI simulation; the file states plainly at L20366–L20367 that there is no CTI |

---

## 17. i18n keys

**Zero `data-i18n` attributes exist anywhere inside `p-live` (L768–L845)** — verified by grep over the block (0 matches). Every string on the page is hardcoded English.

The only i18n key associated with this module is the sidebar nav label:

| Key | Default text | Line |
|---|---|---|
| `nav.live` | `Live map` | L498 |

Toolbar strings come from plain JS maps, not the i18n dictionary: `titles.live` (L2168) and `subs.live` (L2169). `applyLanguage()` is invoked at boot (L14596) but has nothing to translate on this page.

---

## 18. Gaps, dead code, UNVERIFIED items

### Confirmed bugs

1. **`pingBorderStyle()` is never applied — string-concatenation bug.** L11665 reads:
   ```js
   return '<div style="padding:11px 14px;border-bottom:.5px solid #F2F1EE;"+pingBorderStyle(t)+">'
   ```
   The `"+pingBorderStyle(t)+"` fragment sits *inside* the single-quoted JS string, so it is emitted as literal HTML text rather than evaluated. The red/amber left border for stale-GPS trips never renders, and the malformed attribute text leaks into the markup. `pingBorderStyle` (L11657) is therefore effectively dead.

2. **`#live-last-update` is permanently empty** (L775). Its only writer is `updateLiveMarkers()` (L11582–L11583), which returns on line 1 because `_lmap` is `null`.

3. **The whole Leaflet/OSM layer is inert** (L11526–L11635). `renderLiveMap()` has no caller at all, and `initLeafletMap()` is called only from inside it (L11633), so `_lmap` stays `null` forever; `updateLiveMarkers()` and `showHistoryRoute()` do have live call sites (L12598, L12688) but return immediately on the `null` guard. `#map-leaflet` does not exist in the markup (only the orphan CSS rule at L349). Two CDN resources (L469, L470) are still loaded on every page view for nothing.

4. **`openSendChatModal()` / `commitSendChatMsg()` are unreachable from this page** (L11732, L11742). The `💬 Chat` button calls `openTripChatView()` (L11754) which opens the profile instead. No button anywhere in `p-live` opens the "Send message" modal.

5. **The two non-today date options return nothing.** All seeded `DB.trips` are `25 Jun` (L2671–L2683), so `Yesterday — 24 Jun` and `23 Jun (2 days ago)` always show the empty state.

6. **`commitLiveReassign` and `confirmCancelLiveTrip` do not update `DB.trips`.** They mutate only `DB.liveTrips` (L11799, L11836). The historical `DB.trips[id]` record keeps its old driver / `In trip` status, so the Live-Map history table and the Trips page will disagree with the live board after either action.

7. **"rider notified" toasts have no send.** `commitLiveReassign` toasts `· rider notified` (L11802) and `sendRiderChangeNotif` toasts `✅ Rider notified` (L8594) without any `sendSystemEmail`/notification call. (`commitAddStop` L11706 *does* call `sendSystemEmail`.)

8. **`cancelRequest()` deletes irreversibly** (L11915). It is both permission-gated (`live_ops`) and confirm-gated (`GATE_SWEEP.cancelRequest` L20871, `d:true`), but the `splice` has no restore path once confirmed.

9. **Auto-created live trips have no map presence.** `commitRequestAssign` (L11898) and `driverAcceptOffer` (L12483) push trips with `mapTrip:null` and random `TRP-91xx` ids that are absent from `MAP_ROUTES`, so `🗺 Track` always warns and no dot is drawn.

10. **`renderMapTripsTable()` and `renderMapTripsTableFiltered()` are near-duplicate implementations** (L12660 vs L11522) that differ subtly: the filtered variant labels the vehicle fallback `'Eco'` (L11524) while the unfiltered one uses `'Economy'` (L12679), and the filtered variant's replay button label is `▶` rather than `▶ Replay`.

11. **Two conflicting `.map-stat` / `.ms-item` CSS declarations** (L217–L220 vs L365–L368). The later block wins; the earlier one is dead.

12. **Filter chips do not affect the canvas** — only the table (L11522–L11524). A user filtering to `Cancelled` still sees the previously-selected route drawn.

13. **`updateMapStats()` runs in Live mode too** (L11521), so the stats bar shows the *history-selected* trip (`TRP-7741` by default) even while the header claims live tracking.

### Not applicable to this page (named in the brief, verified elsewhere)

- `cancelSubDispatch()` (L5022) — new-subscription dispatch modal only.
- `selDriver(el)` (L5872) — generic `.plan-option` radio selector, used by the Export modal (L5033).
- `simulateCall(known)` (L20368) — contact-centre simulator panel (L20361).
- `showEntityLocation()` (L8226) — reachable *into* the flow via the nearby-drivers back button (L8450) and from pin buttons on other pages (L3285, L9910, L13028); it is not invoked by any control inside `p-live`.

### UNVERIFIED

- **Runtime behaviour of `openProfile(tripId)` for `TRP-*` ids** — `window.openProfile` (L8827) was not read in full for this module; whether the trip profile renders the `DB.commLogs` chat thread is asserted only by the comment at L11712–L11715. *Reason: outside the module boundary.*
- **`debitRiderWallet()` return semantics** — treated as boolean success at L11839. Its body was not read. *Reason: outside the module boundary.*
- **`playAlertBeep()`, `pushOpsNotification()`, `refreshNavCounts()`, `renderRequestsPage()`, `renderReadiness()` internals** — called by this module's tick loop and commits but not inspected. *Reason: outside the module boundary.*
- **Whether `DB.opsConfig.quickRideRadiusKm` / `subRadiusKm` / `autoExpandRadius` are ever set** — only their fallbacks (6 / 8 / not-false) were verified at L8175–L8176 and L8200.
- **Actual browser rendering of the malformed `renderActiveTrips` row div** (bug 1) — the source defect is certain; how a given browser recovers from the stray attribute text was not tested.

---

## 19. Line-number index

### Markup
| Item | Lines |
|---|---|
| Leaflet CSS + JS CDN tags | L469, L470 |
| `#map-leaflet` orphan CSS | L349 |
| Map/stat/replay/tab/chip CSS | L214–L224, L327, L333, L336–L347, L365–L368 |
| Sidebar nav item `go('live')` | L498 |
| **Page `p-live`** | **L768–L845** |
| `#live-mode-bar`, `#live-last-update` | L775 |
| `#tab-live` / `#tab-history` | L777, L778 |
| `#map-filter-row` + 5 chips | L780–L787 |
| `#map-history-ctrl` (date, trip, replay, legend) | L788–L813 |
| `#map-stats` | L815 |
| `#map-canvas` | L817 |
| Trips table + `#map-trips-tbody` | L819–L827 |
| Active-trips card | L831–L834 |
| Sub-requests card | L835–L838 |
| Ride-requests card | L839–L842 |

### Data
| Item | Lines |
|---|---|
| `titles.live` / `subs.live` | L2168 / L2169 |
| `DB.trips` (8 records) | L2670–L2684 |
| `DB.liveTrips` (3) | L2781–L2785 |
| `DB.rideRequests` (3) | L2786–L2790 |
| `DB.upcomingSubTrips` (8) | L6177–L6241 (no-op fallback L6243) |
| `DB.multiStopConfig` | L13862 |
| `DB.cancellationPolicy` seeds | L13939, L13942 |

### Functions
| Function | Lines |
|---|---|
| `requirePerm` / `logAction` | L3126 / L3133 |
| `rowLink` | L3283 |
| `nm2` | L3565 |
| `statusBadge` | L3730 |
| `getCancellationRule` | L5548 |
| `customSelectHTML` / `cselSetValue` | L5336 / L5427 |
| `selDriver` | L5872 |
| `geoDistanceKm` / `estimateEtaMin` / `fmtKm` / `driverLiveState` | L7256 / L7274 / L7281 / L7283 |
| `nearestAvailableDrivers` | L8167 |
| `mapFit` / `drawCityBlocks` | L8205 / L8212 |
| `showEntityLocation` | L8226 |
| `tripScenario` / `scenarioBannerHTML` | L8292 / L8329 |
| `showNearbyDriversMap` | L8354 |
| `assignNearestDriver` | L8482 |
| `quickContactDriver` / `logNdvContact` | L8500 / L8515 |
| `callDriverUrgent` / `logDriverCall` | L8547 / L8559 |
| `fmtCountdown` | L8710 |
| `window.go` (router; `live` branch **L8790**) | L8774 |
| `openProfile` | L8827 |
| `priorityCall` / `logPriorityCall` | L9149 / L9161 |
| `pickNearbyDriver` | L10243 |
| `simulateAsyncCommit` | L10259 |
| `STAGES` / `stagePipelineHTML` | L11495 / L11496 |
| **`renderLiveOps`** | **L11504** |
| `MAP_MODE` / `MAP_FILT` | L11512 |
| **`setMapMode`** | **L11513–L11522** |
| **`setMapFilter`** | **L11522** |
| `renderMapTripsTableFiltered` | L11522–L11524 |
| Leaflet block (`_lmap`…`renderLiveMap`) | L11529–L11635 |
| `TRIP_COORDS` / `TRIP_COLORS` / `carIcon` | L11534 / L11551 / L11554 |
| `initLeafletMap` / `updateLiveMarkers` / `showHistoryRoute` / `renderLiveMap` | L11569 / L11579 / L11623 / L11632 |
| `renderSubRequests` | L11637 |
| `pingHTML` / `pingBorderStyle` | L11656 / L11657 |
| `renderActiveTrips` | L11658 |
| `openAddStopModal` / `commitAddStop` | L11683 / L11697 |
| `CHAT_TEMPLATES` / `simulateLiveChatMessage` | L11716 / L11725 |
| `openSendChatModal` / `commitSendChatMsg` | L11732 / L11742 |
| `openTripChatView` / `focusLiveTrip` | L11754 / L11760 |
| `interveneTrip` | L11765 |
| `reassignLiveDriver` / `commitLiveReassign` | L11789 / L11794 |
| `cancelLiveTrip` / `confirmCancelLiveTrip` | L11804 / L11824 |
| `renderRideRequests` | L11850 |
| **`assignManually`** | **L11871** |
| `commitRequestAssign` | L11884 |
| `cancelRequest` | L11915 |
| `MAP_ROUTES` / `activeTrip` / `replayAnim` / `replayPct` | L11933 / L11942 / L11943 / L11944 |
| `TICK_ACCEL` / `bumpWait` / `pathPoint` / `startTickEngine` | L11952 / L11955 / L11960 / L11966 |
| `AUTO_OFFER_DELAY_SEC` / `OFFER_WINDOW_SEC` | L11987 / L11988 |
| `completeTrip` | L12406 |
| `driverAcceptOffer` | L12476 |
| **`tickEngine`** | **L12508–L12607** |
| `initMapClicks` | L12626 |
| `mapTripTime` / `mapDateLabel` / `tripsForMapDate` / `tripOnTime` | L12642 / L12643 / L12648 / L12654 |
| **`renderMapTripsTable`** | **L12660** |
| `selectTrip` | L12687 |
| **`renderMapFilterSelects`** | **L12706** |
| `rebuildMapTripSelect` / `onMapDateChange` / `updateMap` | L12718 / L12733 / L12740 |
| `updateMapStats` | L12745 |
| **`drawMap`** | **L12812–L12960** |
| `startReplay` | L12962 |
| Boot: `startTickEngine()` / `initMapClicks()` | L14598 / L14599 |
| `simulateCall` | L20368 |

---

## 20. Nearby-driver-map helpers (added in remediation)

> Added by Verification Pass 1 remediation (Pass 1 §6.1, item P2-7): *"the `deprioritizeAssign` behaviour they encode is a real UX rule, not plumbing."* Three inner functions of `showNearbyDriversMap` (L8354) that §10 of this document describes the *output* of without naming the code that produces it.

All three are **closures declared inside `window.showNearbyDriversMap=function(riderId,ustId)`** (L8354), which is why they never appear as top-level symbols and why they can read `sc`, `t`, `nearby`, `pinCurrent` and `deprioritizeAssign` without parameters.

### 20.1 `assignBtnClass()` — L8382

```js
function assignBtnClass(){return deprioritizeAssign?'btn sm':'btn p sm';}
```

One line, and it encodes a genuine dispatch policy: **when the trip is not actually in trouble, the Assign button stops being the primary action.**

`deprioritizeAssign` is computed one statement after `canAssign`:

```js
var canAssign=!!(t||req||liveT||sreq);                                     /* L8368 */
var deprioritizeAssign=!!(sc&&(sc.key==='watch'||sc.key==='watch_confirm'
                              ||sc.key==='unconfirmed'||sc.key==='ok'));   /* L8369 */
```

| Scenario key (`sc.key`) | `deprioritizeAssign` | Button class | Reading |
|---|---|---|---|
| `watch` | true | `btn sm` (secondary) | being monitored — do not push a reassignment |
| `watch_confirm` | true | `btn sm` | monitored, awaiting confirmation |
| `unconfirmed` | true | `btn sm` | driver has not confirmed yet — give them time |
| `ok` | true | `btn sm` | nothing is wrong |
| `late` / `unavailable` / `unassigned` / any other | false | **`btn p sm`** (primary) | act now |

Used once, at **L8421**, inside `ndvRow`:

```js
+(canAssign?'<button class="'+assignBtnClass()+'" '
  +(busy?'disabled title="Driver is on a trip right now"':'')
  +' onclick="pickNearbyDriver(\''+d.id+'\')">'+(liveT?'🔁 Reassign':'✅ Assign')+'</button>':'')
```

Two orthogonal modifiers stack on the same button:

- **prominence** — `assignBtnClass()`, driven by the *trip's* scenario;
- **availability** — `disabled` plus `title="Driver is on a trip right now"`, driven by the *driver's* `busy` state (L8405).

So a busy driver in an `ok` scenario yields a disabled secondary button; a free driver in a `late` scenario yields an enabled primary one. The label also switches: `🔁 Reassign` when `liveT` is set, `✅ Assign` otherwise.

The whole button is omitted when `canAssign` is false — i.e. when the modal was opened without any of `t`, `req`, `liveT` or `sreq` (L8368), which is the read-only "just show me who is nearby" case.

### 20.2 `pinnedRowHTML()` — L8384–L8398

Emits the **"Currently assigned"** row that sits above the candidate list. Guarded by `pinCurrent`:

```js
var pinCurrent=!!(sc&&sc.key==='late'&&t.driver&&DB.drivers[t.driver]);   /* L8370 */
```

**It appears only in the `late` scenario** — not `unavailable`, not `unassigned`. The rationale is legible from the content: when a trip is *late*, the assigned driver still exists and the first useful action is to call them, not to replace them.

| Element | Line | Detail |
|---|---:|---|
| Section header | L8388 | `Currently assigned`, 10 px uppercase, `var(--ghost)` |
| Row container | L8389 | `.ndv-row` overridden to `border-color:var(--amber-border); background:var(--amber-lt)` — **amber, unlike every other row** |
| Avatar | L8390 | `avatarHTML(d.name,38,d.hasPhoto)` — same 38 px size as candidate rows |
| Title | L8392 | name + gold/silver badge (`standard` gets no badge) |
| Subtitle | L8393 | `★ <rating> · <vehicle> · <phone>`; rating omitted when falsy |
| Status badge | L8394 | **`📌 Assigned — not moving yet`** (`b b-amber`) — the diagnosis, stated in the row |
| Action | L8396 | a single `btn sm danger` → **`callDriverUrgent(t.driver, t.id)`**, labelled `📞 Call now` |

Note the action is **`callDriverUrgent`**, not the `quickContactDriver` used by ordinary candidate rows (L8420) — the pinned row's only affordance is the escalated call path.

Emitted once, at **L8440**, immediately after `scenarioBannerHTML(sc,t)` (L8439) and immediately before `sectionLabel()` (L8441). It returns `''` when `pinCurrent` is false (L8385), so the concatenation is unconditional and the guard lives inside the function.

`pinCurrent` also drives two other things in the same modal: the legend gains an `Assigned` swatch (`#E8A33D`, L8436), and the "no location data" fallback is suppressed when a pinned row is already showing (L8444) — because the operator is not looking at an empty modal.

### 20.3 `sectionLabel()` — L8399–L8403

The header for the candidate list, with **two mutually exclusive forms**:

| Case | Text | Line |
|---|---|---:|
| `pinCurrent` true | **`Backup options nearby`** | L8400 |
| `pinCurrent` false | `<n> nearest drivers` — or **`No driver location data`** when `nearby.length===0` — followed by a context suffix | L8401–L8402 |

The context suffix in the second form is a four-way ladder over the same variables the modal was opened with:

| Condition | Suffix | Line |
|---|---|---:|
| `t` | `' · trip '+t.route` | L8402 |
| else `req` | `' · '+req.pickup+' → '+req.dest` | L8402 |
| else `liveT` | `' · reassigning '+liveT.id+' — now: '+nm2(liveT.driver)` | L8402 |
| else | `''` | L8402 |

The `Backup options nearby` wording is the point: once a driver is pinned above, the list below is no longer "the drivers" — it is the fallback set, and the label says so rather than leaving the operator to infer it from position.

Emitted once, at **L8441**.

### 20.4 How the three compose — the modal's assembly order, L8431–L8451

| Fragment | Line |
|---|---:|
| `.modal-head` with rider name + readiness badge | L8432 |
| `<canvas id="ndv-canvas" width="520" height="210">` | L8434 |
| `.ndv-legend` — rider / Available / On a trip, **+ Assigned when `pinCurrent`** | L8435–L8436 |
| `scenarioBannerHTML(sc,t)` | L8439 |
| **`pinnedRowHTML()`** | **L8440** |
| **`sectionLabel()`** | **L8441** |
| `radiusNotice` (city-not-live warning, built L8374) | L8442 |
| `nearby.map(ndvRow)` — or the no-location fallback, suppressed when `pinCurrent` | L8444 |
| `escalationHTML` (built L8424–L8429) | L8446 |
| `.modal-foot` — Close, plus a scenario-dependent back button | L8448–L8451 |

Two neighbouring conditionals are worth recording alongside these three helpers because they share the same inputs:

- **`showEscalation`** (L8380) = `urgentKey && availableCount===0`, where `urgentKey` is `sc.key` in `{unavailable, unassigned, late}` (L8378) and `availableCount` counts `!n.live.busy` candidates (L8379). It produces the red *"🚫 No available driver nearby right now"* block (L8425–L8428) whose only action is `openReadinessTicket(...)`.
- **Self-exclusion** (L8375–L8376): `if(t)nearby=nearby.filter(n=>n.id!==t.driver).slice(0,5)` and the same for `liveT` — the currently assigned driver is removed from the candidate list *and* the list is re-capped at 5, which is why `pinnedRowHTML` exists at all: the pinned driver has been filtered out of `nearby` and must be re-introduced separately.

Note `nearestAvailableDrivers(riderId, (t||liveT)?6:5, matchKind)` at **L8373** asks for **6** candidates when a trip is in play and **5** otherwise — the extra one covers the driver about to be filtered out at L8375.

### 20.5 Line-number index for §20

| Symbol | Lines |
|---|---|
| `scenarioBannerHTML(sc,t)` | 8329+ (comment block precedes L8354 at 8348–8353) |
| **`window.showNearbyDriversMap(riderId,ustId)`** | **8354+** |
| `pinCurrent` | 8370 |
| `matchKind` / `nearestAvailableDrivers` (6 vs 5) | 8372 / 8373 |
| `radiusNotice` | 8374 |
| self-exclusion filters | 8375–8376 |
| `urgentKey` | 8378 |
| `availableCount` | 8379 |
| `showEscalation` | 8380 |
| **`assignBtnClass()`** | **8382** |
| `canAssign` / **`deprioritizeAssign`** | 8368 / **8369** |
| **`pinnedRowHTML()`** | **8384–8398** |
| — amber row styling | 8389 |
| — `📌 Assigned — not moving yet` | 8394 |
| — `callDriverUrgent` | 8396 |
| **`sectionLabel()`** | **8399–8403** |
| — `Backup options nearby` | 8400 |
| — `<n> nearest drivers` / `No driver location data` + suffix | 8401–8402 |
| `ndvRow(n,i)` | 8404–8423 |
| — `quickContactDriver` | 8420 |
| — **`assignBtnClass()` call site** | **8421** |
| `escalationHTML` | 8424–8429 |
| modal assembly | 8431–8451 |
| — `#ndv-canvas` | 8434 |
| — legend (+ Assigned swatch) | 8435–8436 |
| — **`pinnedRowHTML()` call site** | **8440** |
| — **`sectionLabel()` call site** | **8441** |
| — `pinCurrent`-suppressed fallback | 8444 |
