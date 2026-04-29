# Operations Runbook

Quick-reference operations guide for running c123-live-mini on Railway. Read this first when you come back to the project after a break, or when something is broken in production.

For deep architecture see [ARCHITECTURE.md](ARCHITECTURE.md). For historical debugging stories see [../DEVLOG.md](../DEVLOG.md).

---

## Environments

| Environment | Branch watched | URL | Railway env name | Status |
|---|---|---|---|---|
| **staging** | `staging` | https://c123-live-mini-staging.up.railway.app | `staging` | ✅ live |
| **production** | `production` | https://c123-live-mini.up.railway.app | `production` | ✅ live |

**Auto-deploy flow:** push to `staging` → GitHub Actions CI runs `npm ci && npm run build && npm test` → on green, Railway auto-deploys staging. `main` is the clean PR-merged trunk and does **not** trigger any deploy. Production deploys from the `production` branch only. Standard promotion path: feature branch → PR → `main` → fast-forward to `production` (release PR or direct ff). Use `staging` freely for WIP / experimental deploys; nothing on `staging` is considered authoritative — it can be force-pushed or reset at any time.

Railway has **Wait for CI = ON** on both environments, so a failed CI check blocks the deploy.

**Serverless sleep:** enabled. After ~10 min of no traffic, the container sleeps. First request after sleep has cold-start latency ~5–10 s (Nixpacks wake + Node boot + SQLite open). During a live race this is a non-issue because traffic is continuous.

---

## Smoke test checklist

Copy-paste to verify staging after any deploy:

```bash
URL="https://c123-live-mini-staging.up.railway.app"

# 1. Health
curl -sS -w "\nHTTP %{http_code}\n" "$URL/health"
# expect: {"status":"ok"} + HTTP 200

# 2. SPA shell (browser-like)
curl -sS -H 'Accept: text/html' -I "$URL/" | grep -iE "HTTP|cache-control|content-type"
# expect: HTTP 200, content-type text/html, cache-control: no-store, max-age=0

# 3. SPA client-side route fallback
curl -sS -H 'Accept: text/html' -I "$URL/events/live-mini" | grep -i "HTTP"
# expect: HTTP 200

# 4. API list
curl -sS -w "\nHTTP %{http_code}\n" "$URL/api/v1/events"
# expect: JSON events array + HTTP 200

# 5. Unknown API route → JSON 404
curl -sS -w "\nHTTP %{http_code}\n" "$URL/api/v1/nonexistent"
# expect: {"error":"Not found",...} + HTTP 404

# 6. Stale asset fallback guard (regression test for #121 review)
curl -sS -H 'Accept: */*' -w "\nHTTP %{http_code}\n" "$URL/assets/index-STALE123.js"
# expect: JSON 404, NOT HTML

# 7. Admin auth enforcement
curl -sS -X POST -H "Content-Type: application/json" \
  -d '{"eventId":"test","mainTitle":"Test"}' \
  -w "\nHTTP %{http_code}\n" "$URL/api/v1/admin/events"
# expect: 401 Unauthorized (no X-Master-Key header)
```

---

## Railway access & secrets

### Where the Railway project token lives

The Railway project token is **scoped per-project** (staging only) with full read/write access. Treat it like a password — do **not** commit it.

Persistence on your dev machine (RPi5):

| Location | What for | Managed by |
|---|---|---|
| `~/.bashrc` — `export RAILWAY_TOKEN=...` | Auto-exported in every interactive shell, so `railway` CLI and any ad-hoc `curl` to Railway GraphQL API just work. | Manually edited (see below) |
| `~/.config/c123-live-mini/railway.env` | Standalone backup file with metadata — project ID, service ID, environment IDs — in one place. Can be sourced with `source ~/.config/c123-live-mini/railway.env`. | Manually maintained |
| A password manager entry (recommended) | Long-term recovery source of truth. | You, manually |

### Regenerating the token (if lost or compromised)

1. https://railway.app/ → project `skvs-live-mini` → **Project Settings** (gear icon)
2. **Tokens** tab → **Create Token** → scope: **Project**, environment: **staging** (or Shared) → copy
3. Revoke any old token from the same page
4. Update `~/.bashrc` and `~/.config/c123-live-mini/railway.env` with the new value
5. Open a new shell (or `source ~/.bashrc`)

### Where the GitHub Packages token lives

Separate token, used at build time to pull `@czechcanoe/rvp-design-system`. Scope: `read:packages`. Stored in:

- `~/.bashrc` → `export NODE_AUTH_TOKEN=...` (for local `npm install`)
- **GitHub Actions repo secret** `NODE_AUTH_TOKEN` (for CI)
- **Railway project variable** `NODE_AUTH_TOKEN` (for Nixpacks build phase)

