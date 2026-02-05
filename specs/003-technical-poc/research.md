# Research: Technical PoC

**Feature**: 003-technical-poc
**Date**: 2026-02-05

## Technology Decisions

### 1. Monorepo Tooling

**Decision**: npm workspaces (native)

**Rationale**:
- Native to Node.js, no additional tooling required
- Sufficient for 2-package monorepo
- Simple configuration in root package.json
- Works well with TypeScript project references

**Alternatives Considered**:
- Turborepo: Overkill for 2 packages, adds complexity
- Nx: Too heavy for PoC scope
- pnpm workspaces: Would require pnpm adoption across project

### 2. Server Framework

**Decision**: Fastify 5.x

**Rationale**:
- High performance with low overhead
- Excellent TypeScript support
- Schema-based validation built-in
- Plugin architecture for extensibility
- Already specified in project architecture

**Alternatives Considered**:
- Express: Less performant, weaker TypeScript integration
- Hono: Newer, less ecosystem maturity
- Koa: Smaller ecosystem than Fastify

### 3. Database Layer

**Decision**: Kysely + better-sqlite3

**Rationale**:
- Kysely provides type-safe SQL query building
- better-sqlite3 is synchronous (simpler for PoC)
- SQLite requires no external server
- Migration support built into Kysely
- Already specified in project architecture

**Alternatives Considered**:
- Drizzle ORM: Similar capabilities, Kysely already chosen
- Prisma: Heavier, requires code generation step
- Raw SQL: Loses type safety benefits

### 4. Frontend Framework

**Decision**: React 18 + Vite

**Rationale**:
- React is widely adopted, good ecosystem
- Vite provides fast development experience
- Simple setup for SPA
- Works well with rvp-design-system

**Alternatives Considered**:
- Next.js: SSR not needed for PoC
- SolidJS: Smaller ecosystem
- Vue: React already standard for timing projects

### 5. Design System Integration

**Decision**: rvp-design-system via npm

**Rationale**:
- Mandated by architecture for public-facing apps
- Provides consistent CSK branding
- Pre-built components reduce frontend work

**Notes**:
- Must use rvp-design-system exclusively (no inline styles)
- Check npm registry for latest version

### 6. Testing Strategy

**Decision**: Vitest for unit/integration tests

**Rationale**:
- Native ESM support
- Fast execution
- Compatible with Vite
- Similar API to Jest (familiar)

**Alternatives Considered**:
- Jest: Slower, ESM configuration complex
- Playwright: Keep for E2E only (optional for PoC)

### 7. CORS Configuration

**Decision**: Permissive CORS in development

**Rationale**:
- PoC runs locally, no security concerns
- Frontend dev server on different port than API
- Simple @fastify/cors plugin

**Implementation**:
```typescript
// Development only
fastify.register(cors, { origin: true });
```

### 8. API Response Format

**Decision**: Standard JSON responses with consistent structure

**Rationale**:
- Simple and predictable for frontend consumption
- Easy to extend later

**Format**:
```typescript
// Success
{ "data": {...} }

// Error
{ "error": { "message": "...", "code": "..." } }
```

## Open Questions Resolved

| Question | Resolution |
|----------|------------|
| Package organization | Monorepo with npm workspaces |
| Database file location | `packages/server/data/poc.db` (gitignored) |
| Dev server ports | Server: 3001, Frontend: 5173 (Vite default) |
| API prefix | `/api/v1` for future versioning |

## Dependencies Summary

### Server (`packages/server`)
```json
{
  "dependencies": {
    "fastify": "^5.0.0",
    "kysely": "^0.27.0",
    "better-sqlite3": "^11.0.0",
    "@fastify/cors": "^10.0.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "^2.0.0",
    "@types/better-sqlite3": "^7.6.0",
    "tsx": "^4.0.0"
  }
}
```

### Frontend (`packages/page`)
```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "rvp-design-system": "latest"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vite": "^5.4.0",
    "@vitejs/plugin-react": "^4.3.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0"
  }
}
```
