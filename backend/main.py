from fastapi import FastAPI
from backend.routers import parcels, cases, dashboard

app = FastAPI(title="Vivaad Radar API")
app.include_router(parcels.router)
app.include_router(cases.router)
app.include_router(dashboard.router)
