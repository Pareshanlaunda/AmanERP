export const NOTICE_TEMPLATE_TYPES = [
  "Demand Notice",
  "Complaint To Cyber Cell For Phone Call Harassment",
  "Complaint To Pno _ Rno _ No - Expanded Version",
  "Intimation Letter",
  "Legal Notice Against Defamation",
  "Notice For Injunction By Client",
  "Request For Adjournment Of Arbitration Proceeding",
  "Response To Pre-arbitration Notice Under Section 21 Of Arbitration And Conciliation Act, 1996",
  "Response To Pre-arbitration Notice And Request For Adjournment Of Arbitration Proceedings Under Section 21 Of Arbitration And Conciliation Act, 1996",
  "Response To Pre-arbitration Cum Loan Recall Notice Under Section 21 Of Arbitration And Conciliation Act, 1996",
  "Reply To The Demand Cum Pre-conciliation Notice Dated",
  "Reply To The Conciliation Notice",
  "Reply To Legal Notice U S 138 Of Ni Act",
  "Reply To Legal Notice U S 25 Of Payment And Settlement Systems Act 2007",
  "Reply To Conciliation Cum Pre-arbitration Notice Under The Arbitration And Conciliation Act, 1996",
  "Pre-arbitration Cum Demand Notice Under Section 21 Of Arbitration And Conciliation Act, 1996",
  "Loan Recall Notice Reply For Ops Clients",
  "Loan Recal Notice Reply For Ops Clients",
  "Reply To Pre-litigation Lok Adalat Notice",
] as const;

export type NoticeTemplateType = (typeof NOTICE_TEMPLATE_TYPES)[number];

/** Templates enabled in the UI right now. Full list kept above for later. */
export const ACTIVE_NOTICE_TEMPLATE_TYPES = [
  "Demand Notice",
  "Legal Notice Against Defamation",
  "Response To Pre-arbitration Notice Under Section 21 Of Arbitration And Conciliation Act, 1996",
  "Loan Recall Notice Reply For Ops Clients",
] as const;

export type ActiveNoticeTemplateType = (typeof ACTIVE_NOTICE_TEMPLATE_TYPES)[number];

/** Map template type → filename under templates/notices/. */
export const NOTICE_TEMPLATE_FILES: Record<string, string> = {
  "Demand Notice": "demand-notice.docx",
  "Legal Notice Against Defamation": "legal-notice-against-defamation.docx",
  "Response To Pre-arbitration Notice Under Section 21 Of Arbitration And Conciliation Act, 1996":
    "response-pre-arbitration-s21.docx",
  "Loan Recall Notice Reply For Ops Clients": "loan-recall-ops-reply.docx",
  "Loan Recal Notice Reply For Ops Clients": "loan-recall-ops-reply.docx",
};

export function resolveNoticeTemplateFile(templateType: string): string {
  return NOTICE_TEMPLATE_FILES[templateType] ?? "demand-notice.docx";
}
