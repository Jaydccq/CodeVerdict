# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-04-13

Initial public release.

### Added
- AGPL-3.0 license, `CONTRIBUTING.md`, `CHANGELOG.md`, `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1)
- GitHub community files: issue templates (bug report, feature request), PR template
- Railway one-click deploy (`railway.toml`)
- SEO: Open Graph, Twitter Card, `robots.txt`, `site.webmanifest` (PWA), and JSON-LD structured data (`SoftwareApplication`, `Organization`)
- GitHub banner (`assets/banner.png`)
- Publish-ready `package.json` metadata: `repository`, `bugs`, `homepage`, `keywords`, `engines` (removed `private: true`)
- **NestJS backend** - auth (JWT + roll number), users, exams, problems, submissions
- **Vue 3 frontend** - Monaco editor, Pinia stores, exam timer
- **Judge0 integration** - batch submission with base64 encoding, token polling
- **ICPC scoring** with pessimistic write lock (`SELECT ... FOR UPDATE`)
- **Live leaderboard** - PostgreSQL materialized view with O(1) rank queries
- **Timed exams** with `ExamWindowGuard` for time-based access control
- **Admin panel** - full CRUD for exams, problems, test cases
- **Swagger/OpenAPI docs** at `/api-docs` (dev only)
- **API docs client** built into student UI with store detection
- **Autosave** with debounced saves and status indicator
- **Custom run input** - test code with custom stdin
- **Starter code** per language per problem
- **Admin signup** with setup key (auto-generates roll number)
- **Run mode** - execute code without scoring
- **Mobile responsive admin pages**
- **Docker deployment** - multi-stage Dockerfile + docker-compose with 6 services
- **Brotli pre-compression** - `.br` assets generated at build time via Vite plugin
- **Health check** endpoint (`/api/health`)
- **Server-synced timer** - countdown uses server time, preventing client-side manipulation
- **Exam duplication** - duplicate exams with problem mappings from admin panel
- **Multi-exam support** - run multiple concurrent exams with an exam selector
- **White-label branding** - app name, logo, colors (`VITE_PRIMARY_COLOR`, `VITE_ACCENT_COLOR`), copyright via env vars
- **Scrollable exam picker** with 3-column layout
- **MCQ support** - mixed exam formats with coding + multiple-choice questions
- **QA role opt-in** with admin filters and leaderboard CSV export
- **Reference solution storage** and expected output display
- **Server-side pagination** on all admin endpoints with search
- **Load testing suite** (k6) for concurrent user simulation
- **Redesigned toast notifications** with icons, progress bar, and glass-morphism
- **LeetCode-style sidebar** with auto-fetch languages
- **Coachmarks tour** with brand-colored styling and re-trigger from header
- **Success modal with confetti** on accepted submissions
- **Ctrl+S manual save** shortcut in editor
- **Light theme support** across workspace components
- **Expandable editor** with theme-aware coachmarks
- **Slack alerts** for system events (optional)
- **Configurable DB pool size** (`DB_POOL_SIZE` env var)
