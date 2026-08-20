import os
from pathlib import Path
from starlette.responses import JSONResponse, Response
from backend.db import REPO_ROOT

DEFAULT_FALLBACK = REPO_ROOT / "data" / "output" / "fallback"


def fallback_dir() -> Path:
    return Path(os.environ.get("VIVAAD_FALLBACK_DIR", str(DEFAULT_FALLBACK)))


def install(app) -> None:
    @app.middleware("http")
    async def fallback_middleware(request, call_next):
        try:
            response = await call_next(request)
            if response.status_code < 500:
                return response
        except Exception:
            pass
        name = request.url.path.strip("/").replace("/", "_") + ".json"
        candidate = fallback_dir() / name
        if candidate.exists():
            return Response(candidate.read_bytes(), media_type="application/json")
        return JSONResponse({"error": "unavailable"}, status_code=503)
