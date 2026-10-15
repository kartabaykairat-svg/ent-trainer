import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.database import Base, SessionLocal, engine
from app.models import Manager
from app.routers import auth, clients, dashboard, documents, insurance
from app.security import hash_password

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(Manager).count() == 0:
            manager = Manager(
                username=settings.seed_manager_username,
                password_hash=hash_password(settings.seed_manager_password),
            )
            db.add(manager)
            db.commit()
            logger.info("Seeded initial manager account '%s'", settings.seed_manager_username)
    finally:
        db.close()
    yield


app = FastAPI(title="Страховой помощник API", version="0.1.0", lifespan=lifespan)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(clients.router)
app.include_router(insurance.router)
app.include_router(documents.router)
app.include_router(dashboard.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


# --- Serve the compiled frontend, if this image was built with one --------
# (see insurance-agent/Dockerfile). Mounted last so it never shadows an
# /api/* route above. A catch-all SPA fallback sends any non-file, non-/api
# path to index.html so client-side routes (e.g. /clients/abc) work on a
# hard refresh.
if settings.frontend_dist and settings.frontend_dist.exists():
    assets_dir = settings.frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="frontend-assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404)
        candidate = settings.frontend_dist / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(settings.frontend_dist / "index.html")
