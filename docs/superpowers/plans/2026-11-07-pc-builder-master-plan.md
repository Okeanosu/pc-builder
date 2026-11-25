# PC Builder — Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the PC-parts D2C e-commerce site whose headline feature is a Gemini-powered Vietnamese chatbot that recommends compatible, in-budget PC builds via a CSP/MCKP engine, with a spec↔code graph for the thesis report.

**Architecture:** pnpm monorepo. `packages/engine` (pure TS solver, no I/O) and `packages/shared` (types + Zod) are consumed by `apps/api` (Express 5 + Drizzle + Postgres JSONB + Redis + Gemini) and `apps/web` (Next.js 16 App Router). `tools/graph` turns `docs/graph/nodes/**` into traceability + chapter material.

**Tech Stack:** Node 24, pnpm 10, TypeScript 5.9, Express 5, Zod 4, Drizzle ORM + postgres-js, ioredis, `@google/genai@2.32.0`, Next.js 16, React 19, Tailwind v4, Zustand 5, TanStack Query 5, Vitest, Supertest, Playwright, pdfkit, Biome.

**Spec:** `docs/superpowers/specs/2026-11-07-pc-builder-design.md`

## Global Constraints

- Money is integer VND (`number`, no decimals); display with `Intl.NumberFormat('vi-VN')` + `₫`.
- All user-facing copy is Vietnamese; code identifiers, comments and commit messages are English.
- Comments: default none; only non-obvious WHY, ≤ 3 lines; never put spec/graph IDs in code comments (mapping lives in graph nodes — ADR-011).
- Engine is pure: no DB, no network, no `Date.now()` except in `stats.timeMs`; deterministic for the same input.
- The LLM never produces product names/prices on its own: every product shown comes from a tool result.
- Gemini: `GEMINI_MODEL` default `gemini-flash-latest`; empty `GEMINI_API_KEY` ⇒ fallback mode, never a crash.
- Dev infra ports: Postgres `5433`, Redis `6380` (host already uses 5432/6379). API `4000`, Web `3000`.
- Workspace package names: `@pc/shared`, `@pc/engine`, `@pc/api`, `@pc/web`, `@pc/graph`.
- Subagents never run `pnpm add`/`pnpm install` (shared lockfile); missing deps are reported to Lead.
- Subagents never `git commit`; Lead commits after reviewing each task.
- Every finished task updates its graph nodes (`status`, `code`, `tests`) and `pnpm graph:check` stays green once the CLI exists.

## Review Focus

1. **Vietnamese budget phrasing** ("25tr", "25 củ", "hai mươi lăm triệu", "từ 20 đến 25 triệu", "dưới 30tr") — fallback parser must take the upper bound and never read "2K" (resolution) as 2,000₫. Owner: Task 7 (`nlu.test.ts` cases listed there).
2. **Budget too low / no feasible build** (e.g. 5,000,000₫ gaming) — engine returns `builds: []` + `infeasibleReason` + cheapest feasible total; chatbot explains and suggests the minimum budget instead of erroring. Owner: Task 3 (`solve.infeasible.test.ts`), Task 7 (`orchestrator.test.ts`).
3. **Two customers buy the last unit at the same time** — exactly one order succeeds, the other gets `OUT_OF_STOCK`; `reserved` never exceeds `stock`. Owner: Task 6 (`orders.concurrency.int.test.ts`).
4. **Gemini returns 429 / times out mid-stream** — the turn finishes in fallback mode with a visible badge, builds still render, partial tokens are not duplicated. Owner: Task 7 (`orchestrator.test.ts` "falls back on 429 after partial stream").
5. **Duplicate or underpaid bank webhook** — same `provider_txn_id` twice is a no-op; amount < total leaves the order `PENDING_PAYMENT`. Owner: Task 6 (`payments.webhook.int.test.ts`).

---

## Phase map & agents

| Phase | Task                                           | Agent             | Depends on |
| ----- | ---------------------------------------------- | ----------------- | ---------- |
| P0    | 1 Foundation scaffold                          | Lead              | —          |
| P1    | 2 Graph CLI + seed nodes + diagrams            | Docs/Graph        | 1          |
| P1    | 3 Optimization Engine                          | Engine            | 1          |
| P1    | 4 Catalog seed data                            | Data              | 1          |
| P1    | 5 Design system                                | UI/UX Designer    | 1          |
| P2    | 6 Backend modules                              | Backend           | 1, 3, 4    |
| P2    | 7 AI Advisor (chat)                            | AI                | 1, 3, 4    |
| P3    | 8 Storefront + checkout + account              | Frontend          | 5, 6       |
| P3    | 9 Advisor + Customizer UI                      | Frontend          | 5, 6, 7    |
| P3    | 10 Admin portal                                | Frontend          | 5, 6       |
| P4    | 11 QA: integration, E2E, perf, AI eval         | QA                | 6–10       |
| P4    | 12 Deploy + graph completion + report material | Lead + Docs/Graph | all        |

