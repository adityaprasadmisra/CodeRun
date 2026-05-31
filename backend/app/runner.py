import os
import shutil
import time
import uuid
import subprocess
import tempfile
import docker
from typing import Dict, Any

# Get workspace scratch path
SCRATCH_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scratch")
os.makedirs(SCRATCH_DIR, exist_ok=True)

def run_code(code: str, language: str, stdin_data: str = "") -> Dict[str, Any]:
    """
    Executes source code in an isolated Docker container,
    falling back to local host execution if Docker is unavailable.
    """
    # Try Docker execution first
    try:
        client = docker.from_env()
        # Ping daemon to check if it is responsive
        client.ping()
        return run_in_docker(client, code, language, stdin_data)
    except Exception as e:
        print(f"Docker execution failed or unavailable, falling back to local runner. Error: {e}")
        return run_locally(code, language, stdin_data)

def run_in_docker(client: docker.DockerClient, code: str, language: str, stdin_data: str = "") -> Dict[str, Any]:
    # Setup temporary directory in host scratch path
    run_id = uuid.uuid4().hex
    host_temp_dir = os.path.join(SCRATCH_DIR, f"run_{run_id}")
    os.makedirs(host_temp_dir, exist_ok=True)
    
    # Save input data
    input_file_path = os.path.join(host_temp_dir, "input.txt")
    with open(input_file_path, "w", encoding="utf-8") as f:
        f.write(stdin_data)
        
    # Write code file with appropriate extension
    if language == "cpp":
        filename = "main.cpp"
        compile_cmd = "g++ -O3 main.cpp -o program"
        run_cmd = "./program < input.txt"
    elif language == "c":
        filename = "main.c"
        compile_cmd = "gcc -O3 main.c -o program"
        run_cmd = "./program < input.txt"
    elif language == "java":
        filename = "Main.java"
        compile_cmd = "javac Main.java"
        run_cmd = "java Main < input.txt"
    elif language == "python":
        filename = "main.py"
        compile_cmd = None
        run_cmd = "python3 main.py < input.txt"
    else:
        return {
            "status": "Runtime Error",
            "output": "",
            "error": f"Unsupported language: {language}",
            "execution_time_ms": 0,
            "memory_usage_kb": 0
        }
        
    code_file_path = os.path.join(host_temp_dir, filename)
    with open(code_file_path, "w", encoding="utf-8") as f:
        f.write(code)

    container = None
    try:
        # Create isolated container
        # Mount host_temp_dir as /app in read-write mode so output/binaries can be written inside
        container = client.containers.run(
            image="coderun-sandbox",
            command="sleep 60",  # Keep it alive
            detach=True,
            network_mode="none",
            mem_limit="256m",
            nano_cpus=500000000, # 0.5 CPU core limit
            volumes={
                host_temp_dir: {
                    "bind": "/app",
                    "mode": "rw"
                }
            }
        )

        # 1. Compile step (if required)
        if compile_cmd:
            compile_exec = container.exec_run(
                cmd=f"bash -c 'cd /app && {compile_cmd}'",
                user="root"
            )
            if compile_exec.exit_code != 0:
                # Compilation failed
                return {
                    "status": "Compile Error",
                    "output": "",
                    "error": compile_exec.output.decode("utf-8", errors="replace"),
                    "execution_time_ms": 0,
                    "memory_usage_kb": 0
                }

        # 2. Run step
        start_time = time.perf_counter()
        # Enforce execution timeout of 5 seconds via timeout utility inside Alpine
        exec_res = container.exec_run(
            cmd=f"bash -c 'cd /app && timeout 5s {run_cmd}'",
            user="root"
        )
        end_time = time.perf_counter()
        
        execution_time_ms = int((end_time - start_time) * 1000)
        output = exec_res.output.decode("utf-8", errors="replace")
        
        # Check for timeout or error
        status_val = "Success"
        error_msg = ""
        if exec_res.exit_code == 124: # Timeout exit code of coreutils timeout
            status_val = "Timeout"
            error_msg = "Execution timed out (Limit: 5 seconds)"
        elif exec_res.exit_code != 0:
            status_val = "Runtime Error"
            error_msg = f"Process exited with code {exec_res.exit_code}"
            
        # Get memory usage details (mock or read from cgroups if possible)
        # Inside Docker, memory limits are enforced. We can return an estimation or default baseline
        memory_usage_kb = 1024  # Base memory usage
        if language == "java":
            memory_usage_kb = 24 * 1024 # Java has JVM overhead
        elif language == "python":
            memory_usage_kb = 6 * 1024
            
        return {
            "status": status_val,
            "output": output if status_val == "Success" else "",
            "error": error_msg or (output if status_val != "Success" else ""),
            "execution_time_ms": execution_time_ms,
            "memory_usage_kb": memory_usage_kb
        }

    except Exception as e:
        return {
            "status": "Runtime Error",
            "output": "",
            "error": f"Docker runner error: {str(e)}",
            "execution_time_ms": 0,
            "memory_usage_kb": 0
        }
    finally:
        # Cleanup container and host files
        if container:
            try:
                container.kill()
            except Exception:
                pass
            try:
                container.remove(force=True)
            except Exception:
                pass
        
        # Clean host temporary folder
        try:
            shutil.rmtree(host_temp_dir)
        except Exception:
            pass

