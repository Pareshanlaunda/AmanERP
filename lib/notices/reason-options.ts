export type NoticeReasonOption = {
  key: string;
  label: string;
  paragraphText: string;
};

/** Exact checkbox copy from Reply Notice form — paragraph text goes into point 3 when checked. */
export const NOTICE_REASON_OPTIONS: NoticeReasonOption[] = [
  {
    key: "job_loss",
    label:
      "That my client is facing significant financial difficulties and instability and is not in a position to pay the outstanding dues or subsequent EMIs as a consequence of recent job loss and absence of any other source of income.",
    paragraphText:
      "That my client is facing significant financial difficulties and instability and is not in a position to pay the outstanding dues or subsequent EMIs as a consequence of recent job loss and absence of any other source of income.",
  },
  {
    key: "business_loss",
    label:
      "That my client has incurred substantial loss in business and in absence of any other source of income is unable to pay the outstanding dues or EMIs.",
    paragraphText:
      "That my client has incurred substantial loss in business and in absence of any other source of income is unable to pay the outstanding dues or EMIs.",
  },
  {
    key: "medical_emergency",
    label:
      "That my client is unable to pay the outstanding dues due to medical emergency and expenses suffered due to it. My client has already requested a settlement of the dues based on their limited financial capacity in absence of any other source of income.",
    paragraphText:
      "That my client is unable to pay the outstanding dues due to medical emergency and expenses suffered due to it. My client has already requested a settlement of the dues based on their limited financial capacity in absence of any other source of income.",
  },
  {
    key: "online_trading_fraud",
    label:
      "That my client has faced significant losses in online trading betting online fraud. It is noteworthy that Indian law does not explicitly prohibit or regulate online betting or wagering activities. These pursuits inherently involve uncertainty and unpredictability with outcomes largely dependent on volatile factors beyond individual control. My client has now understood this but is unfortunately unable to recover the losses. We have diligently informed your client of this predicament through various means including direct communication with recovery agents.",
    paragraphText:
      "That my client has faced significant losses in online trading betting online fraud. It is noteworthy that Indian law does not explicitly prohibit or regulate online betting or wagering activities. These pursuits inherently involve uncertainty and unpredictability with outcomes largely dependent on volatile factors beyond individual control. My client has now understood this but is unfortunately unable to recover the losses. We have diligently informed your client of this predicament through various means including direct communication with recovery agents.",
  },
];

const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"] as const;

export function buildReasonParagraphs(
  reasonKeys: string[],
  additionalReason?: string | null
): { letter: string; text: string }[] {
  const byKey = new Map(NOTICE_REASON_OPTIONS.map((o) => [o.key, o]));
  const rows: { letter: string; text: string }[] = [];

  for (const key of reasonKeys) {
    const opt = byKey.get(key);
    if (!opt) continue;
    rows.push({
      letter: `${ROMAN[rows.length] ?? rows.length + 1}.`,
      text: opt.paragraphText,
    });
  }

  const extra = additionalReason?.trim();
  if (extra) {
    rows.push({
      letter: `${ROMAN[rows.length] ?? rows.length + 1}.`,
      text: extra,
    });
  }

  return rows;
}