---

### Task 1: Foundation scaffold (Lead)

**Files:**

- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `biome.json`, `.gitignore`, `.env.example`, `README.md`
- Create: `infra/docker-compose.yml` (postgres:16 → 5433, redis:7 → 6380, plus `postgres_test` db created by init script)
- Create: `packages/shared/src/{index,constants,specs,schemas,dto,chat-events}.ts`
- Create: `packages/engine/{package.json,tsconfig.json,vitest.config.ts,src/index.ts,src/types.ts}`
- Create: `apps/api/src/{app,server,routes}.ts`, `apps/api/src/config/env.ts`, `apps/api/src/db/{client,schema}.ts`, `apps/api/src/lib/{redis,errors,http}.ts`, one empty router per module in `apps/api/src/modules/<m>/index.ts`
- Create: `apps/web` via create-next-app (TS, Tailwind, App Router, `src/`), `apps/web/src/lib/api.ts`
- Create: `tools/graph/package.json`, `docs/graph/nodes/.gitkeep`, `docs/diagrams/.gitkeep`

**Interfaces (Produces) — the contracts every later task uses:**

`@pc/shared` (`packages/shared/src`):

```ts
export const CATEGORY_KEYS = ['cpu','mainboard','ram','gpu','storage','psu','case','cooler'] as const;
export type CategoryKey = typeof CATEGORY_KEYS[number];
export const PURPOSES = ['gaming','graphics','ai','office'] as const;
export type Purpose = typeof PURPOSES[number];
export type Role = 'CUSTOMER'|'STAFF'|'ADMIN';
export type OrderStatus = 'PENDING_PAYMENT'|'PAID'|'PROCESSING'|'SHIPPING'|'COMPLETED'|'CANCELLED';
// specs.ts — exact JSONB keys per category (Data, Engine, Backend, Admin form all use these)
export interface CpuSpecs { socket: Socket; cores: number; threads: number; baseClockGHz: number; boostClockGHz: number; tdpW: number; integratedGraphics: boolean; memoryTypes: MemoryType[] }
export interface MainboardSpecs { socket: Socket; chipset: string; formFactor: FormFactor; memoryType: MemoryType; memorySlots: number; maxMemoryGB: number; m2Slots: number; wifi: boolean; color: Color }
export interface RamSpecs { type: MemoryType; capacityGB: number; modules: number; speedMHz: number; casLatency: number; rgb: boolean; color: Color }
export interface GpuSpecs { chipset: string; chipsetBrand: 'NVIDIA'|'AMD'|'Intel'; vramGB: number; lengthMm: number; tgpW: number; recommendedPsuW: number; color: Color }
export interface StorageSpecs { interface: 'NVMe'|'SATA'; formFactor: 'M.2'|'2.5"'; capacityGB: number; readMBps: number; writeMBps: number }
export interface PsuSpecs { wattage: number; efficiency: string; formFactor: 'ATX'|'SFX'; modular: boolean; color: Color }
export interface CaseSpecs { supportedFormFactors: FormFactor[]; maxGpuLengthMm: number; maxCoolerHeightMm: number; radiatorSupportMm: number[]; psuFormFactors: ('ATX'|'SFX')[]; color: Color }
export interface CoolerSpecs { type: 'air'|'aio'; sockets: Socket[]; heightMm?: number; radiatorMm?: number; tdpRatingW: number; rgb: boolean; color: Color }
export type Socket = 'AM4'|'AM5'|'LGA1700'|'LGA1851'; export type MemoryType = 'DDR4'|'DDR5';
export type FormFactor = 'ATX'|'mATX'|'ITX'; export type Color = 'black'|'white'|'other';
export interface Benchmark { cpuSingle?: number; cpuMulti?: number; gpuScore?: number }
export interface Preferences { cpuBrand?: 'AMD'|'Intel'; gpuBrand?: 'NVIDIA'|'AMD'|'Intel'; color?: 'black'|'white'; formFactor?: FormFactor; minRamGB?: number; minStorageGB?: number; needWifi?: boolean; resolution?: '1080p'|'1440p'|'4k'; requireDiscreteGpu?: boolean }
export const recommendationRequestSchema; // zod: { budget: int 5e6..200e6, purpose, preferences?, fixed?: Partial<Record<CategoryKey,string>>, exclude?: string[] }
export type ChatEvent =
  | { type: 'session'; sessionId: string; mode: 'AI'|'FALLBACK' }
  | { type: 'tool'; name: string; status: 'start'|'end'; label: string }
  | { type: 'builds'; builds: BuildDTO[] }
  | { type: 'products'; products: ProductSummaryDTO[] }
  | { type: 'token'; text: string }
  | { type: 'error'; code: string; message: string }
  | { type: 'done'; messageId: string; mode: 'AI'|'FALLBACK' };
export interface ApiErrorBody { error: { code: string; message: string; details?: unknown } }
```
`BuildDTO`, `ProductSummaryDTO`, `ProductDTO`, `CategoryDTO` (with `specSchema: SpecField[]`), `CartDTO`, `OrderDTO` are defined in `dto.ts` in Task 1; `SpecField = { key; label; type: 'number'|'string'|'boolean'|'enum'|'enum[]'|'number[]'; unit?; options?; required; filterable }`.

