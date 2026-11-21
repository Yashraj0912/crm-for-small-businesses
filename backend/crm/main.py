import logging
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .routers import auth, dashboard, lookup, resources, users

app = FastAPI(title="Clientbook CRM API", version="1.0.0", docs_url="/api/docs", redoc_url=None, openapi_url="/api/openapi.json")

origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
if origins:  # same-origin deployment (Vercel) needs no CORS
    app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["Authorization", "Content-Type"])

for r in (auth.router, users.router, lookup.router, dashboard.router, *resources.routers):
    app.include_router(r, prefix="/api")


@app.get("/api/health", tags=["meta"])
def health():
    return {"ok": True}


@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    logging.getLogger("crm").error("Unhandled error", exc_info=exc)
    return JSONResponse({"detail": "Internal server error"}, status_code=500)
