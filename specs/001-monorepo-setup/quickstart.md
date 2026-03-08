# Quickstart: c123-live-mini Development

## Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher (comes with Node.js 20)

```bash
# Verify versions
node --version  # Should be v20.x.x or higher
npm --version   # Should be 10.x.x or higher
```

## GitHub Package Registry Authentication

This project uses `@czechcanoe/rvp-design-system` from GitHub Package Registry.
You need to authenticate **before** running `npm install`.

1. Create a GitHub Personal Access Token with `read:packages` scope:
   https://github.com/settings/tokens

2. Create `.npmrc` in the project root:
   ```
   @czechcanoe:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
   ```

> `.npmrc` is gitignored and must be created manually on each machine.

## Initial Setup

```bash
# Clone the repository
git clone https://github.com/OpenCanoeTiming/c123-live-mini.git
cd c123-live-mini

# Install all dependencies (server, client, shared)
npm install
```

## Development

```bash
# Start both server and client in development mode
npm run dev

# Server runs on http://localhost:3000 (or configured port)
# Client runs on http://localhost:5173 (Vite default)
```

## Package-Specific Commands

```bash
# Work with specific package
npm run dev -w @c123-live-mini/server    # Server only
npm run dev -w @c123-live-mini/client    # Client only

# Build specific package
npm run build -w @c123-live-mini/server
npm run build -w @c123-live-mini/client

# Test specific package
npm run test -w @c123-live-mini/server
npm run test -w @c123-live-mini/client
```

## Project Structure

```
c123-live-mini/
├── packages/
│   ├── server/          # Fastify backend
│   ├── client/          # React + Vite frontend
│   └── shared/          # Shared types and utilities
├── package.json         # Root workspace config
└── tsconfig.base.json   # Shared TypeScript config
```

## Working with Shared Types

Types defined in `packages/shared/src/` are automatically available to both server and client:

```typescript
// In packages/shared/src/index.ts
export interface Event {
  id: string;
  name: string;
  status: 'draft' | 'running' | 'finished';
}

// In packages/server/src/... or packages/client/src/...
import { Event } from '@c123-live-mini/shared';
```

Changes to shared types are immediately reflected in both packages during development.

## Build for Production

```bash
# Build all packages
npm run build

# Output locations:
# - packages/server/dist/
# - packages/client/dist/
```

## Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Common Issues

### "Cannot find module '@c123-live-mini/shared'"

Run `npm install` from the repository root to link workspace packages.

### TypeScript errors after changing shared types

Restart your IDE's TypeScript server or run `npm run build -w @c123-live-mini/shared`.

### Port already in use

Check for existing processes on ports 3000 (server) or 5173 (client) and terminate them.

### "401 Unauthorized" during npm install

You're missing `.npmrc` with GitHub Package Registry credentials.
See **GitHub Package Registry Authentication** section above.
