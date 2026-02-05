# Quickstart: Database Layer

**Feature**: 004-database-layer

## Seed Data Usage

### Run Seed Command

```bash
# From repository root
npm run seed

# Or from server package
cd packages/server
npm run seed
```

### What Gets Created

The seed command populates the database with demo data from LODM 2024:

| Entity | Count | Description |
|--------|-------|-------------|
| Event | 1 | "Hry XI. letní olympiády dětí a mládeže 2024" |
| Classes | 2 | K1M-ZS (men), K1W-ZS (women) |
| Participants | 20 | 10 per class, real Czech names |
| Races | 2 | One BR1 race per class |
| Results | 20 | Mix of OK, DNS, DNF statuses |
| Course | 1 | Standard 24-gate slalom course |

### Verify Seed Data

```bash
# Start server
npm run dev

# Check events API
curl http://localhost:3000/api/v1/events

# Expected response
{
  "events": [
    {
      "eventId": "CZE2.2024062500",
      "mainTitle": "Hry XI. letní olympiády dětí a mládeže 2024",
      "location": "České Budějovice",
      "status": "finished"
    }
  ]
}
```

### Re-run Seed (Idempotent)

Running `npm run seed` again will:
1. Clear existing demo data
2. Re-insert fresh seed data
3. Preserve any non-seed data (if applicable)

## Data Model Documentation

Full data model documentation is available at:

- **ERD Diagram**: [data-model.md](./data-model.md#entity-relationship-diagram)
- **Table Descriptions**: [data-model.md](./data-model.md#table-descriptions)
- **XML Mapping**: [data-model.md](./data-model.md) (XML Source column in each table)
- **Reference Data**: [data-model.md](./data-model.md#reference-data) (DisId, RaceStatus, Status codes)

### Source Documentation

The data model is based on:
- [c123-protocol-docs/c123-xml-format.md](../../../c123-protocol-docs/c123-xml-format.md) - Full XML format specification
- [c123-protocol-docs/samples/2024-LODM-fin.xml](../../../c123-protocol-docs/samples/2024-LODM-fin.xml) - Sample data source

## Development Workflow

### Fresh Start

```bash
# Clone and install
git clone <repo>
cd c123-live-mini
npm install

# Seed database
npm run seed

# Start development
npm run dev
```

### Testing with Seed Data

```bash
# Run tests (uses seeded database)
npm test

# Expected: All tests pass with known seed data assertions
```

## Troubleshooting

### Seed Fails with "Database locked"

```bash
# Stop any running server instances
pkill -f "node.*server"

# Retry seed
npm run seed
```

### Empty Results from API

Verify seed ran successfully:
```bash
# Check database file exists
ls -la packages/server/data/live-mini.db

# Re-run seed if needed
npm run seed
```

### Seed Data Doesn't Match Expected Values

The seed data is deterministic - same data every time. If values differ:
1. Check you're on correct branch (`004-database-layer` or later)
2. Re-run seed to reset to known state
3. Check for schema migrations that may have changed structure
