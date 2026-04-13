# Contributing to CodeVerdict

Thanks for your interest in contributing! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Commit Conventions](#commit-conventions)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)

---

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you're expected to uphold it.

---

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/CodeVerdict.git
   cd CodeVerdict
   ```
3. **Add the upstream remote:**
   ```bash
   git remote add upstream https://github.com/ATOAPaymentsLimited/CodeVerdict.git
   ```
4. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

---

## Development Setup

### Prerequisites

- Node.js 22 LTS
- Docker 24+ with Compose v2
- PostgreSQL 17 (only for running without Docker)

### Install dependencies

```bash
cd server && npm install && cd ..
cd client && npm install && cd ..
```

### Configure environment

```bash
cp .env.example .env
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Edit the `.env` files with your local values. See the [README](README.md#environment-variables) for details on each variable.

### Run with Docker (recommended)

```bash
docker compose up --build
```

This starts all 6 services: the app, app database (PostgreSQL 17), Judge0 server, Judge0 worker, Judge0 database (PostgreSQL 16), and Redis (Judge0 job queue).

### Run without Docker

```bash
# Terminal 1 - backend
cd server && npm run start:dev

# Terminal 2 - frontend
cd client && npm run dev
```

Make sure PostgreSQL is running locally and `CORS_ORIGIN=http://localhost:5173` is set in `server/.env`.

### Setting up Judge0 (code execution)

You need a Judge0 instance for code submissions to work.

- **Linux / macOS / WSL** - self-host Judge0 locally using Docker. Follow the [Judge0 deployment procedure](https://github.com/judge0/judge0/blob/master/CHANGELOG.md#deployment-procedure), then set `JUDGE0_URL` in `server/.env` to your local instance. On macOS, Docker Desktop runs a Linux VM so Judge0 works out of the box.
- **Windows (without WSL)** - Judge0 requires Linux-only features (cgroups, isolate). Use the hosted [Judge0 CE API on RapidAPI](https://rapidapi.com/judge0-official/api/judge0-ce) instead. Signup and a payment method are required. Set `JUDGE0_URL` and `RAPIDAPI_KEY` in `server/.env` per the values from RapidAPI.

---

## Making Changes

1. **Keep changes focused** - one feature or fix per PR
2. **Write clear code** - prefer readability over cleverness
3. **Follow existing patterns** - look at how similar features are implemented before creating new abstractions
4. **Update documentation** - if your change affects setup, configuration, or API behavior, update the README

### Backend changes (NestJS)

- Entities go in `server/src/entities/`
- All entities extend `BaseEntity` (`id`, `createdAt`, `updatedAt`)
- Use `class-validator` decorators on DTOs
- Add `@ApiProperty()` to DTO fields for Swagger docs
- Use the `@Auth()` decorator for protected routes, `@Auth(AuthType.JWT, [AdminGuard])` for admin-only routes
- Use injected repositories, **never** `manager` directly

### Frontend changes (Vue 3)

- Use Composition API with `<script setup lang="ts">`
- State management via Pinia stores in `client/src/stores/`
- API calls go through service files in `client/src/services/`
- Reusable logic goes in composables (`client/src/composables/`)

### Database migrations

**Always generate migrations using the TypeORM CLI** - never write them by hand:

```bash
cd server
npm run migration:generate -- src/migrations/DescriptiveName
```

Review the generated file before committing. Use PascalCase names (e.g., `AddProblemDifficultyColumn`).

---

## Commit Conventions

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <short description>

[optional body]
```

### Types

| Type | When to use |
|------|------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, semicolons, etc. (no logic change) |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `chore` | Build process, dependencies, tooling |

### Examples

```
feat: add problem difficulty field to exam problems
fix: prevent timer drift with server-synced countdown
docs: add Docker troubleshooting section to README
chore: bump NestJS to v11.1
```

---

## Pull Request Process

1. **Sync with upstream** before opening a PR:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Ensure your code passes linting:**
   ```bash
   cd server && npm run lint
   cd client && npm run lint
   cd client && npm run build   # catches TypeScript errors
   ```

3. **Open a PR against `main`** with:
   - A clear title following commit conventions
   - A description explaining **what** changed and **why**
   - Screenshots for UI changes

4. **Respond to review feedback** - we aim to review PRs within a few days

5. **One approval required** before merging

### PR checklist

- [ ] Code follows existing patterns and conventions
- [ ] Linting passes (`npm run lint` in server)
- [ ] TypeScript compiles without errors (`npm run build` in client)
- [ ] New environment variables are documented in `.env.example` files
- [ ] Database changes have a generated migration
- [ ] README updated if setup/configuration changed

---

## Coding Standards

### TypeScript

- Strict mode enabled
- No `any` types unless absolutely necessary (and documented why)
- Use interfaces for object shapes, enums for fixed sets

### Backend (NestJS)

- Follow NestJS module structure: controller -> service -> repository
- Use DTOs for all request/response bodies
- Validate inputs with `class-validator`
- Use pessimistic locking (`SELECT ... FOR UPDATE`) for score-related writes

### Frontend (Vue 3)

- Components use `<script setup lang="ts">`
- Keep components focused - extract logic into composables
- Use Pinia for shared state, local refs for component-only state

### General

- No hardcoded secrets or credentials - use environment variables
- No `console.log` in production code (use NestJS `Logger` on the backend)
- Prefer early returns over deeply nested conditionals

---

## Reporting Bugs

Open a [GitHub issue](https://github.com/ATOAPaymentsLimited/CodeVerdict/issues/new) with:

- **Title:** Short, descriptive summary
- **Environment:** OS, Node version, Docker version, browser
- **Steps to reproduce:** Numbered list, as specific as possible
- **Expected behavior:** What should happen
- **Actual behavior:** What actually happens
- **Logs/screenshots:** Include error messages, console output, or screenshots

---

## Requesting Features

Open a [GitHub issue](https://github.com/ATOAPaymentsLimited/CodeVerdict/issues/new) with:

- **Title:** Short description of the feature
- **Problem:** What problem does this solve?
- **Proposed solution:** How you'd like it to work
- **Alternatives considered:** Other approaches you thought about

For larger features, open an issue first to discuss the approach before writing code.

---

## Questions?

Open a [discussion](https://github.com/ATOAPaymentsLimited/CodeVerdict/discussions) or reach out via issues. We're happy to help you get started!
