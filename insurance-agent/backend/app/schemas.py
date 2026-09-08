"""Pydantic models for the structured client data object that flows through
the whole pipeline: OCR/extraction -> conflict resolution -> manager review
-> insurance parameters -> calculation -> DOCX generation.

This is the concrete implementation of the JSON schema described in the
project brief (section 17), extended with per-field confidence, source
document tracking and cross-document conflicts so the frontend can render
the 🟢/🟡/🔴 confidence badges and the conflict-resolution UI.
"""
from typing import Literal, Optional

from pydantic import BaseModel, Field

Confidence = Literal["high", "medium", "low", "missing"]


class DocumentInfo(BaseModel):
    type: str = ""
    type_label: str = ""
    series: str = ""
    number: str = ""
    issue_date: str = ""
    issued_by: str = ""
    expiry_date: str = ""


class BankInfo(BaseModel):
    name: str = ""
    iban: str = ""
    account: str = ""


class PersonData(BaseModel):
    last_name: str = ""
    first_name: str = ""
    middle_name: str = ""
    full_name: str = ""
    birth_date: str = ""
    iin: str = ""
    gender: str = ""
    registration_address: str = ""
    residential_address: str = ""
    birth_place: str = ""
    document: DocumentInfo = Field(default_factory=DocumentInfo)
    phone: str = ""
    email: str = ""
    bank: BankInfo = Field(default_factory=BankInfo)


class BeneficiaryData(BaseModel):
    full_name: str = ""
    address: str = ""
    iin: str = ""
    document: str = ""


class RepresentativeOverride(BaseModel):
    full_name: str = ""
    birth_date: str = ""
    iin: str = ""
    birth_place: str = ""
    address: str = ""


class FieldMeta(BaseModel):
    confidence: Confidence = "missing"
    source_document_ids: list[str] = Field(default_factory=list)
    manually_edited: bool = False


class ConflictCandidate(BaseModel):
    value: str
    source_document_id: str
    source_filename: str = ""


class Conflict(BaseModel):
    id: str
    person: Literal["c1", "c2"]
    field: str
    field_label: str
    candidates: list[ConflictCandidate]
    resolved: bool = False
    resolved_value: Optional[str] = None


class InsuranceParams(BaseModel):
    contract_number: str = ""
    contract_date: str = ""       # DD.MM.YYYY
    contract_city: str = ""

    premium_other_org_c1: str = ""
    premium_other_org_c2: str = ""
    premium_enpf_c1: str = ""
    premium_enpf_c2: str = ""
    premium_own_c1: str = ""
    premium_own_c2: str = ""

    first_payment_c1: str = ""
    first_payment_c2: str = ""
    payment_periodicity: str = "ежемесячно"

    guarantee_years: str = ""
    guarantee_c1_from: str = ""
    guarantee_c1_to: str = ""
    guarantee_c2_from: str = ""
    guarantee_c2_to: str = ""

    death_benefit: str = ""

    indexation_rate: str = "7"
    indexation_confirmed: bool = False

    bank_name_c1: str = ""
    bank_account_c1: str = ""
    bank_name_c2: str = ""
    bank_account_c2: str = ""


class ScheduleItem(BaseModel):
    date_c1: str = ""
    amount_c1: str = ""
    buyout_c1: str = ""
    date_c2: str = ""
    amount_c2: str = ""
    buyout_c2: str = ""


class CalculationInput(BaseModel):
    calculation_date: str = ""     # DD.MM.YYYY, defaults to today
    target_retirement_age: Optional[int] = None
    formula_id: str = ""           # which config/calc_config.yaml formula to use
    extra: dict = Field(default_factory=dict)  # any formula-specific inputs


class CalculationResult(BaseModel):
    formula_id: str = ""
    age_c1: Optional[int] = None
    age_c2: Optional[int] = None
    years_to_target_c1: Optional[int] = None
    years_to_target_c2: Optional[int] = None
    monthly_payment_c1: Optional[str] = None
    monthly_payment_c2: Optional[str] = None
    warnings: list[str] = Field(default_factory=list)
    inputs_echo: dict = Field(default_factory=dict)
    computed_at: str = ""


class ClientData(BaseModel):
    second_insurer: bool = False
    c1: PersonData = Field(default_factory=PersonData)
    c2: PersonData = Field(default_factory=PersonData)

    field_confidence: dict[str, FieldMeta] = Field(default_factory=dict)
    conflicts: list[Conflict] = Field(default_factory=list)

    insurance: InsuranceParams = Field(default_factory=InsuranceParams)
    beneficiary: BeneficiaryData = Field(default_factory=BeneficiaryData)

    representative_override_enabled: bool = False
    representative: RepresentativeOverride = Field(default_factory=RepresentativeOverride)

    calculation: Optional[CalculationResult] = None
    schedule: list[ScheduleItem] = Field(default_factory=list)

    manager_confirmed: bool = False
    manager_confirmed_at: str = ""


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: str
    manager_username: str


class ConflictResolution(BaseModel):
    conflict_id: str
    resolved_value: str


class FieldEdit(BaseModel):
    path: str        # e.g. "c1.full_name", "insurance.contract_number"
    value: str
