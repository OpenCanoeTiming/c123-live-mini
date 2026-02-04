# Research: Monorepo Setup

**Feature**: 001-monorepo-setup
**Date**: 2026-02-04

## 1. npm Workspaces Configuration

### Decision
Use npm workspaces with `packages/*` glob pattern in root package.json.

### Rationale
- Built into npm (no additional tooling like Lerna, Turborepo, or Nx)
- Simple configuration for small monorepo (3 packages)
- Native support for cross-package dependencies
- Hoisting of shared dependencies reduces install time and disk usage

### Alternatives Considered
| Alternative | Why Rejected |
|-------------|--------------|
| Lerna | Overkill for 3 packages; npm workspaces covers our needs |
| Turborepo | Adds complexity; caching benefits minimal for this scale |
| Nx | Enterprise-focused; significant learning curve |
| pnpm workspaces | Project constraint specifies npm |
| Yarn workspaces | Project constraint specifies npm |

### Configuration Pattern
```json
{
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "npm run dev --workspaces --if-present",
    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present"
  }
}
```

---

## 2. TypeScript Configuration Strategy

### Decision
Use `tsconfig.base.json` at root with package-specific `tsconfig.json` extending it. Use TypeScript path aliases (not project references) for cross-package imports.

### Rationale
- Path aliases are simpler to configure than project references
- Works seamlessly with Vite's resolve.alias
- No need for `tsc --build` composite mode complexity
- Shared package publishes compiled JS; consumers import from built output

### Alternatives Considered
| Alternative | Why Rejected |
|-------------|--------------|
| TypeScript Project References | Complex setup for build orchestration we don't need |
| Single tsconfig for all | Prevents package-specific compiler options |
| No shared base | Code duplication in tsconfig files |

### Configuration Pattern

**Root tsconfig.base.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true
  }
}
```

**Package tsconfig.json:**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

---

## 3. Cross-Package Import Strategy

### Decision
Use standard version specifier (`*`) for internal workspace dependencies. Shared package exports from `src/index.ts`, consumers import via package name.

### Rationale
- npm workspaces resolves `*` version to local packages automatically (note: `workspace:*` protocol is pnpm-specific)
- No path aliases needed in tsconfig for runtime
- TypeScript resolves types through package.json `types` field
- Clean import syntax: `import { Type } from '@c123-live-mini/shared'`

### Package Naming Convention
- `@c123-live-mini/server`
- `@c123-live-mini/client`
- `@c123-live-mini/shared`

### Configuration Pattern

**shared/package.json:**
```json
{
  "name": "@c123-live-mini/shared",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

**server/package.json:**
```json
{
  "dependencies": {
    "@c123-live-mini/shared": "*"
  }
}
```

---

## 4. Development Server Strategy

### Decision
Use `concurrently` to run server and client dev servers in parallel from root.

### Rationale
- Simple, well-maintained package
- Color-coded output distinguishes server vs client logs
- Single terminal for both processes
- Graceful shutdown of both on Ctrl+C

### Alternatives Considered
| Alternative | Why Rejected |
|-------------|--------------|
| npm-run-all | Less maintained than concurrently |
| Manual terminal tabs | Poor DX, not scriptable |
| Turborepo dev | Overkill for 2 processes |

### Configuration Pattern
```json
{
  "scripts": {
    "dev": "concurrently -n server,client -c blue,green \"npm run dev -w @c123-live-mini/server\" \"npm run dev -w @c123-live-mini/client\""
  }
}
```

---

## 5. Test Runner Selection

### Decision
Use Vitest as unified test runner for all packages.

### Rationale
- Native TypeScript support (no ts-jest configuration)
- Compatible with Vite (same config/plugins)
- Fast execution with watch mode
- Works for both Node.js (server) and browser-like (client) code
- Single test command from root

### Alternatives Considered
| Alternative | Why Rejected |
|-------------|--------------|
| Jest | Requires additional TypeScript configuration |
| Mocha | Needs separate assertion library, more setup |
| Node.js test runner | Limited ecosystem, no watch mode |

### Configuration Pattern
Root `vitest.workspace.ts`:
```typescript
export default ['packages/*']
```

---

## 6. Node.js Version Specification

### Decision
Use `.nvmrc` file with `20` (latest LTS major) and `engines` field in root package.json.

### Rationale
- `.nvmrc` enables `nvm use` for developers
- `engines` field warns on incompatible versions
- Node 20 is current LTS with ESM support

### Configuration Pattern
**.nvmrc:**
```
20
```

**package.json:**
```json
{
  "engines": {
    "node": ">=20.0.0"
  }
}
```

---

## Summary of Decisions

| Area | Decision |
|------|----------|
| Monorepo Tool | npm workspaces |
| TypeScript Strategy | Base config + extends, no project references |
| Cross-Package Imports | * version (npm workspaces) |
| Package Naming | @c123-live-mini/{server,client,shared} |
| Dev Runner | concurrently |
| Test Runner | Vitest |
| Node.js Version | 20.x LTS |
