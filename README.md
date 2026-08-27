# Weekly Coding Challenges 2.0

A production-grade, full-stack competitive-programming platform built for university coding communities. Students register with their university UID, solve weekly coding challenges in a real sandboxed code-execution environment, earn XP, build streaks, unlock achievements, earn certificates, and compete on year-segmented leaderboards — all under continuous code-similarity integrity monitoring.

> Built with **Next.js 16 (App Router)**, **TypeScript 5**, **Prisma ORM**, **SQLite**, **Tailwind CSS 4**, **shadcn/ui**, and a dedicated **Bun-based sandboxed code-execution micro-service**.

---

## ✨ Feature overview

### Student experience
- **UID-validated registration** — university UID pattern `25LBCSxxxx` (second year) or `26LBCSxxxx` (first year). Year is derived server-side from the prefix; additional batches can be added without a rewrite.
- **Polished dashboard** — avatar, XP, level tier, current/longest streak, contribution calendar (GitHub-style, last 52 weeks), weekly challenge spotlight with live countdown, recent activity timeline, recent submissions, recently-unlocked achievements.
- **Bitmoji-style avatar builder** — original SVG avatar renderer with 12 categories (gender presentation, skin, face, hairstyle, eyes, eyebrows, glasses, facial accessories, outfit, outfit vibe, sticker, expression). Stored in the database so it persists across sessions; appears across dashboard, leaderboard, profile, achievements and admin views.
- **Profile page** — full coding identity: stats, contribution calendar, performance chart, achievements grid (with live progress on locked ones), certificates, activity timeline, challenge history.
- **Challenge explorer** — searchable, filterable by difficulty/category/year/weekly, with status pills (Solved / Attempted / Not attempted).
- **Coding workspace** — language selector (Python 3 / C++ 17 / JavaScript), line-numbered editor, **Run** + **Submit**, real per-test-case results with diff for failed sample tests, XP breakdown, achievement-unlock celebrations, Cmd/Ctrl+Enter shortcut, localStorage autosave.
- **Leaderboard** — Overall / First Year / Second Year scopes, All-time / Weekly / Monthly periods, top-3 podium, my-rank card with movement indicator, Hall of Fame for weekly winners.
- **Achievements** — 22 backend-evaluated achievements across milestone / streak / speed / skill / consistency categories, with rarity tiers (common / rare / epic / legendary) and live progress.
- **Certificates** — auto-issued on tier completion (Beginner 3 solves → Intermediate 8 → Advanced 15 → Pro 25, plus level requirements). Printable, with verification IDs. Backend enforces eligibility — no unearned certificates.
- **Notifications** — challenge publishes, achievement unlocks, certificates, streak milestones, level-ups, announcements. Unread badge in the nav.

### XP & progression
- 9 levels across 4 tiers: **Beginner** (L1–2), **Intermediate** (L3–4), **Advanced** (L5–6), **Pro** (L7–9).
- XP awarded **idempotently** — only the first successful solve earns primary XP; 25% first-attempt bonus. Achievement XP added separately. Prevents brute-force grinding.
- Streaks computed from real submission dates in `ActivityLog`, not trusted from the client.

### Admin panel (separate, secured)
- **Admin login** — password verified against a **salted bcrypt hash in the database**. The admin password is **never** in client bundles or committed source; it's seeded from the `ADMIN_PASSWORD` env var.
- **Overview** — 8 platform metric cards, year-split card, 14-day submission chart, recent submissions feed.
- **Participants** — search/filter, ban/unban, XP adjustment, per-student detail (stats, achievements, certificates, submissions, activity).
- **Challenges** — full CRUD with draft/published/archived states, test-case editor (reorderable, sample/hidden), multi-language starter code, weekly scheduling, solution reference.
- **Submissions** — filter by user/challenge/status/language; code inspector with syntax highlighting and per-test results.
- **Integrity monitoring** — plagiarism flags with similarity scores, status filter, **side-by-side code comparison** with live re-computed similarity, review/dismiss/confirm with admin notes, manual recompute.
- **Analytics** — Year 1 vs Year 2 participation, submission, accepted, solved, per-challenge performance, 14-day time series.
- **Audit log** — every sensitive admin action (login, challenge create/edit/delete, view submission, ban/unban, flag review, settings update, integrity recompute).
- **Settings** — platform name, supported languages, categories, difficulties, similarity threshold, rate limits, announcements.

