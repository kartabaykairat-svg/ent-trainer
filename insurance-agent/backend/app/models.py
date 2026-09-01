import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.db_types import EncryptedJSON, EncryptedString


def _uuid() -> str:
    return uuid.uuid4().hex


def _now() -> datetime:
    return datetime.now(timezone.utc)


class ClientStatus(str, enum.Enum):
    draft = "draft"                # created, documents being uploaded
    data_review = "data_review"    # OCR done, manager reviewing/fixing data
    params_entry = "params_entry"  # insurance parameters being entered
    confirmed = "confirmed"        # manager confirmed data, ready to generate
    generated = "generated"        # contract + POA generated
    error = "error"


class Manager(Base):
    __tablename__ = "managers"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    username: Mapped[str] = mapped_column(String, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    clients: Mapped[list["Client"]] = relationship(back_populates="manager")


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    manager_id: Mapped[str] = mapped_column(ForeignKey("managers.id"), index=True)

    status: Mapped[ClientStatus] = mapped_column(Enum(ClientStatus), default=ClientStatus.draft)
    second_insurer: Mapped[bool] = mapped_column(Boolean, default=False)

    # Plaintext, low-sensitivity fields kept unencrypted purely so the
    # client history list can be rendered without decrypting every row.
    masked_iin: Mapped[str] = mapped_column(String, default="")
    masked_full_name: Mapped[str] = mapped_column(String, default="")
    needs_review: Mapped[bool] = mapped_column(Boolean, default=True)
    ocr_error_count: Mapped[int] = mapped_column(Integer, default=0)

    contract_generated: Mapped[bool] = mapped_column(Boolean, default=False)
    poa_generated: Mapped[bool] = mapped_column(Boolean, default=False)
    documents_deleted: Mapped[bool] = mapped_column(Boolean, default=False)

    # Full structured payload (ClientData schema dump incl. c1/c2,
    # insurance params, calculation + schedule, conflicts, confidence) -
    # encrypted at rest.
    data: Mapped[dict] = mapped_column(EncryptedJSON, default=dict)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    manager: Mapped["Manager"] = relationship(back_populates="clients")
    documents: Mapped[list["DocumentRecord"]] = relationship(back_populates="client", cascade="all, delete-orphan")
    generated_files: Mapped[list["GeneratedDocument"]] = relationship(back_populates="client", cascade="all, delete-orphan")


class DocumentRecord(Base):
    """One uploaded source document (ID card, address proof, ...)."""

    __tablename__ = "document_records"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    client_id: Mapped[str] = mapped_column(ForeignKey("clients.id"), index=True)

    original_filename: Mapped[str] = mapped_column(EncryptedString)
    content_type: Mapped[str] = mapped_column(String)
    doc_type: Mapped[str] = mapped_column(String)         # id_card, address_proof, pension_doc, bank_details, other
    doc_type_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    belongs_to: Mapped[str] = mapped_column(String, default="c1")  # c1 | c2

    storage_path: Mapped[str | None] = mapped_column(String, nullable=True)  # None once deleted
    ocr_text: Mapped[str] = mapped_column(EncryptedString, default="")
    ocr_confidence: Mapped[float] = mapped_column(Float, default=0.0)  # 0-100
    extracted_fields: Mapped[dict] = mapped_column(EncryptedJSON, default=dict)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    client: Mapped["Client"] = relationship(back_populates="documents")


class GeneratedDocument(Base):
    __tablename__ = "generated_documents"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    client_id: Mapped[str] = mapped_column(ForeignKey("clients.id"), index=True)
    doc_type: Mapped[str] = mapped_column(String)   # contract | poa
    file_format: Mapped[str] = mapped_column(String)  # docx | pdf
    storage_path: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    client: Mapped["Client"] = relationship(back_populates="generated_files")


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    manager_id: Mapped[str | None] = mapped_column(String, nullable=True)
    client_id: Mapped[str | None] = mapped_column(String, nullable=True)
    action: Mapped[str] = mapped_column(String)
    detail: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
