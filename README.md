# Intelligent Bug Diagnosis Platform with Fix Recommendation Assistance

A full-stack bug tracking platform with a working AI multi-agent analysis
pipeline. Developers submit bug reports, error logs, and stack traces; five
agents triage severity, parse the failure, find similar past bugs, explain
the probable root cause, and suggest a fix — all grounded in the team's own
resolved-bug history rather than guesswork. A chat assistant, a searchable
knowledge base, and a project health score sit on top of the same data.

> **Honest scope note:** everything described below is implemented and has
> been tested — the backend against a live server and its own pytest suite,
> generated PDFs verified by actually parsing them back with `pypdf`, and
> Docker/CI files against manual review and YAML/syntax validation only
> (this sandbox has no Docker daemon and no way to trigger a real GitHub
> Actions run — see those sections below for specifics). Not yet built: a
> broader role permission matrix beyond the single Admin boundary. Called
> out again at the bottom of this file.

## What's implemented

- **Auth** — register/login/logout, JWT, bcrypt password hashing. The very
  first account on a fresh install bootstraps as **Admin**; everyone after
  that defaults to Developer or picks a job-title-style role. Self-service
  role changes to/from Admin are blocked (see "Role-based authorization" below)
- **Bug lifecycle** — submit (title, description, stack trace, category,
  module, project, severity, priority), search/filter/paginate, status
  workflow (Open → In Progress → Resolved → Closed), resolution notes,
  assignment, comments, file attachments, a full event timeline
- **AI multi-agent pipeline**, run on demand per bug (`POST /api/bugs/{id}/analyze`):
  1. **Triage Agent** — keyword-weighted severity/priority/category prediction with reasoning
  2. **Log Analysis Agent** — regex parsing of Python/JS/Java stack traces → exception type, file, line, function
  3. **Duplicate Detection Agent** — TF-IDF + cosine similarity (offline by default), with an automatic upgrade to Sentence-Transformers + FAISS when the model can be downloaded
  4. **Root Cause Agent** — retrieval-augmented: explains the likely cause using *actually resolved* similar bugs, with a documented cold-start fallback and a confidence score
  5. **Remediation Agent** — fix suggestion grounded in the closest resolved precedent, plus best practices and an hours estimate
- **Knowledge Base** — a searchable view over every resolved bug with
  resolution notes (no separate table — it's a filtered view of Bug, so it's
  always in sync)
- **AI Chat Assistant** — a floating widget on every page; answers "list
  critical bugs," "show similar bugs to #12," "explain this stack trace: …,"
  "why did bug #12 happen," "suggest a fix for #12," and "what's the health
  score" by routing to the same agents and DB queries above (intent-matched,
  not a hosted LLM — see the note in `app/services/chat_assistant.py`)
- **Project Health Score** — a documented 0–100 heuristic (open ratio,
  critical-open ratio, likely-duplicate-open ratio, average resolution time),
  shown with its full breakdown on the Analytics page
- **Analytics** — severity/status/category breakdowns, a 30-day reporting
  trend, and team performance (resolved bugs by assignee/reporter), all via
  Chart.js
- **Admin Panel** (`/admin`, Admins only — hidden from the sidebar and
  blocked server-side for everyone else) — list all users with their bug
  counts, promote/demote roles, remove a user (their reported bugs go with
  them; bugs they were only assigned to are unassigned, not deleted)
- **In-app Notifications** — a bell with an unread badge, polled every 30s
  (no email/websocket push — see the note in `app/services/notifications.py`).
  Fires on: bug assigned, bug resolved (reporter notified), a Critical bug is
  reported (all Admins/Team Leads notified), and AI analysis completes
  (reporter + assignee notified)
- **PDF report export** — `GET /api/bugs/{id}/report` streams a generated
  PDF (bug details, AI analysis if run, resolution notes) using reportlab —
  no system-level PDF dependencies, works the same in Docker as locally.
  "Download PDF report" button on the Bug Details page
- **File uploads** — txt, log, json, xml, csv, png, jpg, zip, 20MB limit,
  stored under `uploads/{bug_id}/` (path overridable via `UPLOAD_DIR`, which
  is how the test suite keeps test files out of your real uploads folder)
- **Screenshot OCR** — uploading a png/jpg attachment automatically runs it
  through Tesseract OCR (`app/services/ocr.py`) and shows any extracted text
  right there in the Bug Details page, in an **editable** box (OCR isn't
  perfect — a misread space or character is common) with an "Add to stack
  trace" button that feeds it straight into the Log Analysis Agent. Requires
  the Tesseract binary on the host (see setup below); degrades gracefully —
  not fatally — if it isn't installed, same pattern as the semantic-embedding
  fallback for Duplicate Detection
