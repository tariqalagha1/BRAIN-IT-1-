# Brain it — AI Orchestration Platform

Brain it is a production-ready multi-agent AI orchestration platform.  
Compose intelligent task flows across independent agent services with a clean SaaS dashboard, API key management, usage tracking, and full A2A (agent-to-agent) routing.

---

## Project Structure

```
├── brainit-platform/           ← Production services
│   ├── brainit-core/           ← Phase 6 orchestrator (FastAPI)
│   └── agents/
│       ├── echo-agent-service/
│       └── transform-agent-service/
├── frontend/                   ← Next.js 15 product dashboard
├── docker-compose.yml          ← 5-service orchestration
├── .env.example                ← Environment template
├── start.sh / start.ps1        ← One-command launchers
└── DEPLOYMENT.md               ← Full deployment guide
```

---

## Quick Start

### With Docker (recommended)

```bash
cp .env.example .env          # fill in any secrets
docker compose up --build
```

Services will be available at:

| Service | URL |
|---------|-----|
| Brain it Core API | http://localhost:8000 |
| Echo Agent        | http://localhost:8001 |
| Transform Agent   | http://localhost:8002 |
| Frontend          | http://localhost:3000 |
| API Docs          | http://localhost:8000/docs |

### Without Docker (local dev)

**Backend (brainit-platform/brainit-core)**
```bash
cd brainit-platform/brainit-core
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Echo Agent**
```bash
cd brainit-platform/agents/echo-agent-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

**Transform Agent**
```bash
cd brainit-platform/agents/transform-agent-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8002
```

**Frontend**
```bash
cd frontend
npm install
npm run dev          # starts on http://localhost:3000
```

---

## Platform Features

- **Guided onboarding** — API key creation → first task → result in under 60 seconds
- **Task orchestration** — `echo`, `transform`, and `echo_transform` flows
- **A2A routing** — inter-agent calls with full execution trace
- **API key management** — per-tenant keys with plan types (free/pro/enterprise)
- **Usage tracking** — daily quotas, rate limiting, usage history
- **Agent registry** — live health checks, enable/disable, registry snapshots
- **Advanced tools** — raw task viewer, A2A tester, registry admin (under "Advanced tools" drawer)

---

## Core API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET  | `/health` | Service health |
| POST | `/v1/orchestrate` | Run a task |
| GET  | `/v1/tasks/{task_id}` | Task detail |
| GET  | `/v1/agents` | Registered agents |
| POST | `/v1/api-keys` | Create API key |
| GET  | `/v1/api-keys` | List API keys |
| GET  | `/v1/usage` | Usage summary |
| GET  | `/v1/usage/limits` | Quota limits |
| GET  | `/v1/registry/agents` | Registry agents |

Full interactive docs: `http://localhost:8000/docs`

---

## Environment Variables

Copy `.env.example` to `.env` at the project root and configure:

```env
SECRET_KEY=change-this-in-production
DB_USER=brainit_user
DB_PASSWORD=brainit_password
DB_NAME=brainit_db
APP_ENV=production
```

See `DEPLOYMENT.md` for the complete variable reference.
