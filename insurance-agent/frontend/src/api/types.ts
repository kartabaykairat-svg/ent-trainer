export type Confidence = "high" | "medium" | "low" | "missing"

export interface DocumentInfo {
  type: string
  type_label: string
  series: string
  number: string
  issue_date: string
  issued_by: string
  expiry_date: string
}

export interface BankInfo {
  name: string
  iban: string
  account: string
}

export interface PersonData {
  last_name: string
  first_name: string
  middle_name: string
  full_name: string
  birth_date: string
  iin: string
  gender: string
  registration_address: string
  residential_address: string
  birth_place: string
  document: DocumentInfo
  phone: string
  email: string
  bank: BankInfo
}

export interface BeneficiaryData {
  full_name: string
  address: string
  iin: string
  document: string
}

export interface RepresentativeOverride {
  full_name: string
  birth_date: string
  iin: string
  birth_place: string
  address: string
}

export interface FieldMeta {
  confidence: Confidence
  source_document_ids: string[]
  manually_edited: boolean
}

export interface ConflictCandidate {
  value: string
  source_document_id: string
  source_filename: string
}

export interface Conflict {
  id: string
  person: "c1" | "c2"
  field: string
  field_label: string
  candidates: ConflictCandidate[]
  resolved: boolean
  resolved_value: string | null
}

export interface InsuranceParams {
  contract_number: string
  contract_date: string
  contract_city: string
  premium_other_org_c1: string
  premium_other_org_c2: string
  premium_enpf_c1: string
  premium_enpf_c2: string
  premium_own_c1: string
  premium_own_c2: string
  first_payment_c1: string
  first_payment_c2: string
  payment_periodicity: string
  guarantee_years: string
  guarantee_c1_from: string
  guarantee_c1_to: string
  guarantee_c2_from: string
  guarantee_c2_to: string
  death_benefit: string
  indexation_rate: string
  indexation_confirmed: boolean
  bank_name_c1: string
  bank_account_c1: string
  bank_name_c2: string
  bank_account_c2: string
}

export interface ScheduleItem {
  date_c1: string
  amount_c1: string
  buyout_c1: string
  date_c2: string
  amount_c2: string
  buyout_c2: string
}

export interface CalculationResult {
  formula_id: string
  age_c1: number | null
  age_c2: number | null
  years_to_target_c1: number | null
  years_to_target_c2: number | null
  monthly_payment_c1: string | null
  monthly_payment_c2: string | null
  warnings: string[]
  inputs_echo: Record<string, unknown>
  computed_at: string
}

export interface ClientData {
  second_insurer: boolean
  c1: PersonData
  c2: PersonData
  field_confidence: Record<string, FieldMeta>
  conflicts: Conflict[]
  insurance: InsuranceParams
  beneficiary: BeneficiaryData
  representative_override_enabled: boolean
  representative: RepresentativeOverride
  calculation: CalculationResult | null
  schedule: ScheduleItem[]
  manager_confirmed: boolean
  manager_confirmed_at: string
}

export interface DocumentSummary {
  id: string
  filename: string
  doc_type: string
  doc_type_confirmed: boolean
  belongs_to: "c1" | "c2"
  ocr_confidence: number
  has_file: boolean
  created_at: string
}

export interface ClientDetail {
  id: string
  status: string
  second_insurer: boolean
  needs_review: boolean
  contract_generated: boolean
  poa_generated: boolean
  documents_deleted: boolean
  created_at: string
  updated_at: string
  masked_iin: string
  masked_full_name: string
  data: ClientData
  documents: DocumentSummary[]
}

export interface ClientListItem {
  id: string
  masked_full_name: string
  masked_iin: string
  status: string
  needs_review: boolean
  contract_generated: boolean
  poa_generated: boolean
  created_at: string
  updated_at: string
}

export interface DashboardStats {
  clients_today: number
  contracts_generated: number
  poa_generated: number
  needs_review: number
  recognition_errors: number
  total_clients: number
}

export const DOC_TYPE_LABELS: Record<string, string> = {
  id_card: "Удостоверение личности",
  passport: "Паспорт",
  address_proof: "Документ с адресом",
  pension_doc: "Пенсионный документ",
  bank_details: "Банковские реквизиты",
  other: "Другой документ",
}