`apps/api`: `createApp(deps: AppDeps): express.Express` in `app.ts` where `AppDeps = { db: Db; redis: Redis; llm?: LlmClient; now?: () => Date }` so tests inject fakes. Module routers are mounted in `routes.ts` at `/api/<module>`. Errors: throw `new AppError(status, code, message, details?)`; middleware renders `ApiErrorBody`.

DB tables exactly as spec §4 in `apps/api/src/db/schema.ts` (Drizzle), migration `0000_init` incl. `CREATE INDEX products_specs_gin ON products USING gin (specs jsonb_path_ops)`.

- [ ] **Step 1:** Write root config files + docker compose; run `docker compose -f infra/docker-compose.yml up -d` → both containers healthy.
- [ ] **Step 2:** Scaffold packages/apps, install all deps once (`pnpm install`) → exit 0.
- [ ] **Step 3:** Write `@pc/shared` contracts above and the Drizzle schema; `pnpm -r typecheck` → exit 0.
- [ ] **Step 4:** Health test `apps/api/src/app.test.ts`: `GET /api/health` → `200 {status:'ok', db:'up', redis:'up'}`; run `pnpm --filter @pc/api test` → PASS.
- [ ] **Step 5:** `pnpm --filter @pc/api db:migrate` → tables exist (`\d products` shows GIN index).
- [ ] **Step 6:** Commit `chore: scaffold monorepo, shared contracts, db schema`.

### Task 2: Spec-Code Graph CLI + seed nodes + diagrams (Docs/Graph agent)

**Files:** `tools/graph/src/{cli,load,validate,emit-json,emit-traceability,emit-chapters,emit-html}.ts`, `tools/graph/src/*.test.ts`, `docs/graph/nodes/{requirements,usecases,features,modules,apis,entities,algorithms,rules,screens,tests,decisions,chapters}/*.md`, `docs/diagrams/*.mmd`, `docs/graph/README.md`

**Interfaces:**

- Consumes: node format in spec §8.
- Produces: `pnpm graph` (emit) and `pnpm graph:check` (validate; exit 1 on broken link/duplicate id/unmatched glob for nodes with `status: done`; warnings for planned nodes). Library: `loadGraph(root): Graph`, `validate(graph, repoRoot): Issue[]`.

- [ ] **Step 1:** Tests `validate.test.ts`: duplicate id → error `DUPLICATE_ID`; link to missing node → `BROKEN_LINK`; `status: done` with `code` glob matching nothing → `MISSING_CODE`; requirement with no incoming `realizes` → warning `UNREALIZED_REQUIREMENT`. Run → FAIL.
- [ ] **Step 2:** Implement loader (gray-matter + fast-glob) and validator → PASS.
- [ ] **Step 3:** Tests for emitters: traceability table has one row per requirement with columns `Yêu cầu | Use case | Tính năng | Code | Test | Trạng thái`; `chapters/CH5.md` lists every node whose `chapters` includes `CH5`. Implement → PASS.
- [ ] **Step 4:** HTML viewer (single file, Cytoscape 3.34.4 from cdnjs, data inlined, filter by type/chapter/status, click node → details + code paths).
- [ ] **Step 5:** Seed nodes: FR-01..FR-xx and NFR-01..NFR-xx derived from the assignment sheet & spec, UC-01..UC-xx, features, modules, algorithms (ALG-CSP, ALG-AC3, ALG-FC, ALG-BNB, ALG-MCKP, ALG-SCORING, ALG-NLU-FALLBACK), rules R-C01..R-C14, ADR-001..ADR-011 (copy rationale from spec table), chapters CH1..CH6, screens, test-suite nodes; all `status: planned` except P0 items.
- [ ] **Step 6:** Diagrams (Mermaid): `usecase-overview.mmd`, `erd.mmd` (matches schema.ts), `class-engine.mmd`, `seq-ai-advisor.mmd`, `seq-checkout-vietqr.mmd`, `seq-customizer-check.mmd`, `state-order.mmd`, `deployment.mmd`, `component-architecture.mmd`.
- [ ] **Step 7:** `pnpm graph:check` → exit 0; `pnpm graph` writes `docs/graph/out/*`.

