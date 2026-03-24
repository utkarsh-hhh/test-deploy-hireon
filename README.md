# HireOn — AI-Powered Recruitment Platform

## Stack
- **Backend**: FastAPI + SQLAlchemy 2.0 async + PostgreSQL + Google Gemini
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **AI**: Google Gemini 2.0 Flash (parsing) + text-embedding-004 (scoring) — FREE
- **Email**: Gmail SMTP (console fallback)
- **Storage**: Local filesystem

---

## Quick Start

### 1. Prerequisites
- Python 3.12+
- Node.js 18+
- PostgreSQL (pgAdmin already installed ✓)
- Google Gemini API key → https://aistudio.google.com

### 2. Backend Setup

```bash
cd hireon-backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate          # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env: set DATABASE_URL, GEMINI_API_KEY

# Create database in pgAdmin: hireon_db

# Run migrations (creates all 12 tables)
alembic upgrade head

# Seed demo data
python seed.py

# Start server
uvicorn app.main:app --reload --port 8000
# → http://localhost:8000/docs
```

### 3. Frontend Setup

```bash
cd hireon-frontend

npm install
npm run dev
# → http://localhost:5173
```

The Vite dev server proxies all `/v1/*` calls to `localhost:8000` automatically.

---


## Features Built

### Recruiter / Admin
- Dashboard with KPI analytics
- Job management (create, edit, delete)
- Resume upload → AI parsing (Gemini)
- Candidate profiles with AI match scoring
- Drag-and-drop Kanban pipeline
- Interview scheduling with auto Meet link
- Offer letter generation + PDF
- Analytics (funnel, score distribution, interviewer performance)
- Talent pool with tag filtering
- Team management (admin only)
- Audit logs (admin only)

### Interviewer
- My interviews dashboard
- Scorecard submission

### Candidate Portal
- View applications & pipeline stage
- View scheduled interviews with Meet links
- Accept / decline offers

---

## API Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## Project Structure

```
hireon/
├── hireon-backend/          # FastAPI application (65 Python files)
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── dependencies.py
│   │   ├── models/          # 10 SQLAlchemy models
│   │   ├── schemas/         # 10 Pydantic v2 schemas
│   │   ├── routers/         # 17 FastAPI routers
│   │   ├── services/        # 8 service files (AI, email, storage...)
│   │   ├── websocket/       # Real-time notification manager
│   │   └── middleware/      # Audit + tenant middleware
│   ├── alembic/             # DB migrations
│   ├── uploads/             # Local file storage
│   ├── requirements.txt
│   └── seed.py
└── hireon-frontend/         # React application (73 TS/TSX files)
    └── src/
        ├── api/             # 16 API modules
        ├── store/           # Zustand stores (auth, notifications)
        ├── hooks/           # useAuth, useWebSocket, useNotifications
        ├── components/      # UI + layout + kanban + charts
        └── pages/           # 22 pages across all roles
```
