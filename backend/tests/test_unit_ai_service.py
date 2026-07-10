"""Unit tests for app.ai_service — JSON parsing/sanitizing and fallbacks (no network)."""
import pytest

from app.ai_service import parse_llm_json, get_error_fallback, detect_ollama_model, generate_report

REQUIRED_KEYS = {
    "engineering_score", "time_complexity", "space_complexity", "complexity_reasoning",
    "current_approach", "optimal_approach", "optimization_suggestions",
    "readability_score", "maintainability_score", "best_practices_score",
    "code_quality_suggestions", "bug_analysis", "edge_cases", "security_issues",
    "concepts_used", "weak_areas", "suggested_topics",
}

VALID_JSON = """
{
  "engineering_score": 92,
  "time_complexity": "O(log N)",
  "space_complexity": "O(1)",
  "complexity_reasoning": "Binary search halves the range.",
  "current_approach": "Binary search",
  "optimal_approach": "Binary search",
  "optimization_suggestions": ["Handle empty array"],
  "readability_score": 88,
  "maintainability_score": 84,
  "best_practices_score": 80,
  "code_quality_suggestions": ["Add comments"],
  "bug_analysis": "None.",
  "edge_cases": "Empty input.",
  "security_issues": "None.",
  "concepts_used": ["binary search"],
  "weak_areas": [],
  "suggested_topics": ["divide and conquer"]
}
"""


def test_parse_valid_json_preserves_values():
    data = parse_llm_json(VALID_JSON)
    assert data["engineering_score"] == 92
    assert data["time_complexity"] == "O(log N)"
    assert data["optimization_suggestions"] == ["Handle empty array"]
    assert set(data.keys()) == REQUIRED_KEYS


def test_parse_strips_markdown_fences():
    fenced = "```json\n" + VALID_JSON.strip() + "\n```"
    data = parse_llm_json(fenced)
    assert data["engineering_score"] == 92
    assert data["space_complexity"] == "O(1)"


def test_parse_fills_missing_keys_with_defaults():
    data = parse_llm_json('{"engineering_score": 50}')
    assert set(data.keys()) == REQUIRED_KEYS
    assert data["engineering_score"] == 50
    assert data["time_complexity"] == "N/A"
    assert data["optimization_suggestions"] == []          # list default
    assert data["readability_score"] == 70                 # int default


def test_parse_coerces_types():
    # score given as a string, a list field given as a scalar
    data = parse_llm_json('{"engineering_score": "85", "concepts_used": "recursion"}')
    assert data["engineering_score"] == 85 and isinstance(data["engineering_score"], int)
    assert data["concepts_used"] == ["recursion"]          # scalar wrapped into a list


def test_parse_invalid_json_returns_fallback():
    data = parse_llm_json("this is not json at all")
    assert set(data.keys()) == REQUIRED_KEYS
    assert data["engineering_score"] == 0                  # fallback signature
    assert "could not be generated" in data["complexity_reasoning"].lower()


def test_get_error_fallback_shape():
    fb = get_error_fallback("boom")
    assert set(fb.keys()) == REQUIRED_KEYS
    assert fb["engineering_score"] == 0
    assert isinstance(fb["optimization_suggestions"], list)
    assert "boom" in fb["complexity_reasoning"]


# ---------------------------------------------------------------------------
# Integration with the real Ollama server (slow). Skipped implicitly if Ollama
# is unreachable is NOT done here — instead we assert the graceful behavior.
# ---------------------------------------------------------------------------
@pytest.mark.slow
@pytest.mark.integration
async def test_detect_ollama_model_returns_string():
    model = await detect_ollama_model()
    assert isinstance(model, str) and len(model) > 0


@pytest.mark.slow
@pytest.mark.integration
async def test_generate_report_real_llm():
    runner_result = {"status": "Success", "output": "42", "error": "",
                     "execution_time_ms": 5, "memory_usage_kb": 1024}
    report = await generate_report("print(42)", "python", runner_result)
    assert set(report.keys()) == REQUIRED_KEYS
    assert isinstance(report["engineering_score"], int)
    assert 0 <= report["engineering_score"] <= 100
