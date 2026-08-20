from fastapi import FastAPI
from backend.routers import parcels

app = FastAPI(title="Vivaad Radar API")
app.include_router(parcels.router)
