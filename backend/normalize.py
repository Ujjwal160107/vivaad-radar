"""Survey-number and place normalization for query-time comparison.
Source of truth: pipeline/s2_normalize.py (norm_survey / norm_place).
test_normalize.py::test_parity_with_pipeline_s2 guards against drift."""
import re
import unicodedata


def norm_survey(pid):
    """1365-1, 1365 / 1, 4095M -> 1365/1, 1365/1, 4095m"""
    if not pid:
        return None
    s = unicodedata.normalize("NFKC", str(pid)).strip().lower()
    s = re.sub(r"\s+", "", s)
    s = re.sub(r"[-_]", "/", s)
    s = re.sub(r"/+", "/", s).strip("/.")
    return s or None


def norm_place(v):
    if not v:
        return None
    s = unicodedata.normalize("NFKC", str(v)).lower()
    return re.sub(r"\s+", " ", re.sub(r"[^a-z ]+", " ", s)).strip() or None
