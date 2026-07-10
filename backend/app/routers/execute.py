import os
import time
import codecs
import asyncio
import subprocess

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt

from ..config import settings
from ..database import SessionLocal
from ..models import User, Submission, Report
from ..interactive import (
    create_workspace,
    cleanup_workspace,
    prepare_execution,
    build_run_env,
    estimate_memory_kb,
)
from ..ai_service import generate_report

router = APIRouter(tags=["Execute"])

# Wall-clock ceiling for a single interactive session. Generous, since a human may be
# typing input, but bounded so a runaway loop cannot hold a process forever.
MAX_RUNTIME_SECONDS = 120
READ_CHUNK = 4096


def _safe_kill(proc):
    try:
        if proc and proc.poll() is None:
            proc.kill()
    except Exception:
        pass


def _authenticate(token: str):
    """Validate the JWT sent in the WebSocket start frame and return the User (or None)."""
    if not token:
        return None
    db = SessionLocal()
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            return None
        return db.query(User).filter(User.id == user_id).first()
    except JWTError:
        return None
    finally:
        db.close()


def _persist(user_id: str, language: str, code: str, result: dict):
    """
    Save the submission. Returns (db, submission) with the session left OPEN so the caller
    can attach a Report, or (None, None) on failure. Callers that won't add a report must
    close the returned session.
    """
    db = SessionLocal()
    try:
        submission = Submission(
            user_id=user_id,
            language=language,
            code=code,
            status=result["status"],
            output=result["output"],
            error=result["error"],
            execution_time_ms=result["execution_time_ms"],
            memory_usage_kb=result["memory_usage_kb"],
        )
        db.add(submission)
        db.commit()
        db.refresh(submission)
        return db, submission
    except Exception:
        db.rollback()
        db.close()
        return None, None


def _save_report(db, submission, report_data: dict):
    try:
        report = Report(
            submission_id=submission.id,
            engineering_score=report_data["engineering_score"],
            time_complexity=report_data["time_complexity"],
            space_complexity=report_data["space_complexity"],
            complexity_reasoning=report_data["complexity_reasoning"],
            current_approach=report_data["current_approach"],
            optimal_approach=report_data["optimal_approach"],
            optimization_suggestions=report_data["optimization_suggestions"],
            readability_score=report_data["readability_score"],
            maintainability_score=report_data["maintainability_score"],
            best_practices_score=report_data["best_practices_score"],
            code_quality_suggestions=report_data["code_quality_suggestions"],
            bug_analysis=report_data["bug_analysis"],
            edge_cases=report_data["edge_cases"],
            security_issues=report_data["security_issues"],
            concepts_used=report_data["concepts_used"],
            weak_areas=report_data["weak_areas"],
            suggested_topics=report_data["suggested_topics"],
        )
        db.add(report)
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


