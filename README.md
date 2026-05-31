# 🚀 CodeRun AI – AI Online Compiler & Engineering Review Platform

**CodeRun AI** is a production-quality, developer-focused full-stack web application. It functions as an online compiler and a senior engineer AI review platform. Users can write code in C, C++, Python, or Java, run it securely, and instantly receive a detailed multi-agent AI code review explaining complexities, modularity, optimizations, and risks.

---

## 🛠️ Technology Stack

- **Frontend**: React.js, Vite, Tailwind CSS, Monaco Editor, Axios, React Router
- **Backend**: FastAPI, Python
- **Database**: PostgreSQL (via Docker Compose)
- **AI Layer**: Ollama (llama3.2, llama3, or mistral models)
- **Code Execution**: Local subprocess compilers with fallback isolated runtime architecture

---

## 📸 Core Features

1. **Monaco Code Editor**: Complete dark theme VS Code editing experience with syntax highlighting, auto-indentation, and custom stdin input support.
2. **Isolated Execution**: Compiles and executes code safely, capturing performance metrics (runtime in milliseconds and memory usage in MBs).
3. **Multi-Agent AI Review Panel**: Generates structured reports based on 6 expert AI agents:
   - **Complexity Analyzer**: Identifies Time and Space Complexity ($O(N)$, $O(N^2)$, etc.) with loop/recursion details.
   - **Optimization Agent**: Recommends algorithm refactoring (e.g. Brute Force vs Hash Map).
   - **Code Review Agent**: Scores Readability, Maintainability, and Best Practices.
   - **Bug Detection Agent**: Finds boundary leaks, infinite loops, and logical errors.
   - **Security Agent**: Audits unsafe buffer overrides or gets() usage.
   - **Learning Agent**: Provides concepts mapping and learning path roadmaps.
4. **Developer Dashboard**: Visualizes run counts, language shares, overall score improvements, and complexity distribution.
5. **Detailed Run History**: Splitscreen history view allowing you to review source code, outputs, and AI reviews for any past execution.

---

## ⚙️ Setup and Installation

### 1. Prerequisite: Ollama
Ensure you have [Ollama](https://ollama.com) installed and running locally, and pull a compatible model:
```bash
# Pull a coder or standard LLM model
ollama pull llama3.2
```

### 2. Start PostgreSQL Database
Spin up the PostgreSQL container in the root directory:
```bash
docker-compose up -d
```
This runs PostgreSQL on `localhost:5432` with database name `coderun_db`.

### 3. Running the Backend (FastAPI)
Initialize the database tables and start the web server:
```bash
cd backend
# Activate virtual environment
.\venv\Scripts\activate

# Start backend server
python app/main.py
```
The API docs will be active at `http://localhost:8000/api/docs`.

### 4. Running the Frontend (React.js)
Start the Vite developer workspace:
```bash
cd frontend
# Launch development server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 📁 Folder Structure

```
├── backend/                  # FastAPI Backend application
│   ├── app/                  # Main source package
│   │   ├── config.py         # DB, Auth, and Ollama settings
│   │   ├── database.py       # SQL Alchemy configuration
│   │   ├── models.py         # Postgres database models
│   │   ├── runner.py         # Local compilation and run engine
│   │   └── ai_service.py     # Ollama multi-agent AI system
│   └── requirements.txt      # Python package dependencies
├── frontend/                 # React.js Vite Frontend
│   ├── src/
│   │   ├── components/       # Monaco Editor, Navbar, Output, and Report panels
│   │   ├── pages/            # Login, Signup, Workspace, Dashboard, History views
│   │   └── App.jsx           # Routing paths
```