- **Automated tests** — 99 pytest tests covering auth, role bootstrap/
  authorization, bug CRUD, comments, attachments, assignment, all 5 AI
  agents individually, the orchestrator, health score, team performance,
  knowledge base, all 6 chat intents, the Admin Panel, all 4 notification
  triggers, PDF report generation (verified by parsing the actual PDF
  content back out with `pypdf`), and OCR (verified against real generated
  images, including a full round-trip: image → OCR → applied to stack
  trace → correctly parsed by the Log Analysis Agent)
- **Docker** — a `Dockerfile` per service plus a root `docker-compose.yml`
- **CI** — a GitHub Actions workflow (`.github/workflows/ci.yml`) running
  the backend test suite and the frontend build on every push/PR to `main`
- **Dark/light mode toggle** — the sun/moon button in the top bar. Built on
  CSS custom properties (`canvas`/`surface`/`overlay`/`slate` tokens defined
  in `index.css`, read by Tailwind color config) that flip when a `.light`
  class is toggled on `<html>` — no per-component `dark:`/`light:` classes
  needed anywhere. Preference persists in `localStorage`, defaults to the
  OS's `prefers-color-scheme` on first visit

## Role-based authorization

The one role boundary enforced in this build is **Admin**: only Admins can
reach `/api/admin/*` (list/promote/remove users). Concretely:

- The first account ever registered becomes Admin automatically (bootstrap —
  there's no other way to reach the Admin Panel on a fresh install)
- Nobody can self-register or self-promote to Admin afterward — requesting
  `role: "Admin"` at registration or via `PUT /api/auth/me` is rejected/
  downgraded; only an existing Admin can grant it, via the Admin Panel
- Admins can't demote or delete themselves (in the Admin Panel *or* via
  their own Settings page) — that would risk locking a single-admin
  install out entirely
- Everything else — bug CRUD, comments, attachments, assignment, running AI
  analysis — is open to **any authenticated user regardless of role**. The
  other role values (Team Lead, QA Engineer, Engineering Manager) are
  currently descriptive/informational only, plus Team Lead additionally
  receives Critical-bug notifications

## Tech stack

| Layer      | Technology                              |
|------------|------------------------------------------|
| Frontend   | React 18 + Vite, React Router, Tailwind CSS, Chart.js (via react-chartjs-2), Axios |
| Backend    | FastAPI, SQLAlchemy ORM, Pydantic v2, python-jose (JWT), Passlib (bcrypt) |
| AI / NLP   | scikit-learn (TF-IDF + cosine similarity), with optional Sentence-Transformers + FAISS upgrade path |
| Reports    | reportlab (PDF generation, no system dependencies) |
| Database   | SQLite (file-based, zero config)        |
| Auth       | JWT bearer tokens, bcrypt-hashed passwords |

## Project structure