### Task 3: Optimization Engine (Engine agent)

**Files:** `packages/engine/src/{types,rules,compatibility,scoring,profiles,domains,ac3,solver,topk,bruteforce,index}.ts`, tests `packages/engine/src/**/*.test.ts`, fixtures `packages/engine/test/fixtures/catalog.ts`, bench `packages/engine/bench/run.ts`

**Interfaces (Produces):**

```ts
export interface EngineProduct { id: string; category: CategoryKey; name: string; brand: string; price: number; stock: number; specs: AnySpecs; benchmark?: Benchmark; commercialBoost?: number }
export type PartMap = Partial<Record<CategoryKey, EngineProduct>>;
export type RuleCode = 'C01'|'C02'|'C03'|'C04'|'C05'|'C06'|'C07'|'C08'|'C09'|'C10'|'C11'|'C12'|'C13'|'C14';
export interface CompatibilityIssue { code: RuleCode; severity: 'error'|'warning'; message: string; categories: CategoryKey[] }
export interface PurposeProfile { purpose: Purpose; weights: Record<CategoryKey, number>; allocation: Record<CategoryKey, { min: number; max: number }> }
export interface SolveRequest { budget: number; purpose: Purpose; preferences?: Preferences; fixed?: Partial<Record<CategoryKey, string>>; exclude?: string[]; topK?: number; strategy?: 'bruteforce'|'backtracking'|'forward-checking'|'full' }
export interface Build { label: 'performance'|'balanced'|'budget'; parts: PartMap; totalPrice: number; score: number; scoreBreakdown: Partial<Record<CategoryKey, number>>; allocation: Partial<Record<CategoryKey, number>>; estimatedWattage: number; recommendedPsuWattage: number; warnings: CompatibilityIssue[] }
export interface SolveStats { strategy: string; nodesExplored: number; prunedByAc3: number; prunedByForwardChecking: number; prunedByBound: number; timeMs: number }
export interface SolveResult { builds: Build[]; stats: SolveStats; infeasibleReason?: 'BUDGET_TOO_LOW'|'NO_COMPATIBLE_COMBINATION'|'FIXED_PART_CONFLICT'; minFeasibleBudget?: number }
export function checkCompatibility(parts: PartMap): { issues: CompatibilityIssue[]; estimatedWattage: number; recommendedPsuWattage: number };
export function solve(req: SolveRequest, catalog: EngineProduct[], profile?: PurposeProfile): SolveResult; // profile defaults to DEFAULT_PROFILES[req.purpose]
export const DEFAULT_PROFILES: Record<Purpose, PurposeProfile>;
export function scoreProduct(p: EngineProduct, purpose: Purpose, catalog: EngineProduct[]): number; // 0..100 within category
export function cpuGpuTier(p: EngineProduct, catalog: EngineProduct[]): 1|2|3|4|5;
```
Rule semantics & messages: spec §3.2 table C01–C14 (Vietnamese messages, e.g. C01 `"Socket CPU (AM5) không khớp mainboard (LGA1700)"`). Wattage: `estimated = cpu.tdpW + (gpu?.tgpW ?? 0) + 75`; `recommended = ceil(estimated × 1.3 / 50) × 50`; error if `psu.wattage < ceil(estimated × 1.3)`, warning if `< estimated × 1.5`.
DEFAULT_PROFILES weights (sum 1): gaming `{gpu:.42,cpu:.22,ram:.1,storage:.07,mainboard:.07,psu:.05,case:.04,cooler:.03}`; graphics `{cpu:.32,gpu:.28,ram:.16,storage:.1,mainboard:.06,psu:.04,case:.02,cooler:.02}`; ai `{gpu:.48,ram:.16,cpu:.14,storage:.08,mainboard:.06,psu:.05,case:.02,cooler:.01}`; office `{cpu:.35,ram:.2,storage:.2,mainboard:.12,psu:.06,case:.05,cooler:.02,gpu:0}`. Allocation = weight ± 0.08 clamped to [0,1] (office gpu max 0).

