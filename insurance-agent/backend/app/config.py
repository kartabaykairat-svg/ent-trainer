from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(BACKEND_DIR / ".env"), extra="ignore")

    secret_key: str = "insecure-dev-secret-change-me"
    field_encryption_key: str = ""
    session_timeout_minutes: int = 20

    seed_manager_username: str = "manager"
    seed_manager_password: str = "manager123"

    database_url: str = f"sqlite:///{BACKEND_DIR / 'storage' / 'app.db'}"
    storage_dir: Path = BACKEND_DIR / "storage"
    delete_source_docs_after_generation: bool = False
    max_upload_mb: int = 15

    tesseract_cmd: str = ""

    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-5"

    cors_origins: str = "http://localhost:5173"

    templates_dir: Path = BACKEND_DIR / "templates"
    calc_config_path: Path = BACKEND_DIR / "app" / "config" / "calc_config.yaml"

    # Set by the production Docker image (see insurance-agent/Dockerfile) to
    # the compiled frontend's dist/ directory. When set and present, the API
    # serves the built frontend itself so the whole app is one URL/process.
    # Empty in local dev, where the Vite dev server runs separately.
    frontend_dist: Path | None = None

    @property
    def uploads_dir(self) -> Path:
        return self.storage_dir / "uploads"

    @property
    def generated_dir(self) -> Path:
        return self.storage_dir / "generated"

    @property
    def tmp_dir(self) -> Path:
        return self.storage_dir / "tmp"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    for d in (settings.storage_dir, settings.uploads_dir, settings.generated_dir, settings.tmp_dir):
        d.mkdir(parents=True, exist_ok=True)
    return settings