```
smart-bug-analyzer/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app entrypoint, CORS, router registration
│   │   ├── config.py          # Settings loaded from environment / .env
│   │   ├── database.py        # SQLAlchemy engine/session setup
│   │   ├── models.py          # User, Bug, Comment, Attachment, BugEvent, BugAnalysis
│   │   ├── schemas.py         # Pydantic request/response schemas
│   │   ├── auth.py            # Password hashing, JWT creation, get_current_user
│   │   ├── agents/
│   │   │   ├── triage.py               # Agent 1: severity/priority/category
│   │   │   ├── log_analysis.py         # Agent 2: stack trace parsing
│   │   │   ├── duplicate_detection.py  # Agent 3: TF-IDF/embeddings similarity search
│   │   │   ├── root_cause.py           # Agent 4: RAG-style root cause explanation
│   │   │   ├── remediation.py          # Agent 5: fix suggestion + best practices
│   │   │   └── orchestrator.py         # Runs all 5 agents in sequence
│   │   ├── services/
│   │   │   ├── health_score.py         # Project Health Score calculation
│   │   │   ├── chat_assistant.py       # AI Chat Assistant intent routing
│   │   │   ├── notifications.py        # In-app notification creation helpers
│   │   │   └── pdf_report.py           # PDF report generation (reportlab)
│   │   └── routers/
│   │       ├── auth.py             # /api/auth/*
│   │       ├── bugs.py             # /api/bugs/* (CRUD, comments, attachments, analyze, report)
│   │       ├── analytics.py        # /api/analytics/* (summary, health-score, team-performance)
│   │       ├── knowledge_base.py   # /api/knowledge-base
│   │       ├── chat.py             # /api/chat
│   │       ├── admin.py            # /api/admin/* (Admins only)
│   │       └── notifications.py    # /api/notifications/*
│   ├── seed.py                 # Optional: populate demo user + sample bugs
│   ├── tests/                  # pytest suite — 99 tests, see "Testing" below
│   ├── requirements.txt        # Core deps (lean, offline-capable)
│   ├── requirements-semantic.txt  # Optional: Sentence-Transformers + FAISS upgrade
│   ├── pytest.ini
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── .env.example
│   └── run.sh                  # Convenience script: venv + install + run
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx             # App entrypoint (ThemeProvider + Router + AuthProvider)
│   │   ├── App.jsx              # Route definitions (AdminGate wraps /admin)
│   │   ├── api/client.js        # Axios instance with auth interceptor
│   │   ├── context/AuthContext.jsx
│   │   ├── context/ThemeContext.jsx  # Dark/light mode state, persisted to localStorage
│   │   ├── components/          # Layout, Sidebar, Topbar, ChatAssistant, NotificationBell, badges, ProtectedRoute, StatCard
│   │   └── pages/
│   │       ├── Login.jsx
│   │       ├── Register.jsx
│   │       ├── Dashboard.jsx
│   │       ├── SubmitBug.jsx
│   │       ├── BugHistory.jsx
│   │       ├── BugDetails.jsx    # AI analysis panel, comments, attachments, timeline
│   │       ├── KnowledgeBase.jsx
│   │       ├── Analytics.jsx     # Includes Health Score + team performance
│   │       ├── AdminPanel.jsx    # Admins only (sidebar item + route both gated)
│   │       └── Settings.jsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js           # Dev-server proxy: /api → http://127.0.0.1:8000
│   ├── tailwind.config.js
│   ├── Dockerfile
│   ├── nginx.conf                # Serves the build + proxies /api in the container
│   ├── .dockerignore
│   └── .env.example
│
├── uploads/                     # Bug attachments (created automatically; .gitkeep preserves the folder)
├── .github/workflows/ci.yml     # Backend pytest + frontend build, on push/PR to main
├── docker-compose.yml
└── README.md
```

## Prerequisites

- **Python** 3.10+ (tested on 3.12)
- **Node.js** 18+ and npm
- No external database needed — SQLite is a local file created automatically.

## 1. Backend setup

```bash
cd backend
python3 -m venv .venv

# macOS / Linux
source .venv/bin/activate
# Windows (PowerShell)
.venv\Scripts\Activate.ps1

pip install -r requirements.txt

# Optional: copy the example env file and adjust values
cp .env.example .env
```

Run the API:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API is now available at `http://127.0.0.1:8000`. Interactive docs (Swagger UI)
are at `http://127.0.0.1:8000/docs`.

> The module path is `app.main:app` (not `main:app`) because the FastAPI app
> lives inside the `app/` package — run this command from the `backend/`
> directory.

Alternatively, use the bundled convenience script, which creates the venv,
installs dependencies, and starts the server in one step:

```bash
cd backend
./run.sh
```

### A note on the Duplicate Detection Agent's dependencies

`requirements.txt` is intentionally lean — core app deps plus scikit-learn
for the offline TF-IDF similarity path, nothing else. The higher-quality
semantic-embedding upgrade (Sentence-Transformers + FAISS) lives in a
separate file, `requirements-semantic.txt`, because it pulls in `torch`
(multi-gigabyte) and needs outbound internet access to huggingface.co the
first time a model is used:

```bash
pip install -r requirements.txt              # always do this
pip install -r requirements-semantic.txt      # optional — only if you want it
```

The Duplicate Detection Agent detects the optional packages' absence
automatically and falls back to TF-IDF + cosine similarity. That fallback
path — not the semantic one — is what's been verified end-to-end in this
project's own test environment and is what the Docker image installs by
default.

### Enabling OCR (screenshot text extraction)

`pip install -r requirements.txt` installs `pytesseract` (a thin Python
wrapper), but OCR also needs the **Tesseract binary itself** on your system
PATH — this isn't something pip can install:

- **macOS:** `brew install tesseract`
- **Ubuntu/Debian:** `sudo apt-get install tesseract-ocr`
- **Windows:** download the installer from
  [github.com/UB-Mannheim/tesseract/wiki](https://github.com/UB-Mannheim/tesseract/wiki),
  run it, and make sure "Add to PATH" is checked (or add the install
  directory, typically `C:\Program Files\Tesseract-OCR`, to your PATH
  manually afterward)

No install → no error. The upload still works, `extracted_text` is just
always `null`, and the frontend simply won't show the "text found in this
image" box. The Docker image installs Tesseract automatically (see the
Dockerfile), so this only matters for a non-Docker local setup.

### Running the test suite

```bash
cd backend
source .venv/bin/activate
pytest
```

99 tests covering auth, role bootstrap and authorization, bug CRUD, comments,
attachments, assignment, all 5 AI agents individually, the full orchestrator
pipeline, health score, team performance, knowledge base, all 6 chat
assistant intents, the Admin Panel, all 4 notification triggers, PDF
report generation (parsed back with `pypdf` to verify actual content, not
just that bytes came back), and OCR (tested against real generated images —
including a full round-trip proving OCR'd text is actually usable by the
Log Analysis Agent, not just stored). Each test gets its own isolated temp
SQLite file and temp uploads directory (see `tests/conftest.py`), so running
the suite never touches your real `bug_analyzer.db` or `uploads/` folder.

### Seeding demo data (optional)

To populate the database with a demo account and 10 sample bugs so the
Dashboard, Bug History, Knowledge Base, and Analytics pages have data to show
immediately:

```bash
cd backend
source .venv/bin/activate
python seed.py
```

This creates a demo user:
- **Email:** `demo@bugadvisor.dev`
- **Password:** `demo1234`