- [ ] **Step 1:** Fixture catalog (~40 hand-written products covering AM4/AM5/LGA1700, DDR4/DDR5, ITX case with short GPU limit, SFX PSU, iGPU and non-iGPU CPUs).
- [ ] **Step 2:** `rules.test.ts`: per rule ≥ 1 pass, 1 fail, 1 boundary (e.g. C05 `lengthMm === maxGpuLengthMm` passes; C08 exact `ceil(est×1.3)` passes; C10 office build without GPU + `integratedGraphics:false` → error). Run → FAIL; implement `rules.ts` + `compatibility.ts` → PASS.
- [ ] **Step 3:** `scoring.test.ts`: gaming ranks RTX 4070 > RTX 4060; ai ranks 16GB-VRAM card above faster 8GB card; office profile gpu weight 0. Implement → PASS.
- [ ] **Step 4:** `ac3.test.ts`: after AC-3 with only AM5 boards in stock, no LGA1700 CPU remains; `prunedByAc3` counts removed values. Implement → PASS.
- [ ] **Step 5:** `solve.test.ts`: 25,000,000₫ gaming → 3 builds, all `checkCompatibility(...).issues` without errors, all `totalPrice ≤ 25e6`, labels `performance/balanced/budget` distinct by CPU or GPU, `performance.score ≥ balanced.score`; `preferences.cpuBrand='AMD'` → every CPU brand AMD; `fixed.gpu='gpu-4060'` → every build contains it; `exclude` respected; deterministic (two runs deep-equal except `timeMs`).
- [ ] **Step 6:** `solve.infeasible.test.ts`: 5,000,000₫ gaming with `requireDiscreteGpu` → `builds: []`, `infeasibleReason:'BUDGET_TOO_LOW'`, `minFeasibleBudget > 5e6`; fixed CPU AM5 + fixed board LGA1700 → `FIXED_PART_CONFLICT`.
- [ ] **Step 7:** `strategies.test.ts`: on fixture, `bruteforce`, `backtracking`, `forward-checking`, `full` return the same best score; `full.stats.nodesExplored < backtracking.stats.nodesExplored`.
- [ ] **Step 8:** Bench `pnpm --filter @pc/engine bench` → writes `packages/engine/bench/results.md` (table: catalog size 50/100/250/500 × strategy → ms p50/p95, nodes). Synthetic catalogs generated deterministically (seeded PRNG).
- [ ] **Step 9:** `pnpm --filter @pc/engine test -- --coverage` → branch coverage ≥ 90%.

### Task 4: Catalog seed data (Data agent)

**Files:** `apps/api/src/db/seed/data/{categories,cpu,mainboard,ram,gpu,storage,psu,case,cooler,brands}.ts`, `apps/api/src/db/seed/{index,users,weights}.ts`, `apps/api/src/db/seed/seed.test.ts`

**Interfaces:**

- Consumes: spec interfaces from `@pc/shared/specs`, Drizzle schema from Task 1.
- Produces: `pnpm --filter @pc/api db:seed` (idempotent: truncates catalog tables then inserts). ≥ 220 products: cpu 30, mainboard 35, ram 25, gpu 30, storage 25, psu 25, case 25, cooler 25. Real 2024–2026 models; prices in VND rounded to 10,000 ("giá tham khảo"); stock 0–30 (≥ 10% items at 0 to exercise filters); benchmarks for every cpu (cpuSingle/cpuMulti ≈ Cinebench R23) and gpu (gpuScore ≈ 3DMark Time Spy graphics). Categories carry `spec_schema` (`SpecField[]`) matching `specs.ts`. Users: `admin@pcbuilder.vn / Admin@123` (ADMIN), `staff@pcbuilder.vn / Staff@123`, `khach@pcbuilder.vn / Khach@123`. `purpose_weights` rows = engine `DEFAULT_PROFILES`.
- [ ] **Step 1:** `seed.test.ts`: every product's `specs` passes the category Zod schema; every gaming budget tier (15/25/40/60 triệu) has ≥ 1 compatible build via `@pc/engine.solve` on the seed data. Run → FAIL.
- [ ] **Step 2:** Write data files + seed script → test PASS; `db:seed` on dev DB → row counts printed.

### Task 5: Design system (UI/UX Designer agent)

**Files:** `apps/web/src/app/globals.css` (Tailwind v4 `@theme` tokens), `apps/web/src/app/layout.tsx` (fonts via `next/font/google`: Be Vietnam Pro, JetBrains Mono), `apps/web/src/components/ui/*` (Button, Input, Select, Checkbox, Badge, Card, Dialog, Drawer, Tabs, Tooltip, Skeleton, Toast, Price, Spinner, EmptyState), `apps/web/src/components/layout/{SiteHeader,SiteFooter,AdminShell}.tsx`, `apps/web/src/components/domain/{CompatibilityBadge,PriceTag,SpecTable,AllocationBar,PerfMeter}.tsx`, `apps/web/src/app/(dev)/design/page.tsx`, `docs/design/ui-ux.md`