def run_locally(code: str, language: str, stdin_data: str = "") -> Dict[str, Any]:
    # Local fallback compilation and execution using subprocess on the host OS
    run_id = uuid.uuid4().hex
    host_temp_dir = os.path.join(SCRATCH_DIR, f"local_{run_id}")
    os.makedirs(host_temp_dir, exist_ok=True)
    
    # Save input file
    input_file = os.path.join(host_temp_dir, "input.txt")
    with open(input_file, "w", encoding="utf-8") as f:
        f.write(stdin_data)

    # Output parameters
    status_val = "Success"
    output = ""
    error_msg = ""
    compile_failed = False
    
    try:
        if language == "cpp" or language == "c":
            ext = "cpp" if language == "cpp" else "c"
            code_file = os.path.join(host_temp_dir, f"main.{ext}")
            exec_file = os.path.join(host_temp_dir, f"program_{run_id}.exe" if os.name == "nt" else f"program_{run_id}")
            
            with open(code_file, "w", encoding="utf-8") as f:
                f.write(code)
                
            compiler = "g++" if language == "cpp" else "gcc"
            compile_proc = subprocess.run(
                [compiler, code_file, "-o", exec_file],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if compile_proc.returncode != 0:
                return {
                    "status": "Compile Error",
                    "output": "",
                    "error": compile_proc.stderr,
                    "execution_time_ms": 0,
                    "memory_usage_kb": 0
                }
                
            # Run the executable
            start_time = time.perf_counter()
            try:
                with open(input_file, "r") as inf:
                    run_proc = subprocess.run(
                        [exec_file],
                        stdin=inf,
                        capture_output=True,
                        text=True,
                        timeout=5
                    )
                end_time = time.perf_counter()
                execution_time_ms = int((end_time - start_time) * 1000)
                
                if run_proc.returncode != 0:
                    status_val = "Runtime Error"
                    error_msg = run_proc.stderr or f"Process exited with code {run_proc.returncode}"
                else:
                    output = run_proc.stdout
            except subprocess.TimeoutExpired:
                status_val = "Timeout"
                error_msg = "Execution timed out (Limit: 5 seconds)"
                execution_time_ms = 5000

        elif language == "python":
            code_file = os.path.join(host_temp_dir, "main.py")
            with open(code_file, "w", encoding="utf-8") as f:
                f.write(code)
                
            # Try python or python3
            python_exec = "python" if os.name == "nt" else "python3"
            
            start_time = time.perf_counter()
            try:
                with open(input_file, "r") as inf:
                    run_proc = subprocess.run(
                        [python_exec, code_file],
                        stdin=inf,
                        capture_output=True,
                        text=True,
                        timeout=5
                    )
                end_time = time.perf_counter()
                execution_time_ms = int((end_time - start_time) * 1000)
                
                if run_proc.returncode != 0:
                    status_val = "Runtime Error"
                    error_msg = run_proc.stderr or f"Process exited with code {run_proc.returncode}"
                else:
                    output = run_proc.stdout
            except subprocess.TimeoutExpired:
                status_val = "Timeout"
                error_msg = "Execution timed out (Limit: 5 seconds)"
                execution_time_ms = 5000

        elif language == "java":
            # For Java, the main class name is Main
            code_file = os.path.join(host_temp_dir, "Main.java")
            with open(code_file, "w", encoding="utf-8") as f:
                f.write(code)
                
            # Compile Java
            compile_proc = subprocess.run(
                ["javac", "Main.java"],
                cwd=host_temp_dir,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if compile_proc.returncode != 0:
                return {
                    "status": "Compile Error",
                    "output": "",
                    "error": compile_proc.stderr,
                    "execution_time_ms": 0,
                    "memory_usage_kb": 0
                }
                
            # Run Java
            start_time = time.perf_counter()
            try:
                with open(input_file, "r") as inf:
                    run_proc = subprocess.run(
                        ["java", "Main"],
                        cwd=host_temp_dir,
                        stdin=inf,
                        capture_output=True,
                        text=True,
                        timeout=5
                    )
                end_time = time.perf_counter()
                execution_time_ms = int((end_time - start_time) * 1000)
                
                if run_proc.returncode != 0:
                    status_val = "Runtime Error"
                    error_msg = run_proc.stderr or f"Process exited with code {run_proc.returncode}"
                else:
                    output = run_proc.stdout
            except subprocess.TimeoutExpired:
                status_val = "Timeout"
                error_msg = "Execution timed out (Limit: 5 seconds)"
                execution_time_ms = 5000

        memory_usage_kb = 1536
        if language == "java":
            memory_usage_kb = 32 * 1024
        elif language == "python":
            memory_usage_kb = 8 * 1024
            
        return {
            "status": status_val,
            "output": output,
            "error": error_msg,
            "execution_time_ms": execution_time_ms,
            "memory_usage_kb": memory_usage_kb
        }
        
    except Exception as e:
        return {
            "status": "Runtime Error",
            "output": "",
            "error": f"Local runner error: {str(e)}",
            "execution_time_ms": 0,
            "memory_usage_kb": 0
        }
    finally:
        # Clean host temporary folder
        try:
            shutil.rmtree(host_temp_dir)
        except Exception:
            pass
