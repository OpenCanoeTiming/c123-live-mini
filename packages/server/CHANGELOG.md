# Changelog

## [0.10.1](https://github.com/OpenCanoeTiming/c123-live-mini/compare/v0.10.0...v0.10.1) (2026-04-29)


### Bug Fixes

* **server:** sanitise C123 TCP best-run pollution in BR2 results ([#181](https://github.com/OpenCanoeTiming/c123-live-mini/issues/181)) ([d5630da](https://github.com/OpenCanoeTiming/c123-live-mini/commit/d5630da3e58b17b2ef05fb105085bfdd32c7c1b9))

## [0.10.0](https://github.com/OpenCanoeTiming/c123-live-mini/compare/v0.9.2...v0.10.0) (2026-04-22)


### Features

* admin auth, event ID decoupling, event image ([#95](https://github.com/OpenCanoeTiming/c123-live-mini/issues/95)) ([4345ab2](https://github.com/OpenCanoeTiming/c123-live-mini/commit/4345ab2d9cc9c62927633b9003efce2ba9ac534c))
* Client API - Public Results Interface ([#6](https://github.com/OpenCanoeTiming/c123-live-mini/issues/6)) ([#58](https://github.com/OpenCanoeTiming/c123-live-mini/issues/58)) ([6d242e4](https://github.com/OpenCanoeTiming/c123-live-mini/commit/6d242e429d61cc874c059fed6139ed0581a44a66))
* Database Layer - seed script and data model documentation ([#53](https://github.com/OpenCanoeTiming/c123-live-mini/issues/53)) ([b47c3a4](https://github.com/OpenCanoeTiming/c123-live-mini/commit/b47c3a42e03d6a61b03e76a6cd617f575605aa31))
* Event Lifecycle State Machine ([#8](https://github.com/OpenCanoeTiming/c123-live-mini/issues/8)) ([#69](https://github.com/OpenCanoeTiming/c123-live-mini/issues/69)) ([03c7af4](https://github.com/OpenCanoeTiming/c123-live-mini/commit/03c7af49e8e5cc815c98c4a188f04e8f939c7d83))
* Ingest API with validity window, config endpoint, and audit logging ([#54](https://github.com/OpenCanoeTiming/c123-live-mini/issues/54)) ([4c5bc3b](https://github.com/OpenCanoeTiming/c123-live-mini/commit/4c5bc3b2eb9af7495b9b211eac5f74f7e226d7af))
* iteration 2 — UI/UX polish, search, schedule, HeroSection, animations ([8750ca7](https://github.com/OpenCanoeTiming/c123-live-mini/commit/8750ca7bbce983377fedfa29004c887a6c8b3eb3))
* monorepo setup with npm workspaces ([#49](https://github.com/OpenCanoeTiming/c123-live-mini/issues/49)) ([288359b](https://github.com/OpenCanoeTiming/c123-live-mini/commit/288359b5131fb431c95295bba1d3d52e7d1ef0b1))
* Protocol Analysis & Data Model ([#50](https://github.com/OpenCanoeTiming/c123-live-mini/issues/50)) ([903cec8](https://github.com/OpenCanoeTiming/c123-live-mini/commit/903cec8ba13adf7efd5f769f8eb60d6e3d996c76)), closes [#2](https://github.com/OpenCanoeTiming/c123-live-mini/issues/2)
* Railway deployment (Nixpacks, single-origin, staging+prod) ([#121](https://github.com/OpenCanoeTiming/c123-live-mini/issues/121)) ([2dea959](https://github.com/OpenCanoeTiming/c123-live-mini/commit/2dea959be76324fbbfcdb0665779b9410ee16579))
* Technical PoC - E2E validation of tech stack ([#52](https://github.com/OpenCanoeTiming/c123-live-mini/issues/52)) ([6f7cf05](https://github.com/OpenCanoeTiming/c123-live-mini/commit/6f7cf05cd5e013de4baf0b107c5a6e40d1da9cdb))
* WebSocket Live Data Pipeline ([#9](https://github.com/OpenCanoeTiming/c123-live-mini/issues/9)) ([#70](https://github.com/OpenCanoeTiming/c123-live-mini/issues/70)) ([5204e12](https://github.com/OpenCanoeTiming/c123-live-mini/commit/5204e1251a15b298c2145929dbcdfd983225de50))


### Bug Fixes

* BR race run details missing ([#87](https://github.com/OpenCanoeTiming/c123-live-mini/issues/87)) ([#98](https://github.com/OpenCanoeTiming/c123-live-mini/issues/98)) ([fd238d7](https://github.com/OpenCanoeTiming/c123-live-mini/commit/fd238d702b70ccccac65e148b4d954abbeba62d6))
* compute prev_ fields from actual BR1 data in multi-run response ([bebed88](https://github.com/OpenCanoeTiming/c123-live-mini/commit/bebed88e5f5ff1f45ae6c82a02642b4549921042))
* data flow audit - ranking recalc, BR details, time detection, stale data ([a582241](https://github.com/OpenCanoeTiming/c123-live-mini/commit/a5822419ef751244c8f1a0b7403a6511ee8e5c1d))
* ensure data directory exists before opening SQLite database ([70d9178](https://github.com/OpenCanoeTiming/c123-live-mini/commit/70d917889bd7035d66923b39c2d67d478c711c55))
* expire oncourse panel after 10s of no feed updates ([3b6b1fa](https://github.com/OpenCanoeTiming/c123-live-mini/commit/3b6b1fa99b7a9f2427822dba5c3cf7a30990f971))
* keep finished riders visible in oncourse until TTL expires ([28a91dd](https://github.com/OpenCanoeTiming/c123-live-mini/commit/28a91dd24a558ce5c8e41a7502f297867152d0d5))
* move BR race live update fix to client-side targeted re-fetch ([68cab14](https://github.com/OpenCanoeTiming/c123-live-mini/commit/68cab1410fb615d0c33c0a9f742f41b81ef9335b))
* normalize empty string status to null in results ([46c8aca](https://github.com/OpenCanoeTiming/c123-live-mini/commit/46c8aca959f331c132e94dd2d432d5373cfe94fa))
* oncourse panel not clearing when riders removed or feed stopped ([efa3024](https://github.com/OpenCanoeTiming/c123-live-mini/commit/efa30248d0062882815f8fda8749119fc2f6c16d))
* oncourse per-entry TTL expiration instead of clear-on-each-POST ([4593ced](https://github.com/OpenCanoeTiming/c123-live-mini/commit/4593ced2328eb36b1d665423ec50bab34fdcabf1))
* recalculate rnk from sorted position in two-run races ([11d7920](https://github.com/OpenCanoeTiming/c123-live-mini/commit/11d79203cd9c5164c76b0f4a2c05cfde012cff11))
* recalculate totalBehind from totalTotal in two-run races ([ef7a3bb](https://github.com/OpenCanoeTiming/c123-live-mini/commit/ef7a3bb42a7fa236e7f7ab09d6b0245663167d67))
* remove accidental playwright prod dep, use regex for BR race ID derivation ([fa99875](https://github.com/OpenCanoeTiming/c123-live-mini/commit/fa99875bb522bd02f287bee0bf4621aa65a5e954))
* replace FileMigrationProvider with static imports to fix Windows ESM path issue ([1eca629](https://github.com/OpenCanoeTiming/c123-live-mini/commit/1eca629e2e48ce0564ceb98628f7914e61db524e))
* resolve 5 live results data processing bugs ([4a5cf4e](https://github.com/OpenCanoeTiming/c123-live-mini/commit/4a5cf4e10eee5a9cf83c91d6d4cfaecd581e6b86))
* resolve results not displaying in client UI ([9ded48b](https://github.com/OpenCanoeTiming/c123-live-mini/commit/9ded48b0ac7a73a63cfe0fba0c95ad0e2b0ad687))
* resolve TypeScript build errors blocking production build ([4ce522d](https://github.com/OpenCanoeTiming/c123-live-mini/commit/4ce522d56e7740947958d4d2f2554b45cf747143))
* resolve WebSocket live updates not working end-to-end ([99540a6](https://github.com/OpenCanoeTiming/c123-live-mini/commit/99540a6d81bd25647af56717346a215f6cd94ecd))
* route BR result to correct run column when only one run exists ([#170](https://github.com/OpenCanoeTiming/c123-live-mini/issues/170)) ([ec2cc2a](https://github.com/OpenCanoeTiming/c123-live-mini/commit/ec2cc2a77feae794f69bb3b0a3a589f52d76e029)), closes [#155](https://github.com/OpenCanoeTiming/c123-live-mini/issues/155)
* **server:** retag [#150](https://github.com/OpenCanoeTiming/c123-live-mini/issues/150)/[#157](https://github.com/OpenCanoeTiming/c123-live-mini/issues/157) fix chain so Release Please proposes a release ([#164](https://github.com/OpenCanoeTiming/c123-live-mini/issues/164)) ([6e60ae4](https://github.com/OpenCanoeTiming/c123-live-mini/commit/6e60ae4ad2f5db81dbc3ac52a6f72dc672d63f73))
* **server:** surface per-run DNF/DNS status in BR combined results ([#171](https://github.com/OpenCanoeTiming/c123-live-mini/issues/171)) ([aff6ad3](https://github.com/OpenCanoeTiming/c123-live-mini/commit/aff6ad3d67ada029a6e8ff41ba2ee739911ce2dd))
* unify BR data convention — gates now chronological like times ([#143](https://github.com/OpenCanoeTiming/c123-live-mini/issues/143)) ([0d780c8](https://github.com/OpenCanoeTiming/c123-live-mini/commit/0d780c834eca8074cf6462e77efcc75653d2820f))
* use broadcastRefresh for BR race TCP updates to prevent combined view corruption ([721006e](https://github.com/OpenCanoeTiming/c123-live-mini/commit/721006ebf3dee7557395f379aab80ac2f37b23ac))


### Performance Improvements

* add timing instrumentation to XML ingest ([260f115](https://github.com/OpenCanoeTiming/c123-live-mini/commit/260f11542e6a905c7d217cfcf569ee0c0ede038d))
* use request.log + stderr for ingest timing (Railway visibility) ([098fa5e](https://github.com/OpenCanoeTiming/c123-live-mini/commit/098fa5e2d75f4cb84ef03dfa4c5b47849b840066))
* wrap XML ingest in single SQLite transaction ([1a98e94](https://github.com/OpenCanoeTiming/c123-live-mini/commit/1a98e942635888d18dfd2de40920c5e4ea3337a2))

## [0.9.2](https://github.com/OpenCanoeTiming/c123-live-mini/compare/v0.9.1...v0.9.2) (2026-04-22)


### Bug Fixes

* route BR result to correct run column when only one run exists ([#170](https://github.com/OpenCanoeTiming/c123-live-mini/issues/170)) ([ec2cc2a](https://github.com/OpenCanoeTiming/c123-live-mini/commit/ec2cc2a77feae794f69bb3b0a3a589f52d76e029)), closes [#155](https://github.com/OpenCanoeTiming/c123-live-mini/issues/155)
* **server:** surface per-run DNF/DNS status in BR combined results ([#171](https://github.com/OpenCanoeTiming/c123-live-mini/issues/171)) ([aff6ad3](https://github.com/OpenCanoeTiming/c123-live-mini/commit/aff6ad3d67ada029a6e8ff41ba2ee739911ce2dd))

## [0.9.1](https://github.com/OpenCanoeTiming/c123-live-mini/compare/v0.9.0...v0.9.1) (2026-04-22)


### Bug Fixes

* **server:** retag [#150](https://github.com/OpenCanoeTiming/c123-live-mini/issues/150)/[#157](https://github.com/OpenCanoeTiming/c123-live-mini/issues/157) fix chain so Release Please proposes a release ([#164](https://github.com/OpenCanoeTiming/c123-live-mini/issues/164)) ([6e60ae4](https://github.com/OpenCanoeTiming/c123-live-mini/commit/6e60ae4ad2f5db81dbc3ac52a6f72dc672d63f73))
