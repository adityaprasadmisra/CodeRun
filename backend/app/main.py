from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import auth, submission, analytics, execute

# Initialize database tables on startup (no migrations needed for simple dev)
try:
    Base.metadata.create_all(bind=engine)
    print("Database tables initialized successfully.")
except Exception as e:
    print(f"Warning: Database connection / initialization failed. Ensure Postgres is running. Error: {e}")

app = FastAPI(
    title="CodeRun AI API",
    description="Backend services for compilation execution and multi-agent AI code reviews",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json"
)

# Enable CORS for frontend requests (typically localhost:5173 for Vite React)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development, allow all. In production, restrict to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API endpoints (prefix all with /api)
app.include_router(auth.router, prefix="/api")
app.include_router(submission.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(execute.router, prefix="/api")  # WebSocket: /api/ws/execute (interactive runs)

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "CodeRun AI Backend"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
