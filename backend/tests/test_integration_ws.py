"""
Integration tests for the interactive WebSocket endpoint /api/ws/execute.

Drives the full live pipeline: compile -> spawn -> stream stdout -> feed stdin ->
exit -> persist -> (stubbed) AI review. Ollama is stubbed via `fast_ai`.
"""
import pytest
from starlette.websockets import WebSocketDisconnect

pytestmark = pytest.mark.integration


def _drain(ws, on_running=None, max_msgs=200):
    """
    Collect messages until 'done' or the socket closes. Calls on_running() the first
    time a 'running' status arrives (used to send interactive input). Returns a dict of
    {stdout, exit, report, compile_error, error, done}.
    """
    collected = {"stdout": "", "exit": None, "report": None,
                 "compile_error": None, "error": None, "done": False}
    fired = False
    for _ in range(max_msgs):
        try:
            msg = ws.receive_json()
        except WebSocketDisconnect:
            break
        t = msg.get("type")
        if t == "status" and msg.get("phase") == "running" and not fired:
            fired = True
            if on_running:
                on_running(ws)
        elif t == "stdout":
            collected["stdout"] += msg["data"]
        elif t == "exit":
            collected["exit"] = msg
        elif t == "report":
            collected["report"] = msg["data"]
        elif t == "compile_error":
            collected["compile_error"] = msg["data"]
        elif t == "error":
            collected["error"] = msg["data"]
            break
        elif t == "done":
            collected["done"] = True
            break
    return collected


def test_ws_python_interactive_input(client, auth, fast_ai):
    _, _, token = auth
    code = "a = int(input())\nb = int(input())\nprint(a + b)"

    with client.websocket_connect("/api/ws/execute") as ws:
        ws.send_json({"type": "start", "token": token, "code": code, "language": "python"})

        def send_inputs(sock):
            sock.send_json({"type": "stdin", "data": "3\n"})
            sock.send_json({"type": "stdin", "data": "4\n"})

        result = _drain(ws, on_running=send_inputs)

    assert result["exit"] is not None
    assert result["exit"]["status"] == "Success"
    assert "7" in result["stdout"]
    assert result["report"] is not None
    assert result["report"]["engineering_score"] == 88
    assert result["done"] is True


def test_ws_cpp_interactive_input(client, auth, fast_ai):
    _, _, token = auth
    code = ("#include <iostream>\nusing namespace std;\n"
            "int main(){ int n; cin >> n; cout << \"got \" << n << endl; return 0; }")

    with client.websocket_connect("/api/ws/execute") as ws:
        ws.send_json({"type": "start", "token": token, "code": code, "language": "cpp"})
        result = _drain(ws, on_running=lambda s: s.send_json({"type": "stdin", "data": "99\n"}))

    assert result["exit"]["status"] == "Success"
    assert "got 99" in result["stdout"]
    assert result["report"]["engineering_score"] == 88


def test_ws_prefilled_stdin(client, auth, fast_ai):
    """The pre-supplied Custom Input box (stdin field) should feed the program at launch."""
    _, _, token = auth
    code = "print(input().upper())"
    with client.websocket_connect("/api/ws/execute") as ws:
        ws.send_json({"type": "start", "token": token, "code": code,
                      "language": "python", "stdin": "hello"})
        result = _drain(ws)
    assert result["exit"]["status"] == "Success"
    assert "HELLO" in result["stdout"]


def test_ws_compile_error(client, auth, fast_ai):
    _, _, token = auth
    with client.websocket_connect("/api/ws/execute") as ws:
        ws.send_json({"type": "start", "token": token,
                      "code": "int main(){ broken; }", "language": "cpp"})
        result = _drain(ws)

    assert result["compile_error"] is not None
    assert "error" in result["compile_error"].lower()
    assert result["exit"]["status"] == "Compile Error"
    assert result["report"] is None  # no review for a compile failure


def test_ws_runtime_error_nonzero_exit(client, auth, fast_ai):
    _, _, token = auth
    code = "import sys\nsys.exit(3)"
    with client.websocket_connect("/api/ws/execute") as ws:
        ws.send_json({"type": "start", "token": token, "code": code, "language": "python"})
        result = _drain(ws)
    assert result["exit"]["status"] == "Runtime Error"
    assert result["exit"]["exit_code"] == 3


def test_ws_rejects_bad_token(client):
    with client.websocket_connect("/api/ws/execute") as ws:
        ws.send_json({"type": "start", "token": "not-a-valid-token",
                      "code": "print(1)", "language": "python"})
        result = _drain(ws)
    assert result["error"] is not None
    assert "authentication" in result["error"].lower()


def test_ws_rejects_unsupported_language(client, auth):
    _, _, token = auth
    with client.websocket_connect("/api/ws/execute") as ws:
        ws.send_json({"type": "start", "token": token, "code": "x", "language": "ruby"})
        result = _drain(ws)
    assert result["error"] is not None
    assert "unsupported" in result["error"].lower()
