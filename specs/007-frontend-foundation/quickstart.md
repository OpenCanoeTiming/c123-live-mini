# Quickstart: Frontend Foundation

## Prerequisites

```bash
# Start server with seed data
cd /workspace/timing/c123-live-mini
npm run seed
npm run dev
```

Server runs on http://localhost:3000, client on http://localhost:5173.

## User Flows

### 1. Browse Events

Open http://localhost:5173

Expected: Event list with cards showing:
- Title: "LODM 2024"
- Subtitle: "Litoměřice"
- Location, dates
- Status badge (running = green, finished = blue)
- Live indicator on running events

### 2. Select Event → View Races

Click on "LODM 2024" event card.

Expected:
- URL changes to `/#/events/CZE2.2024062500`
- Event header with title, location, dates
- Class tabs (Level 1): e.g., "C1M", "K1W"
- Round tabs (Level 2): e.g., "Kvalifikace", "Finále"
- First class + first round auto-selected
- Results table loads automatically

### 3. View Results

Expected results table columns:
- Poř. (rank)
- St.č. (bib)
- Jméno (name) + klub (club) below
- Čas (time) — monospaced
- Trest (penalty) — monospaced
- Výsledek (total) — monospaced
- Ztráta (behind)

DNS/DNF/DSQ athletes at bottom with status label in red.

### 4. Switch Race

Click different round tab (e.g., "Finále").

Expected:
- URL updates to `/#/events/CZE2.2024062500/race/F-C1M`
- Results reload for selected race
- Category filter stays active if set

### 5. Filter by Category

Select category from filter pills (e.g., "Ženy Seniorky").

Expected:
- Only matching athletes shown
- Rankings change to category-specific (catRnk)
- Behind times change to category-specific (catTotalBehind)
- Filter persists when switching races

Clear filter → all athletes shown again with overall ranking.

### 6. Best-Run Results

Navigate to a best-run race (e.g., "1. jízda" or "2. jízda").

Expected:
- Both runs shown per athlete (1. jízda, 2. jízda columns)
- Better run visually highlighted
- Combined result (Výsledek) shows best of both

### 7. View Startlist

Navigate to a race with no results but published startlist.

Expected:
- Startlist table: St.č., Jméno, Klub, Kategorie
- Athletes in start order

### 8. Share URL

Copy URL `/#/events/CZE2.2024062500/race/Q-C1M` and open in new tab.

Expected: Same event and race results load directly.

### 9. Error Handling

Stop the server and reload.

Expected:
- "Chyba připojení" error message
- "Zkusit znovu" retry button
- Clicking retry attempts reconnection

### 10. Browser Navigation

Use browser back button from event detail.

Expected: Return to event list.

## Mobile Testing

Open http://localhost:5173 in device emulator (320px wide).

Expected:
- No horizontal scrolling
- Readable text
- Tappable targets (min 44px)
- Tables scroll horizontally if needed (within container)
