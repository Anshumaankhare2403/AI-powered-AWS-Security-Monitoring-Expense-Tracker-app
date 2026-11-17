# Expense Tracker Web Application (Full-Stack)

A modern, production-quality Expense Tracker application built with **React 19**, **Vite**, **Tailwind CSS**, **FastAPI**, **SQLAlchemy 2.0**, and **MySQL 8.0**.

---

## Architecture Overview

```
expense-tracker/
    frontend/                 # React 19 + Vite + Tailwind CSS + Lucide Icons + Recharts
        src/
            components/       # UI Components & widgets
            pages/            # Dashboard, Transactions, Budgets, Analytics, Goals, Settings
            layouts/          # Sidebar, Navbar, AppShell
            hooks/            # Custom React hooks
            services/         # Axios API clients
            context/          # Auth & Theme context
            utils/            # Formatters & helpers
        public/
        package.json
        vite.config.js

    backend/                  # Python FastAPI Backend
        app/
            api/              # REST Endpoints (Auth, Transactions, Categories, Budgets, Goals, Reports)
            core/             # Config, Security, JWT
            models/           # SQLAlchemy 2.0 Relational Models
            schemas/          # Pydantic Request/Response Validation Schemas
            services/         # Business logic layer
            database/         # Engine, SessionLocal, DB Seeder
            main.py           # FastAPI entrypoint
        tests/                # Automated Pytest suite
        requirements.txt      # Pinned Python dependencies
        alembic/              # Alembic database migrations

    database/
        schema.sql            # MySQL 8.0 Relational DDL
        mysqldata/            # Dedicated local MySQL 8.0 storage

    docs/
        API_DOCUMENTATION.md  # Comprehensive API reference
        DATABASE_DESIGN.md    # Relational architecture & ER diagram
        TESTING_REPORT.md     # QA & Automated testing results

    docker-compose.yml        # Multi-container orchestration (MySQL, Backend, Frontend)
    .env.example              # Environment variables template
    README.md                 # Setup & running instructions
    AGENT_LOG.md              # Milestone progress log
```

---

## Prerequisites

- **Python 3.11+**
- **Node.js 18+ & npm**
- **MySQL 8.0** (or Docker)

---

## Quick Start (Local Development)

### 1. Database (MySQL 8)
A dedicated MySQL 8 instance runs on port `3307`:
```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" --datadir="database\mysqldata" --port=3307 --console
```
*Credentials: Host: `localhost:3307`, User: `tracker`, Password: `trackerpass`, Database: `expensetracker`*

### 2. Backend (FastAPI)
```powershell
cd backend
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe -m app.database.init_db
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- API Documentation (Swagger): `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

### 3. Frontend (React + Vite)
```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```
- Access application: `http://localhost:5173`

### 4. Running Backend Tests
```powershell
cd backend
.\venv\Scripts\python.exe -m pytest -v
```

---

## Docker Compose Setup
```bash
docker-compose up --build
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- MySQL: Port `3307`
