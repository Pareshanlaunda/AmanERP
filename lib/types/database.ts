export type UserRole = "admin" | "employee";

export type EmployeeType = "advocate" | "csa" | "hr" | "director" | "finance" | "general";

export type LeadStatus =
  | "new"
  | "assigned"
  | "in_progress"
  | "successful"
  | "converted"
  | "lost";

export type LoanType = "personal_business" | "credit_card" | "both";

export type HarassmentFaced =
  | "no"
  | "yes_calls"
  | "yes_home_visit"
  | "yes_calls_home_visit";

export type OutcomeCategory = "active" | "drop" | "reschedule" | "successful";

export type NotificationType = "lead_assigned" | "lead_converted" | "lead_updated";

export type Profile = {
  id: string;
  full_name: string | null;
  role: UserRole;
  employee_type: EmployeeType | null;
  created_at: string;
};

export type Lead = {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  client_name: string;
  client_phone: string | null;
  client_alternate_phone: string | null;
  client_email: string | null;
  loan_amount: number | null;
  loan_type: LoanType | null;
  harassment_faced: HarassmentFaced | null;
  notes: string | null;
  source: string;
  status: LeadStatus;
  assigned_to: string | null;
  assigned_at: string | null;
  assignment_comment: string | null;
  converted_onboarding_id: string | null;
  onboarding_record_id: string | null;
  lost_reason: string | null;
  lost_at: string | null;
  lost_by: string | null;
  latest_outcome_category: OutcomeCategory | null;
  latest_outcome_reason: string | null;
  lead_id?: string | null;
};

export type LeadComment = {
  id: string;
  lead_id: string;
  author_id: string;
  message: string;
  created_at: string;
};

export type LeadUpdate = {
  id: string;
  lead_id: string;
  updated_by: string;
  note: string;
  status: LeadStatus | null;
  outcome_category: OutcomeCategory | null;
  outcome_reason: string | null;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  lead_id: string | null;
  read_at: string | null;
  created_at: string;
};

export type EmployeeStats = Profile & {
  email?: string;
  assigned_count: number;
  in_progress_count: number;
  converted_count: number;
  total_leads: number;
  total_clients: number;
};

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  assigned: "Assigned",
  in_progress: "In Progress",
  successful: "Successful",
  converted: "Converted",
  lost: "Lost / Not Converted",
};

export const LOAN_TYPE_LABELS: Record<LoanType, string> = {
  personal_business: "Personal Loan / Business Loan",
  credit_card: "Credit Card",
  both: "Both",
};

export const HARASSMENT_FACED_LABELS: Record<HarassmentFaced, string> = {
  no: "No",
  yes_calls: "Yes — Calls",
  yes_home_visit: "Yes — Home Visit",
  yes_calls_home_visit: "Yes — Calls & Home Visit",
};

export const EMPLOYEE_TYPE_LABELS: Record<EmployeeType, string> = {
  advocate: "Advocate",
  csa: "CSA",
  hr: "HR",
  director: "Director",
  finance: "Finance",
  general: "Employee",
};

export const OUTCOME_CATEGORY_LABELS: Record<OutcomeCategory, string> = {
  active: "Active",
  drop: "Drop",
  reschedule: "Reschedule",
  successful: "Successful",
};
