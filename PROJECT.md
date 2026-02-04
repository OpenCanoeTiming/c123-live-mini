# Minimalistické řešení pro live výsledky na internetu z ekosystému C123

Příprava a vývoj řešení pro online live veřejnou prezentaci výsledků z c123 ekosystému časomíry pro kanoistické závody. Řešení bude složené z backend serveru s persistentním úložištěm a SPA FE klientem pro zobrazování live výsledků. Bude to zárodek komplexního inovovaného závodního informačního systému Českého zvazu kanoistů.

## Reference

### Dokumentace a data
- `../c123-protocol-docs` - dokumentace protokolů systému Canoe123 (XML formáty, TCP komunikace). Klíčové pro parsování dat.
- `../c123-server` - lokální server u časomíry, slouží pro předávání dat do veřejného systému a jako admin klient.

### Design systémy
Projekt využívá dva design systémy s různým účelem:

| Design System | Účel | Použití v projektu |
|--------------|------|-------------------|
| `rvp-design-system` | Public-facing aplikace ČSK | **live-mini-page** (veřejný frontend) |
| `timing-design-system` | Admin/interní timing nástroje | Admin UI v c123-server |

- **rvp-design-system:** https://github.com/CzechCanoe/rvp-design-system/ - povinný pro veřejné aplikace
- **timing-design-system:** https://github.com/OpenCanoeTiming/timing-design-system/ - pro interní nástroje

## Technický Stack & Konvence

Projekt je koncipován jako moderní, ale **štíhlá** webová aplikace s důrazem na přenositelnost a čistou architekturu.

- **Architektura:** Monorepo (npm workspaces). Obsahuje `server` i `client` v jednom repozitáři pro snadné sdílení typů a jednotný deployment.
- **Backend:** Node.js (TypeScript) + Fastify. Headless API design.
- **Databáze & Persistence:**
  - *Přístup:* Repository Pattern. Aplikační logika je odstíněna od konkrétní DB technologie.
  - *Nástroj:* **Kysely** (Type-safe SQL Query Builder). Poskytuje kontrolu nad SQL bez váhy velkých ORM.
  - *Úložiště:* **SQLite**. Jednoduchá správa, uloženo v souboru, ideální pro "mini" scénáře a snadný deployment.
- **Frontend:** React + Vite. Implementace RVP Design Systemu.
- **Deployment:** Railway (planned).

## Architektura a Realizace

`Canoe123.exe (TCP, UDP, XML)` --> `c123-server` --> `c123-live-mini-server` --> `c123-live-mini-page`

### 1. Role komponent
- **Canoe123:** Původní software časomíry (nezměněn).
- **c123-server:** Lokální server u časomíry. Slouží k **aktivní replikaci dat** z vnitřní sítě do veřejného internetu a **plní roli Admin klienta** pro live-mini-server (založení akce, konfigurace).
- **c123-live-mini-server:** Cloudový server. Přijímá data, ukládá je do SQLite a nabízí je přes WS/API klientům. Funguje v režimu **Headless API** (bez vlastního webového Admin UI).
- **c123-live-mini-page:** SPA klient (React) zobrazující data v zařízení uživatele. 

### 2. Administrace a Konfigurace
- Veškerá konfigurace (založení akce, mapování kategorií) mini-serveru probíhá vzdáleně přes API.
- Primárním rozhraním pro administraci je UI v `c123-server`.
- Mini-server vystavuje endpointy pro čtení/zápis konfigurace (JSON). To umožňuje operativní změny nastavení (např. výběr závodů z XML) i během běžícího závodu.

### 3. Ingest API (Příjem dat)
- Komunikace: `c123-server` -> HTTP POST (JSON Payload) -> `live-mini-server`.
- Transformace: Data jsou transformována a filtrována na vstupu `live-mini-serveru` dle aktuální konfigurace.

### 4. Autentizace
- **API Key per akce** - každá akce má unikátní klíč
- **Generování:** Klíč se vytvoří voláním Admin API po přihlášení časoměřiče
- **Platnost:** Několik dnů (typicky na dobu trvání akce)
- **Použití:** Klíč v hlavičce každého ingest requestu, odpadá nutnost opakované autentizace

