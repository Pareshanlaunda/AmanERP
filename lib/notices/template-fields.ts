import { NOTICE_REASON_OPTIONS } from "@/lib/notices/reason-options";
import { NOTICE_TEMPLATE_TYPES } from "@/lib/notices/template-types";
import { LOAN_RECALL_OPS } from "@/lib/notices/loan-recall-constants";

export type NoticeTemplateFieldConfig = {
  replyToNameLabel: string;
  replyToAddressLabel: string;
  loanIdLabel: string;
  showRefNumber: boolean;
  showReasons: boolean;
  showCopyToAdvocate: boolean;
  copyToCheckboxLabel: string;
  copyToNameLabel: string;
  copyToAddressLabel: string;
  copyToDefaultOn: boolean;
  showReferenceOnNotice: boolean;
  showSignature: boolean;
  showDefamationFields: boolean;
  letterDateFromExpiry: boolean;
  /** Loan recall: Agent Behavior checkbox → point 8 */
  showAgentBehavior: boolean;
  /** Loan recall: Intimation Mail Date → point 3 */
  showIntimationMailDate: boolean;
};

const DEMAND_NOTICE_FIELDS: NoticeTemplateFieldConfig = {
  replyToNameLabel: "Reply To Bank/NBFC Name",
  replyToAddressLabel: "Reply To Bank/NBFC Address",
  loanIdLabel: "Loan ID Bearing No",
  showRefNumber: true,
  showReasons: true,
  showCopyToAdvocate: true,
  copyToCheckboxLabel: "Copy To Advocate",
  copyToNameLabel: "Copy To Advocate Name",
  copyToAddressLabel: "Copy To Advocate Address",
  copyToDefaultOn: true,
  showReferenceOnNotice: true,
  showSignature: true,
  showDefamationFields: false,
  letterDateFromExpiry: false,
  showAgentBehavior: false,
  showIntimationMailDate: false,
};

const REPLY_LETTER_FIELDS: NoticeTemplateFieldConfig = {
  ...DEMAND_NOTICE_FIELDS,
  replyToNameLabel: "Reply To Name",
  replyToAddressLabel: "Reply To Address",
};

const COMPLAINT_FIELDS: NoticeTemplateFieldConfig = {
  ...DEMAND_NOTICE_FIELDS,
  replyToNameLabel: "Complaint To Name",
  replyToAddressLabel: "Complaint To Address",
  showReasons: false,
  showCopyToAdvocate: false,
  copyToDefaultOn: false,
};

const DEFAMATION_FIELDS: NoticeTemplateFieldConfig = {
  ...DEMAND_NOTICE_FIELDS,
  replyToNameLabel: "Reply To Name",
  replyToAddressLabel: "Reply To Address",
  showReasons: false,
  showCopyToAdvocate: false,
  copyToDefaultOn: false,
  showReferenceOnNotice: false,
  showDefamationFields: true,
};

export const PRE_ARB_S21 =
  "Response To Pre-arbitration Notice Under Section 21 Of Arbitration And Conciliation Act, 1996";

const PRE_ARB_S21_FIELDS: NoticeTemplateFieldConfig = {
  ...DEMAND_NOTICE_FIELDS,
  replyToNameLabel: "Name of Lender",
  replyToAddressLabel: "Address of Lender",
  loanIdLabel: "Loan Account number",
  showRefNumber: false,
  showReasons: false,
  showCopyToAdvocate: true,
  copyToCheckboxLabel: "COPY To FIRM/ADV",
  copyToNameLabel: "NAME OF THE ADV/FIRM",
  copyToAddressLabel: "ADDRESS OF THE FIRM/ADV",
  copyToDefaultOn: false,
  letterDateFromExpiry: true,
};

const LOAN_RECALL_OPS_FIELDS: NoticeTemplateFieldConfig = {
  ...PRE_ARB_S21_FIELDS,
  copyToCheckboxLabel: "COPY To ADV/FIRM",
  showAgentBehavior: true,
  showIntimationMailDate: true,
};

const TEMPLATE_FIELD_CONFIG: Record<string, NoticeTemplateFieldConfig> = {
  "Demand Notice": DEMAND_NOTICE_FIELDS,
  "Complaint To Cyber Cell For Phone Call Harassment": COMPLAINT_FIELDS,
  "Complaint To Pno _ Rno _ No - Expanded Version": COMPLAINT_FIELDS,
  "Intimation Letter": REPLY_LETTER_FIELDS,
  "Legal Notice Against Defamation": DEFAMATION_FIELDS,
  "Notice For Injunction By Client": REPLY_LETTER_FIELDS,
  "Request For Adjournment Of Arbitration Proceeding": REPLY_LETTER_FIELDS,
  [PRE_ARB_S21]: PRE_ARB_S21_FIELDS,
  "Response To Pre-arbitration Notice And Request For Adjournment Of Arbitration Proceedings Under Section 21 Of Arbitration And Conciliation Act, 1996":
    REPLY_LETTER_FIELDS,
  "Response To Pre-arbitration Cum Loan Recall Notice Under Section 21 Of Arbitration And Conciliation Act, 1996":
    REPLY_LETTER_FIELDS,
  "Reply To The Demand Cum Pre-conciliation Notice Dated": DEMAND_NOTICE_FIELDS,
  "Reply To The Conciliation Notice": REPLY_LETTER_FIELDS,
  "Reply To Legal Notice U S 138 Of Ni Act": REPLY_LETTER_FIELDS,
  "Reply To Legal Notice U S 25 Of Payment And Settlement Systems Act 2007": REPLY_LETTER_FIELDS,
  "Reply To Conciliation Cum Pre-arbitration Notice Under The Arbitration And Conciliation Act, 1996":
    REPLY_LETTER_FIELDS,
  "Pre-arbitration Cum Demand Notice Under Section 21 Of Arbitration And Conciliation Act, 1996":
    DEMAND_NOTICE_FIELDS,
  [LOAN_RECALL_OPS]: LOAN_RECALL_OPS_FIELDS,
  "Loan Recal Notice Reply For Ops Clients": LOAN_RECALL_OPS_FIELDS,
  "Reply To Pre-litigation Lok Adalat Notice": REPLY_LETTER_FIELDS,
};

export function getTemplateFieldConfig(
  templateType: string | null | undefined
): NoticeTemplateFieldConfig | null {
  if (!templateType) return null;
  return TEMPLATE_FIELD_CONFIG[templateType] ?? REPLY_LETTER_FIELDS;
}

export { NOTICE_REASON_OPTIONS, NOTICE_TEMPLATE_TYPES };
