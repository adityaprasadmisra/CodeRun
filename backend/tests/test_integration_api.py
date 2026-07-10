"""
Integration tests for the REST API: auth, submissions, history, dashboard.

Uses the live Postgres DB. Ollama is stubbed via the `fast_ai` fixture so these run
in well under a second each while still exercising routing, auth, DB persistence,
and the report-saving path.
"""
import pytest

pytestmark = pytest.mark.integration


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"


def test_signup_returns_token(client, unique_user):
    r = client.post("/api/auth/signup", json=unique_user)
    assert r.status_code in (200, 201), r.text
    body = r.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_duplicate_signup_rejected(client, unique_user):
    assert client.post("/api/auth/signup", json=unique_user).status_code in (200, 201)
    dup = client.post("/api/auth/signup", json=unique_user)
    assert dup.status_code == 400
    assert "already exists" in dup.json()["detail"].lower()


def test_signup_validation_rejects_bad_email(client):
    r = client.post("/api/auth/signup", json={"name": "X", "email": "not-an-email", "password": "secret123"})
    assert r.status_code == 422  # pydantic EmailStr validation


def test_login_success_and_wrong_password(client, unique_user):
    client.post("/api/auth/signup", json=unique_user)

    ok = client.post("/api/auth/login", json={"email": unique_user["email"], "password": unique_user["password"]})
    assert ok.status_code == 200 and ok.json()["access_token"]

    bad = client.post("/api/auth/login", json={"email": unique_user["email"], "password": "wrong"})
    assert bad.status_code == 401


def test_me_requires_authentication(client):
    assert client.get("/api/auth/me").status_code == 401


def test_me_returns_current_user(client, auth):
    headers, user, _ = auth
    r = client.get("/api/auth/me", headers=headers)
    assert r.status_code == 200
    assert r.json()["email"] == user["email"]


def test_submissions_require_auth(client):
    r = client.post("/api/submissions", json={"code": "print(1)", "language": "python"})
    assert r.status_code == 401


def test_submit_python_success_with_report(client, auth, fast_ai):
    headers, _, _ = auth
    r = client.post("/api/submissions",
                    json={"code": "print(sum(int(x) for x in input().split()))",
                          "language": "python", "stdin": "1 2 3 4 5"},
                    headers=headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["status"] == "Success"
    assert data["output"].strip() == "15"
    assert data["report"] is not None
    assert data["report"]["engineering_score"] == 88  # from the stub


def test_submit_compile_error_has_no_report(client, auth, fast_ai):
    headers, _, _ = auth
    r = client.post("/api/submissions",
                    json={"code": "int main(){ broken_symbol; }", "language": "cpp"},
                    headers=headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["status"] == "Compile Error"
    assert data["report"] is None


def test_submit_rejects_invalid_language(client, auth, fast_ai):
    headers, _, _ = auth
    r = client.post("/api/submissions", json={"code": "x", "language": "ruby"}, headers=headers)
    assert r.status_code == 422  # schema pattern ^(c|cpp|python|java)$


def test_history_and_detail(client, auth, fast_ai):
    headers, _, _ = auth
    created = client.post("/api/submissions",
                          json={"code": "print('hi')", "language": "python"}, headers=headers)
    assert created.status_code == 200
    sub_id = created.json()["id"]

    history = client.get("/api/submissions", headers=headers)
    assert history.status_code == 200
    ids = [row["id"] for row in history.json()]
    assert sub_id in ids

    detail = client.get(f"/api/submissions/{sub_id}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["code"] == "print('hi')"


def test_dashboard_reflects_submissions(client, auth, fast_ai):
    headers, _, _ = auth
    # Fresh user starts empty.
    empty = client.get("/api/dashboard", headers=headers)
    assert empty.status_code == 200 and empty.json()["total_runs"] == 0

    client.post("/api/submissions", json={"code": "print(1)", "language": "python"}, headers=headers)
    after = client.get("/api/dashboard", headers=headers).json()
    assert after["total_runs"] == 1
    assert after["languages_used"].get("python") == 1
    assert after["average_engineering_score"] == 88


def test_cannot_read_other_users_submission(client, fast_ai):
    # User A creates a submission.
    import uuid
    a = {"name": "Alice", "email": f"a_{uuid.uuid4().hex[:8]}@x.com", "password": "secret123"}
    b = {"name": "Bob", "email": f"b_{uuid.uuid4().hex[:8]}@x.com", "password": "secret123"}
    ta = client.post("/api/auth/signup", json=a).json()["access_token"]
    tb = client.post("/api/auth/signup", json=b).json()["access_token"]
    ha = {"Authorization": f"Bearer {ta}"}
    hb = {"Authorization": f"Bearer {tb}"}

    sub_id = client.post("/api/submissions", json={"code": "print(1)", "language": "python"},
                         headers=ha).json()["id"]
    # User B must not be able to read it.
    assert client.get(f"/api/submissions/{sub_id}", headers=hb).status_code == 404