Project-committed `.npmrc` uses `${NODE_AUTH_TOKEN}` variable expansion, so the token must be in the environment when `npm install` / `npm ci` runs.

---

## Runtime operations

All three paths below work from this box (token already exported in `~/.bashrc`).

### Quick reference: which tool to reach for

| You want to… | Prefer | Fallback |
|---|---|---|
| List deployments / read logs / read or set env vars / redeploy | **Railway MCP** (if invoked from Claude Code) | `railway` CLI |
| One-off script or cron | `railway` CLI | Raw GraphQL curl |
| Anything not exposed by MCP or CLI (rare) | Raw GraphQL curl | — |

**For Claude Code sessions:** the Railway MCP server is wired up via committed `.mcp.json` (uses `@railway/mcp-server` over stdio, `npx -y`). Reach for MCP tools **first** — they're faster, type-safe, and don't require memorizing project/service/env IDs. Only fall back to `railway` CLI when the MCP tool doesn't exist (e.g. `railway ssh`).

### Railway CLI & MCP setup

Both share one auth state — run **`railway login --browserless`** once per machine. After that:

- `railway status` — confirm linked project/env
- `railway link` — interactively pick project + env (typically `staging`)
- `railway environment <name>` — switch the linked env (e.g. to debug production); MCP tools accept `environment` as an arg so you rarely need this
- `railway whoami` — check auth

Both tools read `~/.config/railway/` for the session. The `RAILWAY_TOKEN` env var in `~/.bashrc` is a **project-scoped token** used by raw GraphQL calls; it is **independent** of `railway login`. Either path works — MCP uses the login session, raw curl uses the token.

### Common MCP tool calls (from Claude Code)

| Tool | What it does | Key args |
|---|---|---|
| `mcp__Railway__check-railway-status` | Verify CLI installed + logged in | — |
| `mcp__Railway__list-services` | List services in linked project | `workspacePath` |
| `mcp__Railway__list-deployments` | Recent deployments + statuses (SUCCESS/SLEEPING/FAILED/REMOVED) | `workspacePath`, `environment`, `service`, `limit`, `json` |
| `mcp__Railway__list-variables` | Env vars for an env (values **not** redacted — do not paste output verbatim into chat) | `workspacePath`, `environment`, `service` |
| `mcp__Railway__set-variables` | Upsert env vars | `workspacePath`, `environment`, `service`, `variables` |
| `mcp__Railway__get-logs` | Build or deploy logs; supports `filter` and `lines` on CLI ≥ 4.9 | `workspacePath`, `logType` (`build`\|`deploy`), `environment`, `service`, `lines`, `filter`, `json` |
| `mcp__Railway__deploy` / redeploy | Trigger a deploy | `workspacePath`, `environment`, `service` |
| `mcp__Railway__list-variables` + `mcp__Railway__set-variables` | Read-modify-write env config without touching dashboard | — |

`workspacePath` is always the project root (`/workspace/timing/c123-live-mini` on the RPi5). `environment` defaults to whatever `railway link` points at — pass it explicitly (`staging` or `production`) for clarity.

**Gotchas:**
- `list-variables` prints plaintext secrets (`MASTER_PASSWORDS`, `NODE_AUTH_TOKEN`). Do not paste its raw output anywhere public — summarize instead.
- MCP tools run the underlying `railway` CLI, so CLI version matters (`lines`/`filter` need CLI ≥ 4.9).
- The `sleepApplication` flag in deployment metadata tells you if Serverless sleep is on; status `SLEEPING` means the container is currently asleep.

### Fetching runtime logs

**Via Railway Dashboard** — Project → service `c123-live-mini` → Deployments → click active deployment → View Logs panel. Real-time streaming, filter by severity, timestamp scroll.

**Via Railway CLI (`railway ssh`)** — interactive:
```bash
railway ssh --service c123-live-mini --environment staging
# you're now inside the container
```

