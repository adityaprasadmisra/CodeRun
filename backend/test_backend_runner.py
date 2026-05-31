import asyncio
import os
import sys
from app.runner import run_code
from app.ai_service import generate_report

# Ensure app is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def test_cpp_runner():
    print("=== Testing C++ Local Compilation & Run ===")
    cpp_code = """#include <iostream>
using namespace std;

int main() {
    int n;
    if (cin >> n) {
        cout << "Double of " << n << " is " << (n * 2) << endl;
    } else {
        cout << "No input provided." << endl;
    }
    return 0;
}
"""
    result = run_code(cpp_code, "cpp", "21")
    print(f"Status: {result['status']}")
    print(f"Output: {result['output'].strip()}")
    print(f"Error: {result['error']}")
    print(f"Time: {result['execution_time_ms']} ms")
    print(f"Memory: {result['memory_usage_kb']} KB")
    return result

async def test_python_runner():
    print("\n=== Testing Python Run ===")
    py_code = """import sys
lines = sys.stdin.read().strip()
val = int(lines)
print(f"Python square: {val * val}")
"""
    result = run_code(py_code, "python", "5")
    print(f"Status: {result['status']}")
    print(f"Output: {result['output'].strip()}")
    print(f"Error: {result['error']}")
    print(f"Time: {result['execution_time_ms']} ms")
    return result

async def test_ai_report(code, language, runner_result):
    print("\n=== Testing Ollama AI Multi-Agent Report ===")
    try:
        report = await generate_report(code, language, runner_result)
        print(f"AI Score: {report.get('engineering_score')}/100")
        print(f"Time Complexity: {report.get('time_complexity')}")
        print(f"Space Complexity: {report.get('space_complexity')}")
        print(f"Complexity Reasoning: {report.get('complexity_reasoning')}")
        print(f"Concepts Used: {report.get('concepts_used')}")
        print(f"Optimization Current: {report.get('current_approach')}")
        print(f"Optimization Optimal: {report.get('optimal_approach')}")
        print(f"Optimization Suggestions: {report.get('optimization_suggestions')}")
        print(f"Readability Score: {report.get('readability_score')}/100")
        print(f"Potential Bugs: {report.get('bug_analysis')}")
        print(f"Security Analysis: {report.get('security_issues')}")
    except Exception as e:
        print(f"AI Generation Failed: {e}")

async def main():
    # 1. Test runner
    cpp_res = await test_cpp_runner()
    py_res = await test_python_runner()
    
    # 2. Test AI review using C++ result
    if cpp_res["status"] == "Success":
        await test_ai_report(
            code="""#include <iostream>
using namespace std;

int main() {
    int n;
    if (cin >> n) {
        cout << "Double of " << n << " is " << (n * 2) << endl;
    } else {
        cout << "No input provided." << endl;
    }
    return 0;
}
""",
            language="cpp",
            runner_result=cpp_res
        )

if __name__ == "__main__":
    asyncio.run(main())