## Požadavky na Funkcionalitu

### Zobrazení (Frontend)
- zaměřeno na vodní slalom (systém závodů, penalizací)
- zobrazení kompletní aktuální startovní listiny
- prezentace komplet průběžných výsledků - závod na lepší jízdu (BR1/BR2), závod na kvalifikaci+(semi)+finále, atd
- zjednodušené zobrazení výsledků (časy+pen, pořadí, VK) s možností přepnutí na podrobnější výsledky, tedy méně VS více sloupců, veřejnost versus insider
- zobrazení aktivních jezdců na trati
- zobrazení detailu jízdy (start a cíl čas, detailní penalizace na trati)
- možnost filtrování výsledků dle věkových kategorií, zobrazení pořadí i v rámci věkové kategorie
- dynamický přístup ke kategoriím (kategorie se odvodí z nastavení závodu, nejsou předem dané)
- BONUS: online počítání bodů dle českého bodovacího systému
- BONUS: možnost "ohvězdičkovat" vybrané závodníky (notifikace)
- jazykové varianty: přinejmenším CZ, EN

### Backend a Logika
- systém pracuje s konceptem "akce" = jeden kompletní závod. V českém systému to je např. závod který má jedno číslo.
- flexibilita vůči struktuře dat z Canoe123 (jedno XML per akce/den, nebo více závodů v jednom souboru).
- životní cyklus akce: založená, připravená startovka, běžící závod, kompletní výsledky, potvrzené finální (ne-live) výsledky.
- systém veřejně publikuje jen nezbytná data, zamezí těžení plných autentických dat.

### Provoz a Bezpečnost
- systém musí umožnit přiměřeně komfortní zakládání ad-hoc testovacích nebo ostrých "akcí" (přes API z c123-serveru).
- systém umožní v daný moment zápis výsledků pouze do jedné akce, ke které se časoměřič autorizuje.
- systém obsluhuje maximálně malé stovky uživatelů sledující live výsledky.
- zabezpečení proti neoprávněnému zápisu (API Key) a ochrana API pro konfiguraci.

## Vzhled
**Veřejná část:**
- mobile-first
- striktně využívat design system v poslední verzi (balíček z GH).
- stavět na základě prototypu Live Page ve variantě Satellite.
- žádné inline styly či lokální overrides.
- pokud komponenta chybí, použít neostylovanou a reportovat požadavek.

**Admin část:**
- Není součástí live-mini-serveru (headless). UI je implementováno v `c123-server` (využívá Timing DS).

## Datové toky

### Zdroje dat
| Zdroj | Typ dat | Charakteristika |
|-------|---------|-----------------|
| XML export | Kompletní stav (startlist, results, schedule) | Vždy kompletní, ale může být starší |
| TCP stream | OnCourse (závodníci na trati), live Results | Real-time, pouze aktuální změny |

### Merge strategie
- **XML** je autoritativní pro strukturu (kategorie, závodníci, schedule)
- **OnCourse** data přicházejí pouze z TCP - závodníci aktuálně na trati
- **Results** z TCP průběžně aktualizují data z XML
- XML posílat častěji než jen při přepínání kategorií (ideálně po každé změně stavu)
- **Infrastruktura pro ladění:** Strategie merge bude konfigurovatelná pro pozdější optimalizaci na základě testování

### Přenosy do klienta
- **REST:** kompletní stav (initial load, fallback, SEO)
- **WebSocket (hybrid):** server rozhoduje co poslat
  - `diff` - inkrementální změny (běžné live updates)
  - `full` - kompletní stav (reconnect, velké změny, restart)
  - `refresh` - signál klientovi k fetch přes REST

## Širší kontext
V budoucnu bude tato služba součástí většího řešení registračního portálu. Hlavní API by mělo být navrženo s ohledem na tuto integraci.

## Proces Vývoje
- **Autonomní nástroje:** Priorita Claude Code.
- **Autonomní běh:** Preferovat dlouhé běhy bez zásahu uživatele.
- **Testování:** Maximálně autonomní E2E testování (c123-server vs nahrávky).
- **Pořízení dat:** Nutnost získat konzistentní vzorek (TCP nahrávka + XML export) pro validní testování merge logiky.