**Via GraphQL API (for scripting / ad-hoc queries)** — wrapper one-liner with the env IDs:
```bash
DEP_ID=$(curl -sS -X POST https://backboard.railway.com/graphql/v2 \
  -H "Project-Access-Token: $RAILWAY_TOKEN" -H "Content-Type: application/json" \
  -d '{"query":"query { deployments(first: 10, input: { projectId: \"97408870-7b9e-4aa5-b3b1-5b546e4d1f34\", environmentId: \"b1c8ea80-c260-4819-bc9e-54de1a27fd62\", serviceId: \"aadf519a-48b5-4da9-9259-21b9178a2619\" }) { edges { node { id status } } } }"}' \
  | python3 -c "import json,sys; d=json.load(sys.stdin); [print(e['node']['id']) or exit() for e in d['data']['deployments']['edges'] if e['node']['status']=='SUCCESS']")

curl -sS -X POST https://backboard.railway.com/graphql/v2 \
  -H "Project-Access-Token: $RAILWAY_TOKEN" -H "Content-Type: application/json" \
  -d "{\"query\":\"query { deploymentLogs(deploymentId: \\\"$DEP_ID\\\", limit: 50) { message severity timestamp } }\"}" \
  | python3 -c "import json,sys,d=json.load(sys.stdin); [print(l['timestamp'][:19], l.get('severity','info')[:4], l['message'].rstrip()) for l in d['data']['deploymentLogs']]"
```

For build-time logs (Nixpacks build output), use `buildLogs(deploymentId:...)` instead of `deploymentLogs`.

### Inspecting the `/data` volume (SQLite DB)

Volume is mounted at `/data`. Single file `live-mini.db`.

**Size and file listing:**
```bash
railway ssh --service c123-live-mini --environment staging -- 'du -sh /data && ls -lah /data/'
```

**SQLite schema / row counts / per-table disk usage** via better-sqlite3 in the container (sqlite3 CLI is not installed in the Nixpacks image):
```bash
SCRIPT=$(cat <<'EOF'
const db = require('better-sqlite3')('/data/live-mini.db', { readonly: true });
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
console.log('=== Tables ===');
let total = 0;
for (const t of tables) {
  const c = db.prepare(`SELECT COUNT(*) AS c FROM "${t.name}"`).get().c;
  total += c;
  console.log(t.name.padEnd(30), String(c).padStart(8), 'rows');
}
console.log('Total rows:', total);
// Per-table disk usage via dbstat vtab
const rows = db.prepare("SELECT name, SUM(payload) AS b FROM dbstat WHERE name IN (SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%') GROUP BY name ORDER BY b DESC").all();
console.log('=== Per-table disk bytes ===');
for (const r of rows) console.log(r.name.padEnd(30), String(Math.round(r.b/1024)).padStart(6), 'KB');
db.close();
EOF
)
B64=$(echo "$SCRIPT" | base64 -w0)
railway ssh --service c123-live-mini --environment staging -- "cd /app && echo $B64 | base64 -d | node"
```

Why base64: it avoids quote-escaping hell when passing a multiline JS snippet through two shell layers (local shell → Railway SSH → container shell).

### Forcing a redeploy

From CLI:
```bash
railway redeploy --service c123-live-mini --environment staging --yes
```

Or via GraphQL mutation (bypasses CLI quirks with project-token service resolution):
```bash
curl -sS -X POST https://backboard.railway.com/graphql/v2 \
  -H "Project-Access-Token: $RAILWAY_TOKEN" -H "Content-Type: application/json" \
  -d '{"query":"mutation { serviceInstanceDeployV2(serviceId: \"aadf519a-48b5-4da9-9259-21b9178a2619\", environmentId: \"b1c8ea80-c260-4819-bc9e-54de1a27fd62\") }"}'
```

Or the lazy way: push an empty commit to `main` (`git commit --allow-empty -m "chore: trigger redeploy" && git push`) — Railway picks it up automatically.

### Inspecting / updating env vars

List (values of tokens/passwords are real but not redacted by the API — review output carefully before pasting anywhere):
```bash
curl -sS -X POST https://backboard.railway.com/graphql/v2 \
  -H "Project-Access-Token: $RAILWAY_TOKEN" -H "Content-Type: application/json" \
  -d '{"query":"query { variables(projectId: \"97408870-7b9e-4aa5-b3b1-5b546e4d1f34\", environmentId: \"b1c8ea80-c260-4819-bc9e-54de1a27fd62\", serviceId: \"aadf519a-48b5-4da9-9259-21b9178a2619\") }"}' \
  | python3 -c "import json,sys; d=json.load(sys.stdin)['data']['variables']; [print(k,'=', ('<REDACTED>' if any(s in k.upper() for s in ['TOKEN','PASSWORD','KEY','SECRET','AUTH']) else v)) for k,v in sorted(d.items())]"
```

Set / update a variable:
```bash
NAME=MY_VAR VALUE=hello
curl -sS -X POST https://backboard.railway.com/graphql/v2 \
  -H "Project-Access-Token: $RAILWAY_TOKEN" -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { variableUpsert(input: { projectId: \\\"97408870-7b9e-4aa5-b3b1-5b546e4d1f34\\\", environmentId: \\\"b1c8ea80-c260-4819-bc9e-54de1a27fd62\\\", serviceId: \\\"aadf519a-48b5-4da9-9259-21b9178a2619\\\", name: \\\"$NAME\\\", value: \\\"$VALUE\\\" }) }\"}"
```

