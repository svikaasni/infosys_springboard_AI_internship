# How to Run BugSense AI Locally from ZIP

This project is a full-stack **Intelligent Bug Diagnosis Platform** consisting of:
- **Backend**: FastAPI + SQLAlchemy (SQLite database) + Multi-Agent AI Engine + RAG Vector Store.
- **Frontend**: React 18 + Vite + Tailwind CSS.

---

## 📋 Prerequisites

Before running, ensure your computer has:
1. **Python 3.10, 3.11, or 3.12+**: Download from [python.org](https://www.python.org/downloads/)
   - *Windows Note: Check the box **"Add Python to PATH"** during installation.*
2. **Node.js 18 or 20+**: Download from [nodejs.org](https://nodejs.org/)

---

## ⚡ Quick Start (Windows)

### Option A: 1-Click Launch (Recommended)
1. Unzip the project folder.
2. In the project root folder, double-click:
   ```cmd
   start_all.bat
   ```
   *This automatically checks dependencies, creates `backend\venv`, installs required packages if needed, and launches both Backend and Frontend in two separate Command Prompt windows.*
3. Open your browser and go to: **[http://localhost:5173](http://localhost:5173)**

---

### Option B: First-Time Full Setup (Optional)
If you prefer to install all packages up front:
1. Double-click `setup.bat` (installs both Python packages in `backend\venv` and npm packages in `frontend\node_modules`).
2. Once complete, double-click `start_all.bat`.

---

### Option C: Manual Command Prompt Execution

If you prefer to run commands manually in Command Prompt (`cmd.exe`):

#### 1. Start the Backend (Terminal 1)
```cmd
cd smart-bug-analyzer\backend

:: Create and activate virtual environment
python -m venv venv
call venv\Scripts\activate.bat

:: Install dependencies (only needed the first time)
pip install -r requirements.txt

:: Start FastAPI server
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

#### 2. Start the Frontend (Terminal 2)
```cmd
cd smart-bug-analyzer\frontend

:: Install node modules (only needed the first time)
npm install

:: Start Vite development server
npm run dev
```

---

## 🍎 Quick Start (macOS / Linux)

1. Open terminal in the project directory:
   ```bash
   chmod +x setup.sh start_all.sh
   ./setup.sh
   ./start_all.sh
   ```
2. Open **[http://localhost:5173](http://localhost:5173)**

---

## 🌐 URLs & Ports

| Service | URL | Description |
|---|---|---|
| **Frontend Web App** | `http://localhost:5173` | Main interactive UI |
| **Neural Sandbox** | `http://localhost:5173/neural-sandbox` | Live particle grid & glitch purge |
| **Developer Terminal** | `http://localhost:5173/terminal` | In-browser CLI shell |
| **Backend API Health** | `http://127.0.0.1:8000/api/health` | Healthcheck endpoint |
| **Interactive API Docs** | `http://127.0.0.1:8000/docs` | Swagger interactive API documentation |

---

## 👤 Creating an Account & Roles

- Click **"Create account"** on the login page or navigate directly to `http://localhost:5173/register`.
- Enter your Name, Email, and Password (at least 8 characters).
- **First User Rule**: The very first account registered on the database automatically receives the **Admin** role with full access to the Control Center.
- Subsequent registered users receive the standard **Developer** role.

---

## 🛠️ Troubleshooting

- **"Cannot connect to backend server"**:
  Make sure the backend terminal window is open and showing `Uvicorn running on http://127.0.0.1:8000`.
- **Database migrations**:
  SQLite database schema migrations for new columns (including `users.organization`, `users.status`, `code_diff`, `ai_model`, etc.) run automatically on backend startup. No manual SQL commands required.
