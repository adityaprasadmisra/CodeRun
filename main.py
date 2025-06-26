import os
import subprocess
from flask import Flask, render_template, request

app = Flask(__name__)

@app.route("/", methods=["GET", "POST"])
def home():
    code = ""
    output = ""

    if request.method == "POST":
        code = request.form["code"]

        # Save code to file
        with open("code_runner.cpp", "w") as f:
            f.write(code)

        # ✅ Remove old executable if it exists
        if os.path.exists("code_runner.exe"):
            try:
                os.remove("code_runner.exe")
            except PermissionError:
                output = "Error: Cannot remove old executable. Please close any open instances."
                return render_template("index.html", code=code, output=output)

        # Compile using g++
        compile = subprocess.run(["g++", "code_runner.cpp", "-o", "code_runner.exe"], capture_output=True, text=True)

        if compile.returncode != 0:
            output = compile.stderr
        else:
            # Run the compiled executable
            run = subprocess.run(["code_runner.exe"], capture_output=True, text=True)
            output = run.stdout if run.returncode == 0 else run.stderr

    return render_template("index.html", code=code, output=output)

if __name__ == "__main__":
    app.run(debug=True)
