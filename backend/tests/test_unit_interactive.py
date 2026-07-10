"""Unit tests for app.interactive — workspace, compilation, and helper functions."""
import os

import pytest

from app import interactive


def test_estimate_memory_kb_per_language():
    assert interactive.estimate_memory_kb("java") == 32 * 1024
    assert interactive.estimate_memory_kb("python") == 8 * 1024
    assert interactive.estimate_memory_kb("cpp") == 1536
    assert interactive.estimate_memory_kb("c") == 1536


def test_build_run_env_is_unbuffered():
    env = interactive.build_run_env()
    assert env["PYTHONUNBUFFERED"] == "1"
    # Should be a copy of the real environment, not a bare dict.
    assert "PATH" in env or "Path" in env


def test_create_and_cleanup_workspace():
    wd = interactive.create_workspace()
    try:
        assert os.path.isdir(wd)
        assert wd.startswith(interactive.SCRATCH_DIR)
    finally:
        interactive.cleanup_workspace(wd)
    assert not os.path.exists(wd)


def test_cleanup_is_idempotent():
    wd = interactive.create_workspace()
    interactive.cleanup_workspace(wd)
    interactive.cleanup_workspace(wd)  # second call must not raise


@pytest.fixture
def workspace():
    wd = interactive.create_workspace()
    yield wd
    interactive.cleanup_workspace(wd)


def test_prepare_python_returns_unbuffered_argv(workspace):
    ok, err, argv = interactive.prepare_execution("print('hi')", "python", workspace)
    assert ok is True and err == ""
    assert "-u" in argv and any(a.endswith("main.py") for a in argv)
    assert os.path.exists(os.path.join(workspace, "main.py"))


def test_prepare_cpp_success_produces_binary(workspace):
    code = "#include <iostream>\nint main(){ std::cout << 1; return 0; }"
    ok, err, argv = interactive.prepare_execution(code, "cpp", workspace)
    assert ok is True, err
    assert argv and os.path.isabs(argv[0])       # absolute path to the compiled exe
    assert os.path.exists(argv[0])


def test_prepare_cpp_compile_error_reports_message(workspace):
    ok, err, argv = interactive.prepare_execution("int main(){ nope; }", "cpp", workspace)
    assert ok is False
    assert argv is None
    assert "error" in err.lower()


def test_prepare_java_success(workspace):
    code = "public class Main { public static void main(String[] a){ System.out.print(1); } }"
    ok, err, argv = interactive.prepare_execution(code, "java", workspace)
    assert ok is True, err
    assert argv == ["java", "Main"]
    assert os.path.exists(os.path.join(workspace, "Main.class"))


def test_prepare_unsupported_language(workspace):
    ok, err, argv = interactive.prepare_execution("x", "ruby", workspace)
    assert ok is False and argv is None
    assert "unsupported" in err.lower()
