"""
Unit tests for app.runner — the batch execution engine.

Compiled languages are tested via run_locally() directly so results don't depend on
whether the Docker daemon is reachable from the Python SDK on this host. Python goes
through the public run_code() entrypoint.
"""
import pytest

from app.runner import run_code, run_locally


def test_python_success_reads_stdin():
    code = "n = int(input())\nprint(n * n)"
    res = run_code(code, "python", "6")
    assert res["status"] == "Success"
    assert res["output"].strip() == "36"
    assert res["error"] == ""
    assert res["execution_time_ms"] >= 0


def test_python_runtime_error_is_captured():
    res = run_code("raise ValueError('boom')", "python", "")
    assert res["status"] == "Runtime Error"
    assert "boom" in res["error"] or "ValueError" in res["error"]


def test_cpp_success_local():
    code = ("#include <iostream>\nusing namespace std;\n"
            "int main(){ int n; cin >> n; cout << n + 1; return 0; }")
    res = run_locally(code, "cpp", "41")
    assert res["status"] == "Success"
    assert res["output"].strip() == "42"


def test_cpp_compile_error_local():
    res = run_locally("int main(){ undeclared_symbol; }", "cpp", "")
    assert res["status"] == "Compile Error"
    assert res["error"].strip() != ""


def test_c_success_local():
    code = "#include <stdio.h>\nint main(){ int n; scanf(\"%d\", &n); printf(\"%d\", n*2); return 0; }"
    res = run_locally(code, "c", "10")
    assert res["status"] == "Success"
    assert res["output"].strip() == "20"


def test_java_success_local():
    code = ("import java.util.*; public class Main { public static void main(String[] a){"
            " Scanner s = new Scanner(System.in); int n = s.nextInt(); System.out.print(n-1); } }")
    res = run_locally(code, "java", "8")
    assert res["status"] == "Success"
    assert res["output"].strip() == "7"


@pytest.mark.slow
def test_python_timeout_local():
    # Infinite loop should be killed by the 5s guard and reported as Timeout.
    res = run_locally("while True: pass", "python", "")
    assert res["status"] == "Timeout"
    assert "timed out" in res["error"].lower()
