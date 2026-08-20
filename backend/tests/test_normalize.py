import pytest

from backend.normalize import norm_survey, norm_place


def test_norm_survey_bridges_the_flagship_divergence():
    assert norm_survey("1365-1") == "1365/1"
    assert norm_survey("1365 / 1") == "1365/1"
    assert norm_survey("1365/1") == "1365/1"
    assert norm_survey("4095M") == "4095m"
    assert norm_survey("") is None
    assert norm_survey(None) is None


def test_norm_place_lowercases_and_strips():
    assert norm_place("Madanpur Paniyar") == "madanpur paniyar"
    assert norm_place("  KURWAR  ") == "kurwar"
    assert norm_place(None) is None


def test_parity_with_pipeline_s2():
    """Guard against drift: import the pipeline originals and compare."""
    pytest.importorskip("rapidfuzz")
    import importlib.util, sys
    from pathlib import Path
    pipe = Path(__file__).resolve().parents[2] / "pipeline"
    sys.path.insert(0, str(pipe))
    try:
        spec = importlib.util.spec_from_file_location("s2n", pipe / "s2_normalize.py")
        s2 = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(s2)
    finally:
        sys.path.remove(str(pipe))
    for v in ("1365-1", "1365 / 1", "88", "142/3", "4095M"):
        assert norm_survey(v) == s2.norm_survey(v)
    for v in ("Madanpur Paniyar", "Madanpur Panyar", "Baraunsa"):
        assert norm_place(v) == s2.norm_place(v)
