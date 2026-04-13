# CLAUDE.md

## Project Overview

**CodeVerdict** - open-source (AGPL-3.0) coding exam platform. NestJS 11 backend + Vue 3 frontend, served as a single container. Self-hosted Judge0 for code execution, ICPC-scored leaderboards, white-label branding via env vars.

- **Repo:** ATOAPaymentsLimited/CodeVerdict
- **License:** AGPL-3.0 (not MIT)
- **Name:** CodeVerdict (default in `client/src/config/brand.ts` and `server/src/config/env.ts`)

## Commands

### Server (`server/`)

```bash
npm run start:dev       # Watch mode
npm run build           # Compile TypeScript
npm run lint            # ESLint with auto-fix
npm run migration:generate -- src/migrations/MigrationName
npm run migration:run
npm run migration:revert
```

### Client (`client/`)

```bash
npm run dev             # Vite dev server (port 5173)
npm run build           # TypeScript check + Vite production build
```

### Docker (root)

```bash
docker compose up --build   # All services
docker compose down
```

No test suite configured yet.

## Architecture

```
Vue 3 (Monaco editor) → Axios → NestJS REST API (/api)
                                      ↓
                              Judge0 (batch submission)
                                      ↓
                           scoring.service (ICPC formula)
                                      ↓
                        Materialized view refresh (leaderboard)
```

### Backend Modules

- **auth** - JWT login/register via `rollNumber`; `@Auth()` decorator protects routes, `@Auth(AuthType.JWT, [AdminGuard])` for admin-only
- **users** - CRUD; roles: `STUDENT | ADMIN`
- **exams** - Exam lifecycle; `ExamWindowGuard` enforces time windows
- **problems** - Problems with visible/hidden test cases per exam
- **submissions** - Code submit & run; Judge0 batching; ICPC scoring with `SELECT ... FOR UPDATE`
- **autosave** - Drafts per user/exam/problem
- **admin** - Exam/problem/test case management; leaderboard refresh

### Key Patterns

- Custom decorators in `src/common/decorators/`: `@Auth()`, `@GetUser()`
- Entities extend `BaseEntity` (`id`, `createdAt`, `updatedAt`), live in `src/entities/`
- Leaderboard = PostgreSQL materialized view (`leaderboard_view`)
- Judge0 integration in `submissions/judge0.service.ts` - batch submit, base64 encode/decode, poll with retries
- ICPC scoring in `submissions/scoring.service.ts` - pessimistic write lock

### Frontend (Vue 3 + Pinia)

- Stores: `client/src/stores/` - auth, editor, exam, problems, ui
- Composables: useMonaco, useAutosave, useTimer, useSEB, useResizable
- API clients: `client/src/services/api.ts` (student), `adminApi.ts` (admin)
- Brand config: `client/src/config/brand.ts` - reads `VITE_*` env vars with fallbacks

### Database

PostgreSQL 17 (`exam_platform`). Config: `server/src/config/database.config.ts`. DataSource: `server/src/config/typeorm.config.ts`.

### Production Build

Multi-stage Dockerfile: client → server → `node:22-alpine`. Serves Vue as static files via `express-static-gzip` (Brotli). Runs as non-root user. Health check on `/api`.

## Branding

All branding is env-var driven - no code changes needed:
- `VITE_APP_NAME` / `APP_NAME` - app name (default: `CodeVerdict`)
- `VITE_PRIMARY_COLOR` / `VITE_ACCENT_COLOR` - brand colors
- `VITE_LOGO_PATH` - logo in `client/public/`
- `VITE_COPYRIGHT_HOLDER` - footer copyright

## Environment Variables

Defined in `.env.example` (root), `server/.env.example`, `client/.env.example`.

Key required vars: `DB_PASSWORD`, `JWT_SECRET`, `ADMIN_SETUP_KEY`, `JUDGE0_URL`

## SEO & Open Source

- Meta tags (og:image, twitter:card, description, keywords) in `client/index.html`
- Banner image: `assets/banner.png` (also in `client/public/banner.png` for og:image)
- `railway.toml` - one-click Railway deploy config
- GitHub topics and description in `pancake-recipe.md` (gitignored, manual apply)
- Internal planning docs (`phase-*.md`, etc.) are gitignored - never commit them

## Conventions

- Never use TypeORM `manager` directly - always use injected repositories
- Always generate migrations with CLI (`npm run migration:generate`), never write by hand
- Use `{ data, metadata }` envelope pattern for API responses
- Swagger: `/api-docs` in dev only (`NODE_ENV !== 'production'`). All DTOs use `@ApiProperty`
- Commit style: conventional commits (`feat:`, `fix:`, `chore:`, etc.)

## Gotchas

- `server/.env` exists locally but is gitignored - never commit it
- Judge0 needs privileged Docker containers - can't run on Railway, must be deployed separately
