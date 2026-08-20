import logging
import sqlite3
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend import fallback
from backend.db import db_path
from backend.routers import parcels, cases, dashboard, watchlist

logger = logging.getLogger("vivaad.startup")


def _check_db() -> None:
    path = db_path()
    logger.info("Vivaad Radar DB path: %s", path)
    if not path.is_file():
        logger.warning(
            "DB file missing at %s; responses will rely on the fallback cache", path
        )
        return
    try:
        conn = sqlite3.connect(path)
        try:
            has_parcel = conn.execute(
                "SELECT 1 FROM sqlite_master WHERE type='table' AND name='parcel'"
            ).fetchone() is not None
        finally:
            conn.close()
    except sqlite3.Error:
        logger.warning("Could not inspect DB at %s", path, exc_info=True)
        return
    if not has_parcel:
        logger.warning("DB at %s has no 'parcel' table; is it the right database?", path)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _check_db()
    yield


app = FastAPI(title="Vivaad Radar API", lifespan=lifespan)
app.include_router(parcels.router)
app.include_router(cases.router)
app.include_router(dashboard.router)
app.include_router(watchlist.router)

fallback.install(app)
# Added after the fallback middleware so CORS runs outermost and
# fallback-served responses also carry CORS headers.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
