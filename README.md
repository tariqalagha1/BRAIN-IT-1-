# ClinicalMind

ClinicalMind is a full-stack clinical operations starter app:

- Backend: FastAPI, JWT auth, SQLite
- Frontend: Next.js App Router, responsive dashboard UI

## Local setup

### Backend

1. Copy `.env.example` to `.env` in `backend/`.
2. Install dependencies:
   - `pip install -r requirements.txt`
3. Run:
   - `uvicorn app.main:app --reload`

### Frontend

1. Copy `.env.example` to `.env` in `frontend/`.
2. Install dependencies:
   - `npm install`
3. Run:
   - `npm run dev`

## Core routes

- `/login`
- `/register`
- `/dashboard`
- `/billing`
- `/admin`

## API routes

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/dashboard/summary`
- `GET /api/billing/summary`
- `GET /api/admin/summary` (admin only)