- Produces: tokens & components per spec §6; `/design` showcase renders every component in light + dark; `formatVnd(n: number): string` in `apps/web/src/lib/format.ts`.
- [ ] **Step 1:** Write `docs/design/ui-ux.md` (principles, tokens table, component inventory with states, screen wireframes in ASCII for `/`, `/advisor`, `/builder`, `/c/[category]`, `/p/[slug]`, `/checkout`, `/orders/[code]/pay`, `/admin`).
- [ ] **Step 2:** Implement tokens + primitives + domain components; `pnpm --filter @pc/web build` → exit 0; screenshot `/design` at 375 and 1440 px (Playwright) and check contrast/overflow by eye.

### Task 6: Backend modules (Backend agent)

**Files:** `apps/api/src/modules/{auth,catalog,compatibility,recommendation,builds,cart,orders,payments,quotes,admin}/**`, `apps/api/src/jobs/order-expiry.ts`, tests `*.test.ts` (unit) and `*.int.test.ts` (Postgres `pcbuilder_test` + Redis db 1).
**Interfaces:** endpoints exactly as spec §4 "API chính"; DTOs from `@pc/shared/dto`. Services exported for the AI module:

```ts
// apps/api/src/modules/recommendation/recommendation.service.ts
export function createRecommendationService(deps: { db: Db; redis: Redis }): {
  recommend(
    req: RecommendationRequest,
  ): Promise<{
    builds: BuildDTO[];
    stats: SolveStats;
    infeasibleReason?: string;
    minFeasibleBudget?: number;
  }>; // persists builds (source passed in), caches by hash
};
// catalog.service.ts
export function createCatalogService(deps): {
  search(q: ProductQuery): Promise<Paginated<ProductSummaryDTO>>;
  getById(id: string): Promise<ProductDTO | null>;
  getEngineCatalog(): Promise<EngineProduct[]>;
};
// compatibility.service.ts
export function createCompatibilityService(deps): {
  check(productIds: string[]): Promise<CompatibilityResultDTO>;
};
// builds.service.ts
export function createBuildsService(deps): {
  get(id: string): Promise<BuildDTO | null>;
  save(
    build: Build,
    meta: { userId?: string; source: 'CHAT' | 'FORM' | 'CUSTOM'; purpose: Purpose; budget: number },
  ): Promise<BuildDTO>;
};
```

- [ ] **Step 1:** auth: tests register→login→me→refresh→logout (refresh after logout → 401); STAFF hitting `/api/admin/weights` PUT → 403. Implement.
- [ ] **Step 2:** catalog: tests `GET /api/products?category=cpu&specs[socket]=AM5` returns only AM5 (SQL uses `specs @> $json`), `EXPLAIN` in test asserts `products_specs_gin` index usable on large table (seed 5k synthetic rows in test); facets endpoint returns distinct values per filterable field. Implement.
- [ ] **Step 3:** compatibility + recommendation + builds: tests call `/api/recommendations` with 25e6 gaming → 3 builds persisted; second identical call served from Redis (`X-Cache: HIT`). Implement.
- [ ] **Step 4:** cart: guest cart in Redis (cookie `gid`), user cart in DB, merge on login; `POST /api/cart/builds/:id` adds all parts with `build_id`. Implement.
- [ ] **Step 5:** orders: state machine unit test (illegal transitions throw `INVALID_TRANSITION`); `orders.concurrency.int.test.ts` — product stock 1, 5 parallel `POST /api/orders` → exactly 1 `201`, 4 `409 OUT_OF_STOCK`, final `reserved=1`; expiry job releases reservation and sets `CANCELLED` after `expires_at`. BUILD orders add `ASSEMBLY_FEE`. Implement.
- [ ] **Step 6:** payments: VietQR URL builder unit test (amount, `addInfo` = order code, URL-encoded name); `payments.webhook.int.test.ts` — valid webhook → `PAID`, stock decremented, `inventory_movements` row; duplicate `provider_txn_id` → 200 no-op; underpaid → stays `PENDING_PAYMENT`; wrong Apikey → 401; `simulate` allowed only in non-production or ADMIN. Implement.
- [ ] **Step 7:** quotes: `GET /api/quotes/builds/:id.pdf` → `application/pdf`, body starts with `%PDF`, contains Vietnamese text rendered with DejaVu font. Implement.
- [ ] **Step 8:** admin: product CRUD validates `specs` against category `spec_schema` (missing required → 422 with field path); inventory adjust writes movement; weights PUT invalidates `cache:reco:*`; orders status update via state machine; `/admin/stats/revenue?groupBy=day` sums PAID+ orders. Implement.
- [ ] **Step 9:** `pnpm --filter @pc/api test` → all PASS; update graph nodes.