### Integrity / plagiarism detection
- Multiple normalization strategies: **token normalization** (identifier/comment/whitespace removal), **whitespace-only**, **identifier normalization**, **structural similarity** (edit distance on normalized tokens).
- 3-gram Jaccard similarity + structural edit-distance combined into a 0–1 score.
- Submissions bucketed by a normalized fingerprint; pairs above the configurable threshold (default 0.7) are flagged for admin review.
- Designed so an AST-based engine can be added later without changing the interface.

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Next.js 16 App Router client + server components) │
│  - Routes under /, /dashboard, /challenges, /profile,        │
│    /leaderboard, /achievements, /certificates, /notifications│
│    /admin/*                                                  │
└───────────────┬─────────────────────────────────────────────┘
                │ fetch (relative paths only)
┌───────────────▼─────────────────────────────────────────────┐
│  Next.js API routes (src/app/api/**)                         │
│  - Signed httpOnly session cookies (HMAC, no JWT lib)        │
│  - Role-separated sessions: student vs admin                 │
│  - Input validation (zod-lite + server checks)               │
│  - Rate limiting (submissions: 8/min/user)                   │
└───────┬───────────────────────────────┬─────────────────────┘
        │                               │ (server-side fetch)
┌───────▼───────────────┐      ┌─────────▼──────────────────────┐
│  Prisma + SQLite      │      │  Exec mini-service (Bun)        │
│  (db/custom.db)       │      │  - /run, /health on port 3031  │
│  - Normalized models  │      │  - Sandboxed subprocess runner │
│  for users, avatars,  │      │  - Python / C++ / JavaScript    │
│  challenges, tests,   │      │  - Hard wall-clock + CPU limits │
│  submissions, XP,     │      │  - Ephemeral temp dir per run   │
│  achievements, certs, │      │  - Per-test stdin/stdout capture│
│  notifications, flags, │      └────────────────────────────────┘
│  audit logs, settings │
└───────────────────────┘
```

### Code execution security
Student code **never runs inside the main Next.js server process**. The Next.js submission API proxies to the isolated `mini-services/exec-service/` Bun server, which:
- Writes each submission to an ephemeral directory under `os.tmpdir()` with mode `0600`.
- Spawns the language runtime (`python3 -I`, `node`, or `g++` then the binary) with a minimal environment.
- Enforces a hard wall-clock limit with a `SIGKILL` fallback timer.
- Captures stdout/stderr/exit code per test case.
- Deletes the temp directory after the run.

### Database
SQLite for local dev (portable to PostgreSQL by changing the datasource provider + connection string). 18 normalized models: `User`, `AdminUser`, `Avatar`, `Challenge`, `TestCase`, `Submission`, `XpTransaction`, `LevelDef`, `Achievement`, `UserAchievement`, `Certificate`, `LeaderboardSnapshot`, `WeeklyWinner`, `Notification`, `ActivityLog`, `AuditLog`, `PlagiarismFlag`, `PlatformSetting`.

---

## 🚀 Local development

### Prerequisites
- Node.js 20+, Bun 1.3+
- Python 3 (for the Python runner), g++ (for C++), Node (for JavaScript) — all typically already installed.

### 1. Install dependencies
```bash
bun install
cd mini-services/exec-service && bun install && cd ../..
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env: set a strong SESSION_SECRET and ADMIN_PASSWORD
```

Required variables:
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLite path (default `file:./db/custom.db`) |
| `SESSION_SECRET` | HMAC secret for signing session cookies |
| `ADMIN_USERNAME` | Admin username (default `admin`) |
| `ADMIN_PASSWORD` | Admin password — **seeded into the DB as a bcrypt hash**; never appears in client bundles |
| `EXEC_SERVICE_PORT` | Code-execution mini-service port (default `3031`) |

### 3. Initialize the database
```bash
bun run db:push     # create schema
bun run db:seed     # seed admin, levels, achievements, settings, sample challenges, demo students
```

### 4. Run the services
```bash
# Terminal 1 — code execution mini-service
cd mini-services/exec-service && bun run dev   # port 3031

# Terminal 2 — main app
bun run dev   # port 3000
```

Open the **Preview Panel** on the right (or click "Open in New Tab").

### Demo credentials
- **Student (first year):** `26LBCS0001` / `demo1234`
- **Student (second year):** `25LBCS0001` / `demo1234`
- **Admin:** `admin` / (the `ADMIN_PASSWORD` you set in `.env`)

---

## 🧱 Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) |
| Database | Prisma ORM + SQLite (portable to PostgreSQL) |
| Auth | Signed httpOnly cookies (HMAC), bcryptjs password hashing |
| State | Zustand (client), TanStack Query available |
| Charts | Recharts |
| Code rendering | react-syntax-highlighter |
| Markdown | react-markdown |
| Icons | lucide-react |
| Notifications | sonner |
| Code execution | Standalone Bun micro-service (sandboxed subprocess) |

---

## 🔒 Security model

- **Admin password** — stored only as a salted bcrypt hash in `AdminUser.passwordHash`. The literal value lives exclusively in the local `.env` (gitignored) and is used **once** by the seeder. It is never sent to the client.
- **Session tokens** — opaque HMAC-signed payloads in httpOnly cookies. Separate cookies for student vs admin. Server-side verification on every request.
- **Authorization** — role-separated sessions; admin endpoints require the admin session; student endpoints require the student session.
- **Input validation** — server-side. UID format, password length, challenge fields, avatar config (sanitized against an allow-list).
- **Rate limiting** — 8 submissions per minute per user.
- **Code execution isolation** — separate process with hard time/memory limits and a minimal environment.
- **Audit logging** — every sensitive admin action is recorded with actor, target, details and timestamp.
- **Idempotency** — XP is awarded only on the first successful solve; achievements unlock via unique constraints; certificates are unique per (user, level).
- **Secrets** — `.env*` is gitignored; `.env.example` contains only placeholder variable names.

---

## 📂 Project structure

```
prisma/
  schema.prisma          # 18 normalized models
  seed.ts                # admin, levels, achievements, settings, sample challenges, demo students
src/
  app/
    api/                 # REST API routes (auth, challenges, submissions, profile, leaderboard, ...)
      admin/             # admin-only endpoints (dashboard, challenges, participants, integrity, ...)
    admin/               # admin panel pages
    challenges/          # challenge explorer + [slug] workspace
    dashboard/ profile/ leaderboard/ achievements/ certificates/ notifications/
    layout.tsx  page.tsx globals.css
  components/
    ui/                  # shadcn/ui
    admin-shell.tsx      # admin layout + AdminGuard
    student-shell.tsx    # student layout + nav + sticky footer
    auth-guard.tsx       # student page guard
    avatar-svg.tsx       # Bitmoji-style SVG avatar renderer
    auth-bootstrap.tsx   # hydrates auth state
    theme-provider.tsx
  lib/
    db.ts password.ts uid.ts session.ts
    progression.ts       # level tiers + streak recompute
    achievements.ts      # backend achievement evaluator + certificate issuer
    similarity.ts        # plagiarism engine
    api.ts admin.ts store.ts
mini-services/
  exec-service/          # sandboxed code runner (Bun, port 3031)
```

---

## 🌱 Extensibility

The architecture was designed so the following can be added without a rewrite:
- **Additional batches** — extend `BATCH_MAP` in `src/lib/uid.ts`.
- **More programming languages** — add a runner to the exec service + update the catalog.
- **AST-based plagiarism** — add a strategy in `src/lib/similarity.ts`; the interface already supports it.
- **Contests, teams, battles, mentorship, multiple colleges** — the normalized schema and API layering leave room for these.
- **PostgreSQL** — change `provider` + connection string in `prisma/schema.prisma`.

---

## 📜 Scripts

```bash
bun run dev          # Next.js dev server (port 3000)
bun run lint         # ESLint
bun run db:push      # push schema to SQLite
bun run db:seed      # seed demo data
bun run db:generate  # regenerate Prisma client
```

---

## ⚠️ Production notes

- Run behind HTTPS; set `secure: true` on cookies (already conditional on `NODE_ENV=production`).
- Use PostgreSQL (or another production DB) instead of SQLite.
- Run the exec service in a container with stricter seccomp/AppArmor profiles; consider Judge0 for a hardened multi-tenant setup.
- Rotate `SESSION_SECRET` and `ADMIN_PASSWORD`; store in a secrets manager.
- Enable structured logging for audit + submission pipelines.

---

© Weekly Coding Challenges 2.0 — built as a real, full-stack university coding ecosystem.
