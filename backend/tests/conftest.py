"""
Shared fixtures for the CodeRun AI backend test suite.

Runs against the live Postgres + FastAPI app. AI (Ollama) calls are stubbed by the
`fast_ai` fixture for API/WS integration tests so they don't take ~45s each; a small
number of `@pytest.mark.slow` tests exercise the real LLM separately.
"""
import os
import sys
import uuid

import pytest
from fastapi.testclient import TestClient

# Make the `app` package importable when running `pytest` from the backend directory.
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.main import app  # noqa: E402


def make_fake_report(score: int = 88) -> dict:
    """A complete, schema-valid AI report used to stub out Ollama during integration tests."""
    return {
        "engineering_score": score,
        "time_complexity": "O(N)",
        "space_complexity": "O(1)",
        "complexity_reasoning": "Stubbed report for tests.",
        "current_approach": "Iterative",
        "optimal_approach": "Iterative",
        "optimization_suggestions": [],
        "readability_score": 90,
        "maintainability_score": 85,
        "best_practices_score": 80,
        "code_quality_suggestions": [],
        "bug_analysis": "None detected.",
        "edge_cases": "None.",
        "security_issues": "None.",
        "concepts_used": ["loops"],
        "weak_areas": [],
        "suggested_topics": [],
    }


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def unique_user():
    uid = uuid.uuid4().hex[:10]
    return {"name": f"Tester {uid}", "email": f"test_{uid}@example.com", "password": "secret123"}


@pytest.fixture
def auth(client, unique_user):
    """Signs up a fresh user and returns (headers, user_dict, token)."""
    r = client.post("/api/auth/signup", json=unique_user)
    assert r.status_code in (200, 201), r.text
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}, unique_user, token


@pytest.fixture
def fast_ai(monkeypatch):
    """Replace the real Ollama-backed generate_report with an instant stub everywhere it's used."""
    async def _stub(code, language, runner_result):
        return make_fake_report()

    import app.routers.submission as submission_mod
    import app.routers.execute as execute_mod
    monkeypatch.setattr(submission_mod, "generate_report", _stub)
    monkeypatch.setattr(execute_mod, "generate_report", _stub)
    return _stub