## 2. Frontend setup

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173`. The Vite dev server proxies any
request to `/api/*` through to the backend at `http://127.0.0.1:8000`, so no
CORS configuration is needed in development as long as both servers are
running.

To build a production bundle:

```bash
npm run build    # outputs to frontend/dist
npm run preview  # serve the production build locally
```

## Running with Docker (alternative to steps 1 & 2)

```bash
docker compose up --build
```

This builds and starts both containers:
- **backend** — `python:3.12-slim`, installs `backend/requirements.txt` only
  (the lean, TF-IDF path — see the note above), SQLite database and uploads
  persisted in named volumes so they survive `docker compose down`
- **frontend** — multi-stage build (Node to build the Vite bundle, then
  `nginx:1.27-alpine` to serve it), with nginx proxying `/api/*` to the
  backend container over Docker's internal network

Once both are healthy:
- Frontend: `http://localhost:8080`
- Backend API directly: `http://localhost:8000` (docs at `http://localhost:8000/docs`)

Override the JWT secret for anything beyond local testing:

```bash
SECRET_KEY=$(openssl rand -hex 32) docker compose up --build
```

> **Verification note:** this sandbox has no Docker daemon available, so
> these files were validated by YAML/syntax checking and careful manual
> review, not by an actual `docker build`/`docker compose up` run. If
> something doesn't build cleanly in your environment, please check the
> Troubleshooting section below or open an issue with the build output.

## Continuous Integration

`.github/workflows/ci.yml` runs on every push/PR to `main`: the backend
pytest suite (Python 3.12, plain `pip install -r requirements.txt`) and the
frontend production build (Node 20, `npm ci && npm run build`) — the exact
same commands documented above, in two parallel jobs.

> **Verification note:** this file was checked for valid YAML and mirrors
> commands that have been run and verified directly in this environment many
> times over, but there's no real GitHub repo/runner available here to
> actually trigger a workflow run. Push it and check the Actions tab to
> confirm it goes green in your own repo.

## 3. Using the app

1. Open `http://localhost:5173` (or `http://localhost:8080` if using Docker) — you'll land on the Login page.
2. Click **Create one** to register a new account, or sign in with the seeded
   demo account above.
3. From the Dashboard, use **Submit Bug** to log a new bug report (title,
   description, optional stack trace, category, module, project, severity,
   priority).
4. On a bug's **Bug Details** page, click **Analyze with AI** to run the full
   5-agent pipeline. Add comments, upload attachments, and change status —
   every action is recorded on the timeline. Click **Download PDF report**
   any time for a shareable summary (fuller once AI analysis has been run).
5. Resolve a bug with resolution notes and it immediately becomes part of the
   **Knowledge Base** and grounds future Root Cause / Remediation results for
   similar bugs.
6. Click the floating chat button (bottom-right, any page) to ask the **AI
   Chat Assistant** things like "list critical bugs" or "why did bug #3
   happen."
7. **Analytics** shows the Project Health Score with its breakdown, severity/
   status/category charts, a 30-day trend, and team performance.
8. The bell icon in the top bar shows **Notifications** — you'll get one
   when a bug is assigned to you, one of your bugs is resolved, a Critical
   bug is reported (if you're an Admin or Team Lead), or AI analysis
   finishes on a bug you reported or are assigned to.
9. If you're an Admin (the first person to register on a fresh install),
   an **Admin Panel** link appears in the sidebar — manage other users'
   roles or remove accounts there.
10. **Settings** lets you update your name, role, and password.

## API reference

| Method | Endpoint                          | Description                                    | Auth |
|--------|------------------------------------|-------------------------------------------------|:--:|
| POST   | `/api/auth/register`               | Create an account, returns a JWT                | No |
| POST   | `/api/auth/login`                  | Log in, returns a JWT                            | No |
| GET    | `/api/auth/me`                     | Get the current user                             | Yes |
| PUT    | `/api/auth/me`                     | Update name / role / password                    | Yes |
| POST   | `/api/bugs`                         | Create a bug report                              | Yes |
| GET    | `/api/bugs`                         | List bugs (search, severity, status, priority, page, page_size) | Yes |
| GET    | `/api/bugs/{id}`                    | Get a single bug (comments, attachments, events, analysis included) | Yes |
| PATCH  | `/api/bugs/{id}`                    | Update status, severity, priority, resolution notes | Yes |
| PATCH  | `/api/bugs/{id}/assign`             | Assign/unassign a bug to a user                  | Yes |
| DELETE | `/api/bugs/{id}`                    | Delete a bug                                     | Yes |
| POST   | `/api/bugs/{id}/comments`           | Add a comment                                    | Yes |
| POST   | `/api/bugs/{id}/attachments`        | Upload a file attachment (multipart)             | Yes |
| POST   | `/api/bugs/{id}/analyze`            | Run the 5-agent AI pipeline, store the result     | Yes |
| GET    | `/api/bugs/{id}/analysis`           | Fetch the stored AI analysis                     | Yes |
| GET    | `/api/bugs/{id}/report`             | Download a generated PDF summary                 | Yes |
| GET    | `/api/knowledge-base`               | Search resolved bugs with resolution notes       | Yes |
| GET    | `/api/analytics/summary`            | Aggregate counts + 30-day trend                  | Yes |
| GET    | `/api/analytics/health-score`       | Project Health Score + breakdown                 | Yes |
| GET    | `/api/analytics/team-performance`   | Resolved bugs by assignee/reporter                | Yes |
| POST   | `/api/chat`                         | AI Chat Assistant                                | Yes |
| GET    | `/api/admin/users`                  | List all users with bug counts                   | Admin |
| PATCH  | `/api/admin/users/{id}/role`        | Promote/demote a user's role                     | Admin |
| DELETE | `/api/admin/users/{id}`             | Remove a user                                    | Admin |
| GET    | `/api/notifications`                | List your notifications + unread count           | Yes |
| PATCH  | `/api/notifications/{id}/read`      | Mark one notification read                       | Yes |
| PATCH  | `/api/notifications/read-all`       | Mark all your notifications read                 | Yes |
| GET    | `/api/health`                       | Health check                                     | No |

Authenticated requests send `Authorization: Bearer <token>`. The frontend
handles this automatically via the Axios interceptor in `src/api/client.js`,
and redirects to `/login` if a request comes back `401`.

Full request/response schemas are viewable live at `/docs` once the backend
is running.

## Environment variables

**backend/.env** (copy from `.env.example`):

| Variable | Default | Description |
|---|---|---|
| `SECRET_KEY` | `dev-secret-key-change-me` | JWT signing secret — set a long random value before deploying |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Token lifetime (24h) |
| `DATABASE_URL` | `sqlite:///./bug_analyzer.db` | SQLAlchemy connection string |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated allowed origins |
| `UPLOAD_DIR` | `<repo>/uploads` | Where bug attachments are stored — overridden automatically by the test suite, and set explicitly in the Docker image |

**frontend/.env** (copy from `.env.example`):

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `/api` | Base path for API calls — override if the backend isn't behind the Vite proxy |

## Verified locally

Before each phase of this project was considered done, it was tested against
a live server rather than just read for correctness:

- Backend imports cleanly and all routes register (`/docs` / `openapi.json`
  checked directly, since some FastAPI versions wrap included routers in a
  way that defeats naive route-object introspection)
- Full flow tested end-to-end through the real HTTP API: register → create
  bug → resolve with notes → create a second, similar bug → run AI analysis
  → confirm the Duplicate Detection Agent found the first bug, and the Root
  Cause / Remediation agents grounded their output in its resolution notes
- Cold-start path tested explicitly: a bug with no similar history in the
  knowledge base gets a low-confidence, clearly-labeled inferred explanation
  instead of a false-confidence guess
- File upload tested with both an allowed extension (accepted) and a
  disallowed one (rejected with a clear 400)
- Knowledge Base, Health Score, Team Performance, and Chat Assistant (all 6
  supported intents) tested with real data through the actual Vite dev proxy,
  not just the raw backend
- All 86 pytest tests pass from a clean install of `requirements.txt` alone
  (no semantic-embedding extras needed)
- Attachment tests confirmed they write to an isolated temp directory via
  `UPLOAD_DIR`, not the real repo's `uploads/` folder
- Role bootstrap, self-promotion/self-demotion guards, Admin Panel
  (list/promote/delete), and all 4 notification triggers tested through the
  real HTTP API, including through the live Vite dev proxy
- Writing the authorization tests caught a real bug before it shipped: an
  early version of the register endpoint let a *non-first* user grant
  themselves the Admin role just by requesting it. Fixed and covered by
  `test_register_second_user_cannot_self_register_as_admin`
- PDF report generation tested by actually parsing the output back out with
  `pypdf` and asserting on the extracted text (bug title, severity, stack
  trace, and — after running AI analysis — the triage/root-cause/remediation
  content), not just checking that some bytes came back with a PDF header
- OCR tested against real generated images (rendered with an actual
  TrueType font, not a placeholder), including one test that genuinely
  caught an OCR-accuracy limitation: a misread space broke exact file/line
  extraction even though the exception type still matched — which is why
  the extracted-text box in the UI is editable, not read-only
- All 99 pytest tests pass from a clean install of `requirements.txt` alone
  (no semantic-embedding extras needed; Tesseract must be separately
  installed for the OCR tests — see "Enabling OCR" above)
- `npm install` / `npm run build` produce a clean bundle with no errors
- `python seed.py` runs against a fresh database and populates it correctly

## Troubleshooting

- **`ModuleNotFoundError: No module named 'app'`** — make sure you run
  `uvicorn app.main:app` from inside the `backend/` directory, not the repo root.
- **`ImportError: email-validator is not installed`** — this is already pinned
  in `requirements.txt`; re-run `pip install -r requirements.txt`.
- **`sentence-transformers` / `torch` install fails or is too slow** — see
  "A note on the Duplicate Detection Agent's dependencies" above; it's safe
  to skip these, the app falls back to TF-IDF automatically.
- **Frontend can't reach the API / network errors** — confirm the backend is
  running on port 8000 and that `frontend/vite.config.js`'s proxy target
  matches. If you changed the backend port, update the proxy target and/or
  `VITE_API_BASE_URL`.
- **CORS errors in production** — set `CORS_ORIGINS` in `backend/.env` to your
  deployed frontend's origin(s).
- **bcrypt version warning in logs** — harmless; `requirements.txt` pins
  `bcrypt==4.0.1` for compatibility with `passlib`.
- **File upload rejected** — only `.txt .log .json .xml .csv .png .jpg .jpeg .zip`
  are accepted, up to 20MB.

## Ready for GitHub

This repository ships without any build artifacts, virtual environments, or
databases — only source. A `.gitignore` is already included at the repo root
covering `backend/.venv/`, `backend/__pycache__/`, `backend/*.db`,
`backend/.env`, `frontend/node_modules/`, `frontend/dist/`, `frontend/.env`,
and uploaded file contents (while preserving the `uploads/` folder itself via
`.gitkeep`).

## Not yet implemented

Scoped out of this build so far, called out honestly rather than faked:

- **Broader role-based authorization** — the only enforced boundary is
  Admin-only access to `/api/admin/*` (see "Role-based authorization"
  above). Bug CRUD, comments, attachments, and running AI analysis remain
  open to any authenticated user regardless of role; there's no separate
  "Team Lead can approve, Developer can only comment" permission matrix
- **Real-time notification delivery** — notifications are in-app only,
  polled every 30 seconds; no email, websocket, or push delivery
