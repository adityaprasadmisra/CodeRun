import json
import httpx
from typing import Dict, Any, List
from .config import settings

# Unified Prompt Template for CodeRun AI review
SYSTEM_PROMPT = """
You are CodeRun AI, a panel of 6 senior software engineering agents reviewing a code submission.
Your output must be a single, valid JSON object matching the JSON schema below. Do not output any chat prefix, suffix, markdown fences, or extra text.

CRITICAL ANALYSIS RULES:
- Only analyze what exists in the code. Do not assume or extrapolate anything.
- Do not assume recursion, dynamic programming, memoization, trees, graphs, or algorithms unless they are explicitly present.
- If the code is a simple print statement, state that no algorithm is being used.
- Never invent optimizations. Suggest improvements ONLY if they directly apply to the code structure.

You are composed of the following 6 agents:
1. Complexity Analyzer: Determine exact time and space complexity, reasoning, and detect loops/recursion. Only analyze what is explicitly written in the code. Do not assume algorithms or data structures not present.
2. Optimization Agent: Compare current approach to optimal, suggest improvements. Never invent optimizations, and only suggest improvements if they directly apply to the code structure. If the code is a simple print statement, state that no algorithm is being used as the optimal approach. If the execution status is "Timeout" or the execution time is very long/slow, you MUST direct the user to optimize their approach (e.g., using memoization, dynamic programming, or iterative solutions instead of slow brute force / naive recursion) only if such optimization is relevant and not invented out of thin air.
3. Code Review Agent: Review style, readability, naming, best practices, and score them from 0-100.
4. Bug Detection Agent: Identify risks like overflow, null pointers, infinite loops, and edge cases. If the output is "0" or negative when computing factorials/powers/sums in statically-typed languages (like Java/C/C++), you MUST flag it as integer overflow and suggest using larger data types (e.g. `long`, `BigInteger`, `double`).
5. Security Agent: Flag unsafe functions (e.g. gets, scanf in C/C++), buffer overflows, dangerous handling.
6. Learning Agent: Generate educational feedback, concepts used, weak areas, and learning paths.

Additionally, compute an overall "engineering_score" (0-100) based on correctness, complexity, clean code practices, security, and optimization potential. If the code times out, runs very slowly, has infinite recursion, or outputs incorrect values (like 0 due to overflow), drastically reduce the "engineering_score" (e.g., below 50).

You must output a JSON object containing exactly the following keys and data types:
{
  "engineering_score": integer (0 to 100),
  "time_complexity": string (e.g. "O(N)"),
  "space_complexity": string (e.g. "O(1)"),
  "complexity_reasoning": string (Explain complexity details. If the code is a simple print statement, explain that no algorithm is being used),
  "current_approach": string (If the code is a simple print statement, this field MUST be exactly "No algorithm is being used"),
  "optimal_approach": string (If the code is a simple print statement, this field MUST be exactly "No algorithm is being used"),
  "optimization_suggestions": array of strings (Must be empty if no optimizations are directly applicable based on the present code; never invent optimizations),
  "readability_score": integer (0 to 100),
  "maintainability_score": integer (0 to 100),
  "best_practices_score": integer (0 to 100),
  "code_quality_suggestions": array of strings,
  "bug_analysis": string,
  "edge_cases": string,
  "security_issues": string,
  "concepts_used": array of strings,
  "weak_areas": array of strings,
  "suggested_topics": array of strings
}
"""

USER_PROMPT_TEMPLATE = """
Language: {language}
Execution Status: {status}
Execution Time: {execution_time} ms
Memory Usage: {memory_usage} KB
Program Output: {output}
Program Error: {error}

Source Code:
```
{code}
```
"""

