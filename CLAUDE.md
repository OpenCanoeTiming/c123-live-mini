# c123-live-mini

Minimalistic live results solution for C123 timing ecosystem.

## SDD Workflow

This project uses Spec-Driven Development. Full methodology:
https://github.com/jakubbican/gh-sdd-ai-workflow

### Issue Types

| Type | Label | Purpose |
|------|-------|---------|
| Feature | `type/feature` | New functionality, triggers Spec-Kit |
| Task | `type/task` | Implementation unit from spec |
| Bug | `type/bug` | Bug fix, no spec needed |
| Feedback | `type/feedback` | Feedback on existing feature |

### Feature Workflow

1. **Create Feature issue** on GitHub (label: `type/feature`, `spec/draft`)
2. **Read issue and run Spec-Kit:**
   - `/speckit.specify` with issue content
   - `/speckit.clarify` - answer questions
   - `/speckit.plan` - technical plan
   - `/speckit.tasks` - generate tasks
3. **Create task issues:** `/speckit.taskstoissues`
4. **Change label** to `spec/approved`
5. **Implement tasks**, commit with `Closes #N`

### Branching Strategy

| Issue Type | Branch Pattern | Example |
|------------|----------------|---------|
| Feature | `feature/{N}-{slug}` | `feature/42-ingest-api` |
| Bug | `fix/{N}-{slug}` | `fix/99-ws-reconnect` |
| Task | (no branch) | Commits on feature branch |

### Daily Work

```bash
gh issue list -l "status/wip"              # What's in progress
gh issue edit N --add-label "status/wip"   # Claim task
# ... work ...
git commit -m "feat: X\n\nImplements #N"   # Task commit
gh pr create --body "Closes #Feature"      # Feature PR
```

### Spec-Kit Commands

| Command | Function |
|---------|----------|
| `/speckit.specify` | Create spec from description |
| `/speckit.clarify` | Refine spec (max 5 questions) |
| `/speckit.plan` | Technical implementation plan |
| `/speckit.tasks` | Generate task list |
| `/speckit.taskstoissues` | Create GitHub issues from tasks |

---

## Project Context

### Architecture

```
Canoe123.exe → c123-server → c123-live-mini-server → c123-live-mini-page
   (TCP/XML)     (local)         (cloud/API)           (SPA/React)
```

### Tech Stack

| Component | Technology |
|-----------|------------|
| Monorepo | npm workspaces |
| Backend | Node.js, TypeScript, Fastify |
| Database | SQLite + Kysely (Repository Pattern) |
| Frontend | React + Vite |
| Design System | rvp-design-system (public) |
| Deployment | Docker (Railway/Fly.io) |

### Related Projects

- `../c123-protocol-docs` - C123 protocol documentation (XML, TCP)
- `../c123-server` - Local timing server, admin client
- `rvp-design-system` - Design system for public apps

### Conventions

- **Language:** Code and commits in English
- **Communication:** Czech or English
- **API:** Headless, JSON-based
- **Admin:** Via c123-server UI (not in this project)
