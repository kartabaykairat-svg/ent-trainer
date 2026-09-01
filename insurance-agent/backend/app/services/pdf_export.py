"""DOCX -> PDF conversion via headless LibreOffice, preserving the exact
layout produced by docxtpl (no re-typesetting, no separate PDF template)."""
import logging
import shutil
import subprocess
from pathlib import Path

logger = logging.getLogger(__name__)


def libreoffice_available() -> bool:
    return shutil.which("soffice") is not None or shutil.which("libreoffice") is not None


def convert_to_pdf(docx_path: Path, out_dir: Path, timeout: int = 60) -> Path | None:
    binary = shutil.which("soffice") or shutil.which("libreoffice")
    if not binary:
        logger.warning("LibreOffice not found - PDF export unavailable")
        return None
    out_dir.mkdir(parents=True, exist_ok=True)
    try:
        subprocess.run(
            [binary, "--headless", "--norestore", "--convert-to", "pdf", "--outdir", str(out_dir), str(docx_path)],
            check=True, timeout=timeout, capture_output=True,
        )
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
        logger.exception("LibreOffice PDF conversion failed for %s", docx_path)
        return None
    pdf_path = out_dir / (docx_path.stem + ".pdf")
    return pdf_path if pdf_path.exists() else None