async def detect_ollama_model() -> str:
    """
    Pings Ollama backend to retrieve the list of installed models and picks the best available model.
    Prioritizes: qwen2.5-coder, deepseek-coder, llama3.2, mistral, llama3.
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{settings.OLLAMA_URL}/api/tags", timeout=3.0)
            if response.status_code == 200:
                models = [model["name"] for model in response.json().get("models", [])]
                
                # Check preferences
                preferences = [
                    "qwen2.5-coder", "qwen-coder", "deepseek-coder", 
                    "llama3.2:latest", "llama3.2", 
                    "mistral:latest", "mistral", 
                    "llama3:latest", "llama3"
                ]
                
                for pref in preferences:
                    # Look for exact match or substring match
                    for m in models:
                        if pref in m.lower():
                            return m
                            
                if models:
                    return models[0]  # Fallback to the first installed model
    except Exception as e:
        print(f"Failed to query Ollama models: {e}. Using configured model.")
    return settings.OLLAMA_MODEL

async def generate_report(code: str, language: str, runner_result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sends the code and metrics to Ollama and retrieves a structured multi-agent evaluation.
    """
    model = await detect_ollama_model()
    print(f"Generating AI report using model: {model}")

    user_prompt = USER_PROMPT_TEMPLATE.format(
        language=language,
        status=runner_result["status"],
        execution_time=runner_result["execution_time_ms"],
        memory_usage=runner_result["memory_usage_kb"],
        output=runner_result["output"] or "No output.",
        error=runner_result["error"] or "No compilation or runtime errors.",
        code=code
    )

    url = f"{settings.OLLAMA_URL}/api/generate"
    payload = {
        "model": model,
        "prompt": f"{SYSTEM_PROMPT}\n\nSubmission Details:\n{user_prompt}",
        "stream": False,
        "format": "json", # Forces Ollama to return a JSON object (supported by llama3, llama3.2, mistral, etc.)
        "options": {
            "temperature": 0.2 # Lower temperature for stable structure
        }
    }

    try:
        async with httpx.AsyncClient() as client:
            # Set a generous 180-second timeout for LLM generation (important for CPU running)
            response = await client.post(url, json=payload, timeout=180.0)
            if response.status_code == 200:
                resp_data = response.json()
                text_response = resp_data.get("response", "")
                
                # Parse JSON response
                return parse_llm_json(text_response)
            else:
                return get_error_fallback(f"Ollama server returned status code {response.status_code}")
    except Exception as e:
        return get_error_fallback(f"AI service connection failed: {str(e)}")

def parse_llm_json(text: str) -> Dict[str, Any]:
    """
    Parses and sanitizes LLM JSON output.
    """
    # Clean possible markdown block formatting
    text_clean = text.strip()
    if text_clean.startswith("```json"):
        text_clean = text_clean[7:]
    if text_clean.startswith("```"):
        text_clean = text_clean[3:]
    if text_clean.endswith("```"):
        text_clean = text_clean[:-3]
    text_clean = text_clean.strip()

    try:
        data = json.loads(text_clean)
        # Ensure all required keys exist (sanitize and fill defaults if missing)
        required_keys = {
            "engineering_score": 70,
            "time_complexity": "N/A",
            "space_complexity": "N/A",
            "complexity_reasoning": "Unable to determine.",
            "current_approach": "N/A",
            "optimal_approach": "N/A",
            "optimization_suggestions": [],
            "readability_score": 70,
            "maintainability_score": 70,
            "best_practices_score": 70,
            "code_quality_suggestions": [],
            "bug_analysis": "No analysis available.",
            "edge_cases": "No edge cases identified.",
            "security_issues": "No security analysis available.",
            "concepts_used": [],
            "weak_areas": [],
            "suggested_topics": []
        }
        
        sanitized = {}
        for key, default in required_keys.items():
            val = data.get(key, default)
            # Match data type
            if isinstance(default, list) and not isinstance(val, list):
                val = [val] if val else []
            elif isinstance(default, int) and not isinstance(val, int):
                try:
                    val = int(val)
                except ValueError:
                    val = default
            sanitized[key] = val
            
        return sanitized
    except Exception as e:
        print(f"Error parsing LLM response: {e}. Raw text was:\n{text}")
        return get_error_fallback(f"JSON Parsing Error: {str(e)}")

def get_error_fallback(error_reason: str) -> Dict[str, Any]:
    """
    Returns a valid report structure filled with fallback values in case of failure.
    """
    return {
        "engineering_score": 0,
        "time_complexity": "Unknown",
        "space_complexity": "Unknown",
        "complexity_reasoning": f"AI review could not be generated. Reason: {error_reason}",
        "current_approach": "Unknown",
        "optimal_approach": "Unknown",
        "optimization_suggestions": ["Unable to load AI analysis."],
        "readability_score": 0,
        "maintainability_score": 0,
        "best_practices_score": 0,
        "code_quality_suggestions": ["Unable to load AI quality analysis."],
        "bug_analysis": "Unable to load AI bug analysis.",
        "edge_cases": "Unable to load AI edge cases.",
        "security_issues": "Unable to load AI security analysis.",
        "concepts_used": [],
        "weak_areas": [],
        "suggested_topics": ["Verify Ollama backend installation."]
    }