@router.websocket("/ws/execute")
async def ws_execute(ws: WebSocket):
    await ws.accept()
    workdir = None
    proc = None
    try:
        # 1. Handshake: first frame carries auth + the program to run.
        init = await ws.receive_json()
        if init.get("type") != "start":
            await ws.send_json({"type": "error", "data": "Expected a 'start' message."})
            return

        token = init.get("token", "")
        code = init.get("code", "")
        language = init.get("language", "")
        prefill_stdin = init.get("stdin", "") or ""

        user = _authenticate(token)
        if user is None:
            await ws.send_json({"type": "error", "data": "Authentication failed. Please log in again."})
            return
        if language not in ("c", "cpp", "python", "java"):
            await ws.send_json({"type": "error", "data": f"Unsupported language: {language}"})
            return

        # 2. Compile (if the language needs it).
        await ws.send_json({"type": "status", "phase": "compiling"})
        workdir = create_workspace()
        ok, compile_error, run_argv = prepare_execution(code, language, workdir)

        if not ok:
            result = {
                "status": "Compile Error", "output": "", "error": compile_error,
                "execution_time_ms": 0, "memory_usage_kb": 0,
            }
            db, _sub = _persist(user.id, language, code, result)
            if db:
                db.close()
            await ws.send_json({"type": "compile_error", "data": compile_error})
            await ws.send_json({"type": "exit", "status": "Compile Error", "exit_code": None,
                                "execution_time_ms": 0, "memory_usage_kb": 0, "error": compile_error})
            return

        # 3. Launch with live pipes.
        await ws.send_json({"type": "status", "phase": "running"})
        loop = asyncio.get_running_loop()
        proc = subprocess.Popen(
            run_argv, cwd=workdir, env=build_run_env(),
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            bufsize=0,
        )

        out_q: asyncio.Queue = asyncio.Queue()
        collected: list = []

        def _reader():
            """Thread: forward process output to the asyncio queue the instant it appears."""
            fd = proc.stdout.fileno()
            while True:
                try:
                    chunk = os.read(fd, READ_CHUNK)
                except (OSError, ValueError):
                    break
                if not chunk:
                    break
                loop.call_soon_threadsafe(out_q.put_nowait, chunk)
            loop.call_soon_threadsafe(out_q.put_nowait, None)  # sentinel: stdout closed

        reader_future = loop.run_in_executor(None, _reader)

        def _write_stdin(data: str):
            try:
                proc.stdin.write(data.encode("utf-8"))
                proc.stdin.flush()
            except (BrokenPipeError, OSError, ValueError):
                pass

        async def pump_output():
            decoder = codecs.getincrementaldecoder("utf-8")("replace")
            while True:
                chunk = await out_q.get()
                if chunk is None:
                    break
                text = decoder.decode(chunk)
                if text:
                    collected.append(text)
                    await ws.send_json({"type": "stdout", "data": text})

        async def pump_input():
            """Forward keystrokes from the browser to the process stdin. Ends on disconnect/kill."""
            while True:
                msg = await ws.receive_json()
                mtype = msg.get("type")
                if mtype == "stdin":
                    await loop.run_in_executor(None, _write_stdin, msg.get("data", ""))
                elif mtype == "eof":
                    try:
                        proc.stdin.close()
                    except Exception:
                        pass
                elif mtype == "kill":
                    _safe_kill(proc)
                    return

        start = time.perf_counter()

        # Pre-supplied "Custom Input" box: feed it up front so batch-style programs work
        # without any typing. Interactive typing still works on top of this.
        if prefill_stdin:
            if not prefill_stdin.endswith("\n"):
                prefill_stdin += "\n"
            await loop.run_in_executor(None, _write_stdin, prefill_stdin)

        out_task = asyncio.ensure_future(pump_output())
        in_task = asyncio.ensure_future(pump_input())

        timed_out = False
        disconnected = False

        # React the moment either the process finishes (out_task) or the input side
        # ends (client disconnect / stop), bounded by the wall-clock ceiling.
        done, _pending = await asyncio.wait(
            {out_task, in_task},
            timeout=MAX_RUNTIME_SECONDS,
            return_when=asyncio.FIRST_COMPLETED,
        )

        if not done:
            timed_out = True
            _safe_kill(proc)
        elif in_task in done and out_task not in done:
            # Input side ended before the program did: disconnect (exception) or explicit stop.
            if not in_task.cancelled() and in_task.exception() is not None:
                disconnected = True
            _safe_kill(proc)

        # Drain remaining output to EOF, then clean up the input pump.
        if not in_task.done():
            in_task.cancel()
        try:
            await out_task
        except Exception:
            pass
        try:
            await in_task
        except (asyncio.CancelledError, WebSocketDisconnect, Exception):
            pass
        try:
            await reader_future
        except Exception:
            pass

        return_code = await loop.run_in_executor(None, proc.wait)
        elapsed_ms = int((time.perf_counter() - start) * 1000)

        # 4. Classify.
        full_output = "".join(collected)
        if timed_out:
            status_val = "Timeout"
            error_msg = f"Execution stopped: exceeded the maximum session time of {MAX_RUNTIME_SECONDS} seconds."
        elif return_code == 0:
            status_val = "Success"
            error_msg = ""
        else:
            status_val = "Runtime Error"
            error_msg = f"Process exited with code {return_code}."

        result = {
            "status": status_val, "output": full_output, "error": error_msg,
            "execution_time_ms": elapsed_ms, "memory_usage_kb": estimate_memory_kb(language),
        }

        if disconnected:
            db, _sub = _persist(user.id, language, code, result)
            if db:
                db.close()
            return

        await ws.send_json({
            "type": "exit", "status": status_val, "exit_code": return_code,
            "execution_time_ms": elapsed_ms, "memory_usage_kb": estimate_memory_kb(language),
            "error": error_msg,
        })

        # 5. Persist + multi-agent AI review.
        db, submission = _persist(user.id, language, code, result)
        if submission is None:
            await ws.send_json({"type": "error", "data": "Failed to save submission."})
            return

        await ws.send_json({"type": "status", "phase": "reviewing"})
        report_data = await generate_report(code, language, result)
        _save_report(db, submission, report_data)
        await ws.send_json({"type": "report", "data": report_data})
        await ws.send_json({"type": "done"})

    except WebSocketDisconnect:
        _safe_kill(proc)
    except Exception as e:
        try:
            await ws.send_json({"type": "error", "data": f"Server error: {str(e)}"})
        except Exception:
            pass
    finally:
        _safe_kill(proc)
        if workdir:
            cleanup_workspace(workdir)
        try:
            await ws.close()
        except Exception:
            pass