Delete:
```bash
curl -sS -X POST https://backboard.railway.com/graphql/v2 \
  -H "Project-Access-Token: $RAILWAY_TOKEN" -H "Content-Type: application/json" \
  -d '{"query":"mutation { variableDelete(input: { projectId: \"97408870-7b9e-4aa5-b3b1-5b546e4d1f34\", environmentId: \"b1c8ea80-c260-4819-bc9e-54de1a27fd62\", serviceId: \"aadf519a-48b5-4da9-9259-21b9178a2619\", name: \"MY_VAR\" }) }"}'
```

---

## Railway IDs

Useful for scripting — these are not secret:

| What | Value |
|---|---|
| Project name | `skvs-live-mini` |
| Project ID | `97408870-7b9e-4aa5-b3b1-5b546e4d1f34` |
| Service name | `c123-live-mini` |
| Service ID | `aadf519a-48b5-4da9-9259-21b9178a2619` |

| Env | Env ID | Branch | Volume mount | Public domain |
|---|---|---|---|---|
| `staging` | `b1c8ea80-c260-4819-bc9e-54de1a27fd62` | `main` | `/data` | `c123-live-mini-staging.up.railway.app` |
| `production` | `67189b9a-82ce-435f-931b-525053f50e36` | `production` | `/data` | `c123-live-mini.up.railway.app` |

Both environments have **separate `MASTER_PASSWORDS`** and **separate `/data` volumes** (verified — staging volume `c123-live-mini-volume`, production volume `c123-live-mini-volume-prod`, no shared volume instances).

Project tokens: each environment has its own scoped Project Access Token, both stored in `~/.config/c123-live-mini/railway.env` as `RAILWAY_TOKEN` (staging) and `RAILWAY_PROD_TOKEN` (production). To target production with a GraphQL call, replace the staging token in the `Project-Access-Token` header with the production one and the staging env ID with `RAILWAY_PROD_ENV_ID`.

---

## Environment variables currently set on Railway

Both staging and production share the same set; values differ only for `MASTER_PASSWORDS`.

| Variable | Purpose | Source |
|---|---|---|
| `NODE_ENV=production` | Activates SPA serving + admin safety check | Manual |
| `DATABASE_PATH=/data/live-mini.db` | SQLite on mounted volume | Manual |
| `MASTER_PASSWORDS=<strong-password>` | Admin API auth, required in prod. **Different value per environment.** | Manual (generated with `openssl rand -base64 24`) |
| `NODE_AUTH_TOKEN=<GH PAT>` | Build-phase GitHub Packages auth for `@czechcanoe/rvp-design-system`. Same value across environments. | Manual |
| `NPM_CONFIG_INCLUDE=dev,optional` | Forces `npm ci` to install devDependencies (TypeScript, Vite, etc.) during the Nixpacks build phase even with `NODE_ENV=production`. Required since Railway's V3 build environment (rolled out 2026-04-29) strictly honours NODE_ENV during install. | Manual |
| `LOG_LEVEL=info` | Fastify logger level | Manual |
| `RAILWAY_*` | Service metadata (private domain, volume mount, etc.) | Railway-injected, read-only |

Note: `NIXPACKS_NODE_VERSION` was tried during the Railway debugging session and **removed** — the vite override fix made it unnecessary. `NPM_CONFIG_INCLUDE=dev,optional` was added back on 2026-04-29 after Railway rolled the build environment onto V3, which strictly honours `NODE_ENV=production` during `npm ci` and skips devDependencies (including TypeScript). See DEVLOG 2026-04-10 (rolldown bundler) and 2026-04-29 (V3 buildEnvironment / devDeps).

### Build-time client branding (`VITE_*`)

These variables are read by Vite **during the Nixpacks build phase** (`vite build` step) and baked into the JS bundle. Changing a value requires a **redeploy** for the SPA to pick it up — they are NOT runtime config. All have safe defaults baked into the source so unsetting them reproduces the original ČSK Live deployment exactly.

| Variable | Default | What it controls |
|---|---|---|
| `VITE_APP_NAME` | `ČSK Live` | Header title (satellite breadcrumb) |
| `VITE_APP_SUBTITLE` | `Živé výsledky kanoistického slalomu` | Homepage hero title |
| `VITE_APP_SUBTITLE_ACCENT` | `kanoistického slalomu` | Substring of the subtitle rendered in the hero accent colour (light blue on the dv section). Must literally appear inside `VITE_APP_SUBTITLE`; otherwise the hero shows the full title in one colour. Set to a non-substring value to effectively disable the accent. |
| `VITE_HOME_LINK` | `https://kanoe.cz` | Satellite header back-link URL |
| `VITE_HOME_LINK_LABEL` | `Zpět na kanoe.cz` | Satellite header back-link text |

