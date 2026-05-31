import asyncio
import traceback
import sys
import os

# Ensure app directory is importable
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.ai_service import generate_report

async def main():
    print("=== Testing generate_report ===")
    runner_result = {
        "status": "Success",
        "output": "Double of 21 is 42",
        "error": "",
        "execution_time_ms": 15,
        "memory_usage_kb": 1024
    }
    
    code = """#include <iostream>
using namespace std;
int main() {
    int n = 21;
    cout << "Double of " << n << " is " << (n * 2) << endl;
    return 0;
}"""

    try:
        report = await generate_report(code, "cpp", runner_result)
        print("Report Generation Completed!")
        import json
        print(json.dumps(report, indent=2))
    except Exception as e:
        print("generate_report Raised an Exception:")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
