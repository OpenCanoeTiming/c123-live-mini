# DEVLOG

Append-only record of dead ends, surprising problems, and their solutions.

## 2026-04-10 — Railway deploy rolldown rabbit hole (#117, PR #127)

**Problem:** First Railway staging deploy under #117 failed on the client build step with:
```
You are using Node.js 20.18.1. Vite requires Node.js version 20.19+ or 22.12+.
failed to load config from /app/packages/client/vite.config.ts
Error: Cannot find native binding. npm has a bug related to optional dependencies
  (https://github.com/npm/cli/issues/4828).
  at ...node_modules/rolldown/dist/shared/binding-s-V_wTpj.mjs:507:36
  at async loadConfigFromBundledFile (.../vite/dist/node/chunks/config.js:36128:12)
```
Six deploys in a row failed with the same or adjacent errors. Local `npm run build` and GitHub Actions CI (linux-x64, Node 20.20.x) both ran clean.

**Attempted (in order — all wrong or insufficient):**
1. Pin `engines.node: ^20.19.0` in root package.json (PR #124). Nixpacks still gave Node 20.18.1 because its Nix channel didn't have 20.19+ yet. `engines` is an npm `npm install` check, not a Nixpacks Node resolver hint.
2. Downgrade client to `vite@^7.3.2 + @vitejs/plugin-react@^5.2.0` (PR #125). Still failed at same rolldown binding error because vite 7.3.x itself pulls in rolldown for config bundling.
3. Re-pin to `vite@~7.1.9` (the last pre-rolldown-bundler release in the 7.x line) and split `vite.config.ts` from a new dedicated `vitest.config.ts` so the client's vite config file would never transitively import vitest (PR #126). Local build and CI green, **Railway still failed** with identical rolldown error.
4. Set Railway env var `NIXPACKS_NODE_VERSION=22` → Nixpacks gave Node 22.11 (< Vite required 22.12). Same error.
5. Set Railway env var `NPM_CONFIG_INCLUDE=optional` to try to work around npm#4828 directly. **Did not help** (still worth investigating separately — either the flag didn't take effect in Nixpacks' Docker build layer, or the bug has a second trigger besides optional-dep skipping).

**Breakthrough — local reproduction on linux-arm64:**
```bash
# simulate Railway's missing platform binding
mv node_modules/@rolldown/binding-linux-arm64-gnu{,.bak}
mv node_modules/@rolldown/binding-linux-arm64-musl{,.bak}
mv node_modules/rolldown{,.bak}
cd packages/client && npx vite build
```
Same failure as Railway. Crucial detail in the resulting stack trace:
```
Cannot find package 'rolldown' imported from
/workspace/.../node_modules/vite/dist/node/chunks/node.js
```
Note the path: `node_modules/vite` (**root**), not `packages/client/node_modules/vite`.

`npm ls vite` revealed the real topology:
```
├─┬ @c123-live-mini/client@0.0.1 -> ./packages/client
│ ├─┬ @vitejs/plugin-react@5.2.0
│ │ └── vite@8.0.8 deduped     ← plugin-react resolved to vite@8 at ROOT
│ └── vite@7.1.12               ← client's explicit dep, unused by plugins
└─┬ vitest@4.1.4
  ├─┬ @vitest/mocker@4.1.4
  │ └── vite@8.0.8 deduped
  └── vite@8.0.8                ← the "gravity well" that hoisted vite@8 to root
```

**Root cause:** `vitest@4.1.4` depends on `vite@8`, which npm hoisted to the root `node_modules`. When vite's config loader bundled `vite.config.ts` and Node.js resolved `import react from '@vitejs/plugin-react'`, the ESM resolver walked up and found the hoisted `@vitejs/plugin-react` at the root, whose `import 'vite'` then also resolved at the root — to `vite@8.0.8`, not to the `vite@7.1.12` one directory deeper in the client workspace. vite@8 direct-imports `rolldown`, whose platform-specific native binding was skipped by `npm ci` on Railway's linux-x64 builder per npm/cli#4828. Boom.

The key insight: **the vite version installed in `packages/client/node_modules/vite` was irrelevant** — nothing in the resolution chain ever reached that copy, because all the plugins that import 'vite' were hoisted to the root and resolved 'vite' at the root. Every fix targeting the client workspace vite version was fighting a shadow.

**Solution:** One line in root `package.json` (PR #127):
```json
"overrides": {
  "vite": "~7.1.9"
}
```
npm `overrides` at the root forces every `vite` in the dependency tree — including vitest's transitive copy — to resolve to the same version. After clean reinstall, `npm ls vite` shows a single deduplicated `vite@7.1.12` throughout, and `node_modules/rolldown/` no longer exists at all. Railway build + deploy succeeds in ~1:30, all smoke tests pass.

**Lessons:**
1. **`npm ls <pkg>` is the first diagnostic step** when a native binding is missing in a monorepo — not Node version, not platform flags, not build configs. The question is always *"how many copies of the parent package exist in the tree, and where?"* Version multiplicity first.
2. **Stack trace paths matter.** `node_modules/vite/...` (root) vs. `packages/client/node_modules/vite/...` (workspace) is a huge diagnostic signal for who's actually resolving what. Read the absolute path, don't assume.
3. **When a fix targeting workspace N crashes with the same error**, stop fighting workspace N and look at hoisting. Deploy 3 had no vite@8 in `packages/client/package.json` and still crashed — that was the signal to run `npm ls` earlier.
4. **Local reproduction beats guessing.** Renaming `node_modules/rolldown` locally gave the first stack trace that actually pointed at the root node_modules path. Two hours of log-staring couldn't produce that signal because the Railway logs truncated the resolver-walk context.
5. **npm#4828 is still a landmine in this project.** The `overrides` fix removes the one package that tripped it, not the bug itself. Any future transitive dep with platform-specific optional native bindings (sharp, bcrypt, canvas, …) can reproduce the same class of failure. Regression guard added to CI: fail if `node_modules/rolldown/` re-appears after install or if `npm ls vite` reports more than one resolved version.
6. **`engines.node` is an npm install check, not a Nixpacks resolver directive.** Pinning it does not force Nixpacks to use that version — Nixpacks picks Node from its Nix channel regardless. For Nixpacks, use `NIXPACKS_NODE_VERSION` env var or a `nixpacks.toml` config, and know that it still picks from the cached channel.
7. **Second opinions paid off.** The external review pointed out the diagnostic playbook (`npm ls` first) and flagged that `NPM_CONFIG_INCLUDE=optional` not helping was a separate unanswered question — worth investigating if we see npm#4828 again.

## 2026-04-13 — BR run detail mapping: detail.* = run 2, not better run (#143)

**Problem:** Run detail panel showed swapped time/penalty for BR races (e.g. Novák Matyáš had 1st run showing 2nd run data).
**Attempted:** Original code assumed `detail.*` = better run, `detail.prev*` = worse run, then remapped by `betterRunNr`.
**Solution:** Server convention is `detail.*` = run 2 (latest), `detail.prev*` = run 1 (first), always. `betterRunNr` only indicates which run number is better. Confirmed by checking `BrRunsCell` in ResultList which uses `row.prevTotal` for run 1, `row.total` for run 2.
**Lesson:** Don't assume "primary" = "better". Check how existing table code maps the same data — `BrRunsCell` was the reference implementation.

**Follow-up:** The server `BrCombinedService.ts` actually used TWO conventions in the same response object — time fields chronological, gate fields by quality. Root cause was in server, not client. Fixed by unifying server to single chronological convention (detail.* = BR2, prev* = BR1), removed client workaround.