To change branding for an environment:

1. Edit the variable in Railway dashboard (Project → service → Variables → select environment).
2. Trigger a redeploy (`railway redeploy --service c123-live-mini --environment <env>` or push an empty commit; see "Forcing a redeploy" above).
3. Verify the new value at the public URL.

Local-dev override: copy `packages/client/.env.example` → `packages/client/.env.local` and edit, or pass inline like `VITE_APP_NAME="Foo" npx vite`.

---

## First-time bootstrap (after a fresh Railway deploy or DB reset)

The server refuses to start without `MASTER_PASSWORDS` in `NODE_ENV=production`, so the password must be set **before** first deploy. To create the first event once the service is live:

```bash
URL="https://c123-live-mini-staging.up.railway.app"
MK="<your master password>"

curl -X POST "$URL/api/v1/admin/events" \
  -H 'Content-Type: application/json' \
  -H "X-Master-Key: $MK" \
  -d '{"eventId":"bootstrap","mainTitle":"Bootstrap event"}'
# response contains the `apiKey` used by c123-server to POST ingest data
```

Save the returned `apiKey` — it's how c123-server authenticates its data pushes.

---

## Troubleshooting

### Deploy failing in CI / Railway build with rolldown / native binding error

Check `node_modules/rolldown/` was not re-introduced. The CI regression guard in `.github/workflows/ci.yml` should catch this automatically, but if you hit it locally:
- Look at `package.json` root `overrides.vite` — it should still pin `~7.1.9`
- `npm ls vite` should report exactly one resolved version

Full story: [DEVLOG 2026-04-10](../DEVLOG.md).

### Deploy showing as FAILED in Railway but no obvious error in the log

Pull the full build log via GraphQL (the Dashboard sometimes truncates):
```bash
railway logs --deployment <id>
# or via GraphQL buildLogs query (see "Fetching runtime logs" above)
```

If the build phase is clean and healthcheck times out, the server is probably crashing at start. Check runtime logs:
```bash
# Latest failed deployment ID from GraphQL
curl -sS -X POST https://backboard.railway.com/graphql/v2 \
  -H "Project-Access-Token: $RAILWAY_TOKEN" -H "Content-Type: application/json" \
  -d '{"query":"query { deployments(first: 3, input: { projectId: \"97408870-7b9e-4aa5-b3b1-5b546e4d1f34\", environmentId: \"b1c8ea80-c260-4819-bc9e-54de1a27fd62\", serviceId: \"aadf519a-48b5-4da9-9259-21b9178a2619\" }) { edges { node { id status createdAt } } } }"}' \
  | python3 -m json.tool
```

Most common crashes:
- `[FATAL] NODE_ENV=production requires MASTER_PASSWORDS` → env var missing / misspelled
- `EACCES /data/...` → volume not mounted or misconfigured
- `ENOENT packages/client/dist/...` → build didn't produce SPA assets (typically a vite error upstream in the same deploy)

### Service not waking up after Serverless sleep

The first request after sleep takes 5–10 s. If you need to force a wake (e.g. before a race), just hit `/health` once and ignore the result.

### Volume near the Free plan limit (500 MB)

Unlikely for the foreseeable future — see DEVLOG 2026-04-10 estimates (~60 days of continuous racing to fill it). But if it happens:
- The `results` table dominates (~95 %) — archiving old events (move `results`/`races` rows out) would reclaim most of it
- `ingest_records` is small (metadata only, no payloads) — no meaningful savings there
- A SQL `VACUUM` on the live DB will compact freelist pages, but note it locks the DB briefly

### GitHub Actions CI failing with 401 on `npm ci`

`NODE_AUTH_TOKEN` repo secret is missing, expired, or not SSO-authorized for the `CzechCanoe` organization. See [.npmrc.example](../.npmrc.example) for setup.

---

## Links

- Issue: [#117 Deployment configuration](https://github.com/OpenCanoeTiming/c123-live-mini/issues/117)
- Architecture: [ARCHITECTURE.md § Production Deployment Model](ARCHITECTURE.md#production-deployment-model)
- Post-mortem: [DEVLOG 2026-04-10](../DEVLOG.md)
- Railway docs: https://docs.railway.com/
- Railway status: https://status.railway.com/
