import logging
import os
from pathlib import Path
from starlette.responses import JSONResponse, Response
from backend.db import REPO_ROOT

logger = logging.getLogger("vivaad.fallback")

DEFAULT_FALLBACK = REPO_ROOT / "data" / "output" / "fallback"


def fallback_dir() -> Path:
    return Path(os.environ.get("VIVAAD_FALLBACK_DIR", str(DEFAULT_FALLBACK)))


def _candidate_names(url_path: str) -> list[str]:
    # The pipeline may write either layout; prefer nested, then flat.
    trimmed = url_path.strip("/").replace("\\", "/")
    nested = trimmed + ".json"
    flat = trimmed.replace("/", "_") + ".json"
    return [nested, flat]


def _read_candidate(base: Path, name: str) -> Response | None:
    try:
        candidate = (base / name).resolve()
        candidate.relative_to(base)  # containment guard: never leave fallback dir
        if not candidate.is_file():
            return None
        return Response(candidate.read_bytes(), media_type="application/json")
    except (OSError, ValueError):
        return None


def _fallback_response(request) -> Response | None:
    try:
        base = fallback_dir().resolve()
    except OSError:
        return None
    for name in _candidate_names(request.url.path):
        response = _read_candidate(base, name)
        if response is not None:
            return response
    return None


def install(app) -> None:
    @app.middleware("http")
    async def fallback_middleware(request, call_next):
        try:
            response = await call_next(request)
            if response.status_code < 500:
                return response
        except Exception:
            logger.exception(
                "Unhandled error serving %s; attempting fallback", request.url.path
            )
        fallback = _fallback_response(request)
        if fallback is not None:
            return fallback
        return JSONResponse({"error": "unavailable"}, status_code=503)
