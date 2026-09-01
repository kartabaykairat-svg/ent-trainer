"""Temp-file and source-document cleanup (project brief section 16)."""
import logging
import time
from pathlib import Path

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Client, DocumentRecord

logger = logging.getLogger(__name__)


def delete_client_source_documents(db: Session, client: Client) -> int:
    """Deletes the uploaded source files for a client from disk (ID scans,
    etc.) once its data has been confirmed and documents generated. The
    DocumentRecord rows (and their extracted field values) are kept for
    audit/history purposes, but storage_path is cleared - there is nothing
    left on disk to leak."""
    removed = 0
    docs = db.query(DocumentRecord).filter(DocumentRecord.client_id == client.id).all()
    for doc in docs:
        if doc.storage_path:
            p = Path(doc.storage_path)
            if p.exists():
                try:
                    p.unlink()
                    removed += 1
                except OSError:
                    logger.exception("Failed to remove %s", p)
            doc.storage_path = None
    client.documents_deleted = True
    db.commit()
    return removed


def purge_stale_tmp_files(max_age_seconds: int = 3600) -> int:
    settings = get_settings()
    removed = 0
    now = time.time()
    for p in settings.tmp_dir.glob("**/*"):
        if p.is_file() and (now - p.stat().st_mtime) > max_age_seconds:
            try:
                p.unlink()
                removed += 1
            except OSError:
                pass
    return removed
