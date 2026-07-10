import os
import uuid
import shutil
import subprocess
from typing import Dict, List, Optional, Tuple

# Reuse the same scratch workspace as the batch runner
SCRATCH_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "scratch")
SCRATCH_DIR = os.path.abspath(SCRATCH_DIR)
os.makedirs(SCRATCH_DIR, exist_ok=True)

# Languages that must be compiled before running
_COMPILED = {"c", "cpp", "java"}


def create_workspace() -> str:
    """Create an isolated temporary directory for a single interactive run."""
    run_id = uuid.uuid4().hex
    workdir = os.path.join(SCRATCH_DIR, f"session_{run_id}")
    os.makedirs(workdir, exist_ok=True)
    return workdir


def cleanup_workspace(workdir: str) -> None:
    try:
        shutil.rmtree(workdir)
    except Exception:
        pass


def _python_executable() -> str:
    return "python" if os.name == "nt" else "python3"


def prepare_execution(code: str, language: str, workdir: str) -> Tuple[bool, str, Optional[List[str]]]:
    """
    Writes the source file and, for compiled languages, compiles it.

    Returns a tuple: (ok, error_message, run_argv)
      - ok=False  => compilation failed; error_message holds the compiler output.
      - ok=True   => run_argv is the command list to launch the program interactively.

    A generic, language-agnostic contract: every supported language funnels
    through the same interface so the WebSocket layer never special-cases a language.
    """
    if language == "python":
        code_file = os.path.join(workdir, "main.py")
        with open(code_file, "w", encoding="utf-8") as f:
            f.write(code)
        # -u disables buffering so prompts/output stream to the terminal immediately.
        return True, "", [_python_executable(), "-u", "main.py"]

    if language in ("c", "cpp"):
        ext = "cpp" if language == "cpp" else "c"
        compiler = "g++" if language == "cpp" else "gcc"
        code_file = os.path.join(workdir, f"main.{ext}")
        exe_name = "program.exe" if os.name == "nt" else "program"
        with open(code_file, "w", encoding="utf-8") as f:
            f.write(code)

        try:
            compile_proc = subprocess.run(
                [compiler, f"main.{ext}", "-O2", "-o", exe_name],
                cwd=workdir,
                capture_output=True,
                text=True,
                timeout=20,
            )
        except FileNotFoundError:
            return False, f"Compiler '{compiler}' not found on the server host.", None
        except subprocess.TimeoutExpired:
            return False, "Compilation timed out (limit: 20 seconds).", None

        if compile_proc.returncode != 0:
            return False, compile_proc.stderr or "Compilation failed.", None

        # Absolute path: Windows resolves a bare program name against the parent's
        # directory, not the child's cwd, so the binary must be fully qualified.
        run_target = os.path.join(workdir, exe_name)
        return True, "", [run_target]

    if language == "java":
        code_file = os.path.join(workdir, "Main.java")
        with open(code_file, "w", encoding="utf-8") as f:
            f.write(code)

        try:
            compile_proc = subprocess.run(
                ["javac", "Main.java"],
                cwd=workdir,
                capture_output=True,
                text=True,
                timeout=30,
            )
        except FileNotFoundError:
            return False, "Java compiler 'javac' not found on the server host.", None
        except subprocess.TimeoutExpired:
            return False, "Compilation timed out (limit: 30 seconds).", None

        if compile_proc.returncode != 0:
            return False, compile_proc.stderr or "Compilation failed.", None

        return True, "", ["java", "Main"]

    return False, f"Unsupported language: {language}", None


def build_run_env() -> Dict[str, str]:
    """Environment for the child process: force unbuffered Python output."""
    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"
    return env


def estimate_memory_kb(language: str) -> int:
    """Baseline memory estimate (real cgroup metrics are not available in local mode)."""
    if language == "java":
        return 32 * 1024
    if language == "python":
        return 8 * 1024
    return 1536