## Roadmapa

### Fáze 0: Aktualizace vzorku dat
- [ ] **Data Acquisition:** Získání konzistentního setu dat (TCP stream + XML export + config). Aktualizace c123-protocol-docs dat i nástrojů.

Projekt je na této fázi závislý měkce ... některé části finálního testování nebude možné provést bez konzistentního vzorku dat. Tedy neblokovat další fáze, spíš nechávat otevřené kroky, které na tomto tvrdě závisí nebo dopisovat kroky po provedení např. částečného ověření na vzorcích dat.

### Fáze 1: Setup a Analýza (Aktuální)

**1.1 Inicializace monorepa**
- [ ] Struktura `packages/server` + `packages/client` + `packages/shared`
- [ ] Konfigurace npm workspaces
- [ ] Základní npm scripts (dev, build, test)
- [ ] TypeScript konfigurace se sdílenými typy

**1.2 Analýza c123-protocol-docs**
- [ ] Prostudovat XML formát (Results, Participants, Schedule, Classes)
- [ ] Prostudovat LivePage Prototype z CSK Design System
- [ ] Identifikovat data potřebná pro live page vs. co filtrovat
- [ ] Návrh zjednodušeného datového modelu pro SQLite
- [ ] Návrh rozsah dat pro jednotlivá rozhraní (v kontextu LivePage Prototype z CSK Design System)

**1.3 Technical Proof of Concept**
- [ ] Skeleton Fastify serveru (health endpoint, základní struktura)
- [ ] Skeleton React aplikace (prázdná stránka s rvp-design-system)
- [ ] SQLite + Kysely setup (connection, základní migrace)
- [ ] Ověření E2E toku: Mock data → API → DB → Client

### Fáze 2: MVP (Minimum Viable Product)

**2.1 Admin/Ingest API**
- [ ] Endpoint pro založení akce (vrací API key)
- [ ] Endpoint pro ingest XML/JSON dat
- [ ] Endpoint pro konfiguraci akce (výběr závodů, nastavení)

**2.2 Client API**
- [ ] Endpoint pro seznam veřejných akcí
- [ ] Endpoint pro data akce (startlist, results, schedule)
- [ ] Dokumentace API (OpenAPI/Swagger nebo alespoň MD)

**2.3 DB schéma**
- [ ] Tabulky dle datového modelu z Fáze 1.2
- [ ] Migrace a seed data pro testování
- [ ] Repository vrstva

**2.4 Frontend základ**
- [ ] Integrace rvp-design-system
- [ ] Základní zobrazení dat z API (seznam akcí, detail akce)
- [ ] Responzivní layout (mobile-first)

### Fáze 3: Live Features

**3.1 Live data**
- [ ] WebSocket server pro live update
- [ ] Merge logika TCP + XML dle strategie
- [ ] Konfigurovatelná merge strategie

**3.2 Frontend - kompletní zobrazení**
- [ ] OnCourse zobrazení (závodníci na trati)
- [ ] Live aktualizace výsledků
- [ ] Detail jízdy (start, cíl, penalizace na branách)
- [ ] Přepínání zjednodušený/podrobný režim výsledků
- [ ] Filtrování dle věkových kategorií + VK pořadí

**3.3 Lokalizace**
- [ ] i18n infrastruktura (react-i18next nebo podobné)
- [ ] Překlady CZ, EN

**3.4 Backend - životní cyklus akce**
- [ ] Stavy akce (draft, startlist, running, finished, official)
- [ ] API pro změnu stavu
- [ ] Logika přechodů mezi stavy

### Fáze 4: Bonus Features (volitelná)

**4.1 Bodování**
- [ ] Online počítání bodů dle českého bodovacího systému
- [ ] Zobrazení bodů ve výsledcích

**4.2 Personalizace**
- [ ] Oblíbení závodníci (hvězdičky)
- [ ] Notifikace při startu/cíli oblíbeného závodníka
- [ ] Lokální úložiště preferencí
