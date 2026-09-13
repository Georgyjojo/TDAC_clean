# TDAC

A geotechnical data platform with a FastAPI backend and a React (Vite) frontend.

```
tdac-new-app/
├── client/   → React 19 + Vite frontend (JS/JSX, with the console pages in TypeScript)
├── server/   → FastAPI + asyncpg backend (PostgreSQL)
└── README.md
```

## 1. Prerequisites

- **Python 3.10+** — check with `python --version` (any OS)
- **Node.js 18+** — check with `node --version` (any OS)
- **PostgreSQL 14+** — running locally with the `ags42_data` database created

---

## 2. Backend setup (server/)

### Step 1 — Create a virtual environment

Run this **inside the `server/` folder**.

**Linux / macOS:**
```bash
cd server
python3 -m venv venv
```

**Windows (PowerShell):**
```powershell
cd server
python -m venv venv
```

**Windows (CMD):**
```cmd
cd server
python -m venv venv
```

### Step 2 — Activate the virtual environment

| OS / Shell              | Command                          |
|-------------------------|----------------------------------|
| Linux / macOS (bash/zsh)| `source venv/bin/activate`       |
| Windows (PowerShell)    | `.\venv\Scripts\Activate.ps1`    |
| Windows (CMD)           | `.\venv\Scripts\activate.bat`    |
| Windows (Git Bash)      | `source venv/Scripts/activate`   |

> PowerShell may block the activate script. If it does, run:
> `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
> and try again. You only do this once per machine.

Your prompt now shows `(venv)` — everything after this installs inside it.

### Step 3 — Install dependencies

```bash
pip install -r requirements.txt
```

### Step 4 — Configure the database

The connection lives in `server/app/database.py`. Update it to match your local PostgreSQL (host, port, database name, user, password). Make sure the `ags42_data` database exists before starting.

### Step 5 — Run the backend

```bash
uvicorn app.main:app --reload --port 5000
```

- API root: http://localhost:5000
- Health check: http://localhost:5000/api/testdb
- Auto docs: http://localhost:5000/docs

To **deactivate** the venv later, just run `deactivate`.

---

## 3. Frontend setup (client/)

Open a **new terminal**.

```bash
cd client
npm install
npm run dev
```

The app runs at the URL Vite prints (default http://localhost:5173).

---

## 4. Quick start (both together)

**Terminal 1 — backend:**
```bash
cd server
source venv/bin/activate        # Windows: .\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 5000
```

**Terminal 2 — frontend:**
```bash
cd client
npm install
npm run dev
```

---

## 5. Useful commands

| Where   | Command           | What it does                    |
|---------|-------------------|---------------------------------|
| client/ | `npm run dev`     | Start the dev server            |
| client/ | `npm run build`   | Production build                |
| client/ | `npm run lint`    | Lint with oxlint                |
| client/ | `npx vite-node smoke-modal.test.mjs` | Runtime UI smoke (Add Project + Topbar) |
| client/ | `npx vite-node smoke-workspace.test.mjs` | Runtime UI smoke (workspace tabs) |
| client/ | `npx vite-node smoke-fielddata.test.mjs` | Static render smoke (workspace panels) |
| server/ | `python -m pytest` | Run the backend test suite |
| server/ | `python app/create_admin.py` | Create an admin user (venv active, DB connected) |