### Task 7: AI Advisor — chat module (AI agent)

**Files:** `apps/api/src/modules/chat/{index,chat.routes,chat.controller,chat.service,orchestrator,tools,prompts,llm/gemini-client,llm/types,fallback/nlu,fallback/responder,sse}.ts`, tests `nlu.test.ts`, `orchestrator.test.ts`, `chat.int.test.ts`, eval `apps/api/eval/{golden-set.json,run-eval.ts}`
**Interfaces:**

```ts
// llm/types.ts
export interface LlmMessage {
  role: 'user' | 'model';
  parts: LlmPart[];
}
export type LlmPart =
  | { text: string }
  | { functionCall: { name: string; args: Record<string, unknown> } }
  | { functionResponse: { name: string; response: Record<string, unknown> } };
export interface LlmToolDecl {
  name: string;
  description: string;
  parametersJsonSchema: object;
}
export type LlmChunk =
  | { type: 'text'; text: string }
  | { type: 'functionCall'; name: string; args: Record<string, unknown> };
export interface LlmClient {
  stream(input: {
    system: string;
    history: LlmMessage[];
    tools: LlmToolDecl[];
    signal?: AbortSignal;
  }): AsyncIterable<LlmChunk>;
}
export class LlmUnavailableError extends Error {
  constructor(public reason: 'NO_KEY' | 'RATE_LIMIT' | 'TIMEOUT' | 'UPSTREAM');
}
// orchestrator.ts
export function runTurn(
  input: { sessionId: string; userText: string; history: LlmMessage[] },
  deps: { llm?: LlmClient; tools: ToolRegistry; emit: (e: ChatEvent) => void; timeoutMs?: number },
): Promise<{ mode: 'AI' | 'FALLBACK'; assistantText: string; buildIds: string[] }>;
// fallback/nlu.ts
export interface ParsedIntent {
  budget?: number;
  budgetRange?: [number, number];
  purpose?: Purpose;
  preferences: Preferences;
  wantsChange?: 'cheaper' | 'stronger' | 'swap-gpu-brand' | 'swap-cpu-brand';
}
export function parseIntent(text: string, previous?: ParsedIntent): ParsedIntent;
```
Tools: `recommend_builds`, `search_products`, `get_product_details`, `check_compatibility`, `modify_build` (schemas in spec §3.1) implemented over Task 6 services. Max 4 tool rounds per turn; Gemini timeout 20s.

- [ ] **Step 1:** `nlu.test.ts` (≥ 40 cases) including: `"25tr chơi game"`→{budget:25e6,purpose:'gaming'}; `"tầm 20-25 triệu"`→budget 25e6, range [20e6,25e6]; `"dưới 30 củ"`→30e6; `"hai mươi lăm triệu"`→25e6; `"chơi game 2K 30tr"`→resolution '1440p', budget 30e6 (not 2000); `"render blender, premiere"`→'graphics'; `"train model AI, deep learning"`→'ai'; `"làm kế toán, word excel"`→'office'; `"thích AMD, card NVIDIA"`→cpuBrand AMD, gpuBrand NVIDIA; `"case trắng"`→color white; `"rẻ hơn chút"` with previous →wantsChange 'cheaper'. Run → FAIL → implement → PASS.
- [ ] **Step 2:** `orchestrator.test.ts` with a scripted fake `LlmClient`: functionCall `recommend_builds` → emits `tool start/end`, `builds`, then streamed `token`s, `done{mode:'AI'}`; >4 tool rounds → stops with apology text; no key → `mode:'FALLBACK'`; **"falls back on 429 after partial stream"** → emits `error`-free fallback answer, final text contains no duplicated partial tokens, `done.mode==='FALLBACK'`; budget infeasible → text mentions `minFeasibleBudget` formatted VND.
- [ ] **Step 3:** `gemini-client.ts` over `@google/genai@2.32.0` (`ai.models.generateContentStream` with `config.systemInstruction`, `config.tools=[{functionDeclarations}]`, maps 429→`RATE_LIMIT`).
- [ ] **Step 4:** Routes: `POST /api/chat/sessions`, `GET /api/chat/sessions/:id`, `POST /api/chat/sessions/:id/messages` (SSE `text/event-stream`, each event `data: <ChatEvent JSON>\n\n`), persisted `chat_messages` incl. tool calls, rate limit 10/min. `chat.int.test.ts` with fake LLM → SSE parsed events order `session → tool → builds → token+ → done`.
- [ ] **Step 5:** Eval `run-eval.ts` over 30 golden prompts (real Gemini when key present, else fallback) → `apps/api/eval/results.md`: tool-call accuracy, param accuracy, 100% valid builds, latency p50/p95.

