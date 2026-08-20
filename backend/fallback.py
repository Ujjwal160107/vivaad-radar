import os
from pathlib import Path
from starlette.responses import JSONResponse, Response
from backend.db import REPO_ROOT

DEFAULT_FALLBACK = REPO_ROOT / "data" / "output" / "fallback"


def fallback_dir() -> Path:
    return Path(os.environ.get("VIVAAD_FALLBACK_DIR", str(DEFAULT_FALLBACK)))


def _fallback_response(request) -> Response | None:
    name = (
        request.url.path.strip("/")
        .replace("/", "_")
        .replace("\\", "_")
        + ".json"
    )
    if ".." in name:
        return None
    try:
        base = fallback_dir().resolve()
        candidate = (base / name).resolve()
        candidate.relative_to(base)
        if not candidate.is_file():
            return None
        return Response(candidate.read_bytes(), media_type="application/json")
    except (OSError, ValueError):
        return None


def install(app) -> None:
    @app.middleware("http")
    async def fallback_middleware(request, call_next):
        try:
            response = await call_next(request)
            if response.status_code < 500:
                return response
        except Exception:
            pass
        fallback = _fallback_response(request)
        if fallback is not None:
            return fallback
        return JSONResponse({"error": "unavailable"}, status_code=503)
