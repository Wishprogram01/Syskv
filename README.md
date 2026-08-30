# Syskv Notes ---- UNDER DEVELOPMENT

[![CI](https://github.com/Wishprogram01/Syskv/actions/workflows/ci.yml/badge.svg)](https://github.com/Wishprogram01/Syskv/actions/workflows/ci.yml)

An advanced note-taking app — **React 19 + TypeScript** frontend, **Bun + ElysiaJS** backend, **PostgreSQL + Prisma** database.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| Backend | Bun + ElysiaJS + Zod |
| Database | PostgreSQL (via Prisma ORM) |
| Data fetching | Custom hooks + TanStack-ready layout (`src/hooks`, `src/api`) |
| API testing | Postman collection (`postman/`) |
| Testing | Bun Test (unit + integration), Grafana k6 (load) |

## Project Phases

Phases yang **telah selesai (✅)**, dikelaskan mengikut kategori. Setiap kategori ada fasa masing-masing.

### 🏗️ Pembangunan Teras (Phase 1–4)

| Phase | Layer / Tech | Status |
|-------|--------------|--------|
| **1** | Frontend — React 19 + TypeScript + Vite | ✅ |
| **2** | Database — PostgreSQL (schema + Prisma models) | ✅ |
| **3** | Backend — Bun + ElysiaJS + Zod (API) | ✅ |
| **4** | ORM — Prisma Client (generation, db push, studio) | ✅ |

### 🧪 Pengujian & API (Phase 5–7)

| Phase | Layer / Tech | Status |
|-------|--------------|--------|
| **5** | API Testing — Postman (collection + environment) | ✅ |
| **6** | Testing — Bun Test (unit + integration) | ✅ |
| **7** | Load Testing — Grafana k6 | ✅ |

### 🐳 Containerization (Phase 8)

| Phase | Layer / Tech | Status |
|-------|--------------|--------|
| **8** | Container — Docker (Dockerfile + compose) | ✅ |

### ⏭️ Fasa Akan Datang

| Phase | Layer / Tech | Status |
|-------|--------------|--------|
| **9** | DevOps — GitHub Actions (CI/CD) + Coolify (deploy) | ⏳ |
| **10** | CDN — Cloudflare (performance + security) | ⏳ |
| **11** | Monitoring — Pino + OpenTelemetry + Alloy + Loki + Tempo + Grafana | ⏳ |

**Catatan:**

- **Bun phase** = **Phase 3** (Backend runtime). Bun Test pula = **Phase 6**.
- **Docker phase** = **Phase 8** (Container).
- **TanStack** = sebahagian **Phase 4** (data fetching/ORM) — belum dipasang, sedang menunggu.
- Next: **Phase 9 — DevOps** (GitHub Actions + Coolify).

## Prerequisites

- [Bun](https://bun.sh) 1.x
- PostgreSQL 12+

## Setup

```bash
# 1. Install dependencies
bun install

# 2. Copy env and adjust credentials
cp .env.example .env

# 3. Create database (once)
createdb syskv
# or: CREATE DATABASE syskv;

# 4. Generate Prisma client + push schema to DB
bun run db:generate
bun run db:push

# 5a. Backend API on :3001
bun run server

# 5b. Frontend on :5173 (proxies /api → :3001)
bun run dev
```

Open http://localhost:5173.

## Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Vite dev server (frontend) |
| `bun run server` | Bun + Elysia API server |
| `bun run build` | Build frontend |
| `bun run lint` | Oxlint |
| `bun test` | Run Bun tests |
| `bun test --watch` | Watch mode |
| `bun run test:load` | Run Grafana k6 load test |
| `bun run db:generate` | Generate Prisma client |
| `bun run db:push` | Push schema to DB |
| `bun run db:studio` | Prisma Studio UI |

## Testing

### Bun Test (unit + integration)

Unit tests cover the markdown renderer and helpers; integration tests hit the API through Elysia's `app.handle()` (no port needed) against your local DB, and clean up after themselves.

```bash
bun test
```

Test files:

- `test/markdown.test.ts` — markdown rendering, backlinks, word count, highlight, helpers
- `test/api.test.ts` — health, notes CRUD (incl. soft-delete via `trashed`), settings upsert/read, 404 cases

### Grafana k6 (load testing)

> Requires the **k6** binary: `winget install k6` or https://grafana.com/docs/k6/latest/get-started/installation/

With the API server running, run the load test:

```bash
bun run test:load
```

What it does:

- **smoke** scenario — 1 VU × 10s, checks `/api/health`
- **load** scenario — ramps 0 → 10 → 20 VUs over 60s, each iteration runs a full CRUD cycle (create → list → get → update → delete), so it is **self-cleaning**

Thresholds (fail the run if breached):

- error rate `< 1%`
- latency `p95 < 300ms`, `p99 < 600ms`

Override the target server:

```bash
BASE_URL=https://your-deployed-api.example.com/api k6 run test/load/api.k6.js
```

## Docker

Multi-stage `Dockerfile` (build frontend → slim runtime on `oven/bun`) + `compose.yaml` with PostgreSQL.

```bash
# Prerequisites: Docker Desktop with WSL2
# First run pulls images + builds (a few minutes)

docker compose up --build -d
```

- App served at http://localhost:3001 (frontend **and** `/api/*` from one container)
- PostgreSQL runs in `db` container with a persistent volume (`pgdata`)
- On startup, the app runs `prisma db push` automatically (schema sync)
- Set `POSTGRES_PASSWORD` (default `postgres`) for the DB password

Other commands:

```bash
docker compose logs -f app     # follow app logs
docker compose down            # stop containers (keeps data)
docker compose down -v         # stop + wipe database volume
```

Deployment target: **Coolify** (bring-your-own-Dockerfile) — see roadmap below.

## API Endpoints

### Notes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notes` | List (query: `view=all\|pinned\|trash`, `search`, `tag`, `notebook`) |
| GET | `/api/notes/:id` | Get one |
| POST | `/api/notes` | Create |
| PUT | `/api/notes/:id` | Update (incl. `trashed` for soft-delete) |
| DELETE | `/api/notes/:id` | Delete permanently |

### Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings` | Get all settings |
| GET | `/api/settings/:key` | Get one |
| PUT | `/api/settings/:key` | Upsert a value |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | `{ status: "ok" }` |

## Postman

Collection + environment in `postman/`. Import both, select the **Syskv Local** environment, and run requests in order to exercise the chained `noteId` variable. See [Testing with Postman](#api-testing).

## Project Structure

```
├── src/               # React frontend
│   ├── components/    # Sidebar, NoteGrid, Editor, modals, palette...
│   ├── hooks/         # useNotes, useSettings
│   ├── api/           # fetch client for the REST API
│   ├── utils/         # markdown renderer, helpers
│   ├── styles/        # CSS (light/dark, responsive)
│   └── types.ts       # shared TS types
├── server/            # Bun + Elysia backend
│   ├── app.ts         # Elysia app (exported for tests)
│   ├── index.ts       # entry — binds the port
│   ├── db/            # prisma client
│   └── routes/        # notes, settings
├── prisma/            # schema.prisma
├── test/              # bun tests + k6 load script
├── postman/           # Postman collection + environment
└── package.json
```

## Database Schema

`prisma/schema.prisma` — models: `Note`, `Setting`, `Notified`.

## Roadmap / Next Steps

- Add TanStack Query to replace manual fetch state
- User authentication (multi-user)
- Real-time sync (Supabase/Firebase or WebSockets)
- Push notifications (background reminders)
- Elysia Swagger (`@elysiajs/swagger`) for live API docs
- Docker + Coolify deploy, Cloudflare CDN, Grafana observability