### Task 8: Storefront, cart, checkout, account (Frontend agent)

**Files:** `apps/web/src/app/(shop)/{page.tsx,c/[category]/page.tsx,p/[slug]/page.tsx,builds/[id]/page.tsx,cart/page.tsx,checkout/page.tsx,orders/[code]/pay/page.tsx}`, `apps/web/src/app/(auth)/{login,register}/page.tsx`, `apps/web/src/app/account/**`, `apps/web/src/features/{catalog,cart,checkout,auth}/**`, `apps/web/src/stores/{cart,auth}.ts`

- Consumes: Task 5 components, Task 6 endpoints, `apps/web/src/lib/api.ts`.
- [ ] Steps: category page renders facet filters from `specSchema` (filterable fields) synced to URL query; product page SSR with `generateMetadata`; cart ⇄ server; checkout form (Zod) → `POST /api/orders` → redirect to pay page that polls every 3s and shows countdown to `expiresAt`, success state on `PAID`; login/register; account orders list. Verify with `pnpm --filter @pc/web build` and manual Playwright smoke.

### Task 9: AI Advisor UI + PC Customizer (Frontend agent)

**Files:** `apps/web/src/app/advisor/page.tsx`, `apps/web/src/app/builder/page.tsx`, `apps/web/src/features/advisor/{ChatPanel,ChatMessage,BuildCard,BuildCompare,ToolStatusChip,FallbackBadge,useChatStream}.tsx`, `apps/web/src/features/builder/{BuildSlot,PartPicker,BuildSummaryBar}.tsx`, `apps/web/src/stores/{chat,builder}.ts`, `apps/web/src/components/ChatWidget.tsx`

- `useChatStream(sessionId)` reads SSE via `fetch` + `ReadableStream`, dispatches `ChatEvent`s into `useChatStore`.
- Builder uses `checkCompatibility` from `@pc/engine` client-side for instant badges; "Mở trong Customizer" loads a `BuildDTO` into `useBuilderStore`.
- [ ] Steps: implement per spec §5–§6 "wow" moment; suggested-prompt chips ("Gaming 25 triệu", "Đồ họa 40 triệu", "AI/Deep learning 60 triệu", "Văn phòng 12 triệu"); verify streaming against running API in fallback mode.

### Task 10: Admin portal (Frontend agent)

**Files:** `apps/web/src/app/admin/{page,products,products/[id],inventory,benchmarks,weights,orders,orders/[code],chats}/page.tsx`, `apps/web/src/features/admin/{DynamicSpecForm,WeightMatrixEditor,RevenueChart,OrderStatusControl}.tsx`

- [ ] Steps: role guard (ADMIN/STAFF; weights ADMIN only); `DynamicSpecForm` renders inputs from `SpecField[]`; weight matrix 4 purposes × 8 categories with live sum check (must equal 1.00 ± 0.001); revenue chart (recharts) by day/week/month; chat log viewer showing tool calls.

### Task 11: QA (QA agent)

**Files:** `e2e/{playwright.config.ts,advisor-to-payment.spec.ts,customizer-conflict.spec.ts,admin-weights.spec.ts}`, `apps/api/test/perf/recommendations.autocannon.ts`, `docs/testing/test-report.md`

- [ ] E2E 1: home → advisor → "chơi game 25 triệu" → 3 BuildCards → "Thêm cả bộ vào giỏ" → checkout → pay page → call simulate endpoint → page shows "Đã thanh toán".
- [ ] E2E 2: builder → pick AM5 CPU + LGA1700 board → red C01 badge with Vietnamese message.
- [ ] E2E 3: admin sets gaming gpu weight 0.6 (rebalanced) → new recommendation GPU share increases.
- [ ] Perf: autocannon 30s on `/api/recommendations` (cache off) → p95 < 300 ms recorded.
- [ ] Test report: tables from engine bench, AI eval, coverage, E2E results.

### Task 12: Deploy + graph completion (Lead + Docs/Graph)

**Files:** `apps/api/Dockerfile`, `apps/web/Dockerfile`, `infra/docker-compose.prod.yml`, `infra/Caddyfile`, `docs/deploy.md`, `docs/graph/nodes/**` (status → done)

- [ ] `docker compose -f infra/docker-compose.prod.yml up --build` locally → web on :80 serves home, API health ok.
- [ ] All implemented nodes `status: done` with `code`/`tests`; `pnpm graph:check` exit 0; `pnpm graph` regenerates `docs/graph/out/` incl. `chapters/CH1..CH6.md`.
- [ ] `pnpm verify` (= typecheck + lint + test + graph:check) → exit 0.
