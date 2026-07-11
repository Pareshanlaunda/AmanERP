import {
  BOTBIZ_CLIENT_DETAILS_FIELDS,
  BOTBIZ_CUSTOM_FIELD_IDS,
} from "@/lib/botbiz/field-config";
import { mapBotbizHarassment } from "@/lib/botbiz/map-harassment";
import { mapBotbizLoanType } from "@/lib/botbiz/map-loan-type";
import { normalizeRangeAnswer } from "@/lib/botbiz/normalize-range-answer";
import { normalizePhone } from "@/lib/botbiz/normalize-phone";
import {
  classifySlotAnswer,
  isMediaAnswer,
  type WhatsAppSlot,
  type WhatsAppSlotAnswer,
} from "@/lib/botbiz/i18n-answer-maps";
import type { HarassmentFaced, LoanType, PreferredLanguage } from "@/lib/types/database";

export type BotbizLeadFields = {
  client_name: string;
  client_phone: string | null;
  client_alternate_phone: string | null;
  client_email: string | null;
  loan_amount: number | null;
  personal_loan_amount_range: string | null;
  credit_card_amount_range: string | null;
  loan_type: LoanType | null;
  harassment_faced: HarassmentFaced | null;
  notes: string | null;
  botbiz_subscriber_id: string | null;
  preferred_language: PreferredLanguage;
  whatsapp_slot_answers: WhatsAppSlotAnswer[];
  /** True when lead was created before Client_Details finished (POSTBACK / first contact). */
  is_early_contact: boolean;
};

const CLIENT_DETAILS_SLOTS: WhatsAppSlot[] = [
  "name",
  "phone",
  "loan_type",
  "personal_loan",
  "credit_card",
  "harassment",
];


const CUSTOM_FIELD_ID_ALIASES: Record<string, readonly string[]> = {
  [BOTBIZ_CUSTOM_FIELD_IDS.full_name_en]: BOTBIZ_CLIENT_DETAILS_FIELDS.client_name,
  [BOTBIZ_CUSTOM_FIELD_IDS.full_name_hi]: BOTBIZ_CLIENT_DETAILS_FIELDS.client_name,
  [BOTBIZ_CUSTOM_FIELD_IDS.full_name_mr]: BOTBIZ_CLIENT_DETAILS_FIELDS.client_name,
  [BOTBIZ_CUSTOM_FIELD_IDS.mobile_hi]: BOTBIZ_CLIENT_DETAILS_FIELDS.client_phone,
  [BOTBIZ_CUSTOM_FIELD_IDS.loan_type]: BOTBIZ_CLIENT_DETAILS_FIELDS.loan_type,
  [BOTBIZ_CUSTOM_FIELD_IDS.personal_loan_amount]:
    BOTBIZ_CLIENT_DETAILS_FIELDS.personal_loan_amount,
  [BOTBIZ_CUSTOM_FIELD_IDS.credit_card_amount]:
    BOTBIZ_CLIENT_DETAILS_FIELDS.credit_card_amount,
  [BOTBIZ_CUSTOM_FIELD_IDS.recovery_harassment]: BOTBIZ_CLIENT_DETAILS_FIELDS.harassment,
};

function normalizeKey(key: string): string {
  return key.replace(/\s+/g, " ").trim().toLowerCase();
}

function unwrapJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return value;
  }
}

function recordValue(record: Record<string, unknown>): unknown {
  return (
    record.value ??
    record.answer ??
    record.response ??
    record.data ??
    record.user_input ??
    record.userInput ??
    record.answer_text ??
    record.answerText ??
    record.subscriber_input ??
    record.subscriberInput
  );
}

function recordKeys(record: Record<string, unknown>): string[] {
  const keys = [
    record.field_name,
    record.fieldName,
    record.field,
    record.name,
    record.label,
    record.custom_field,
    record.customField,
    record.custom_field_name,
    record.customFieldName,
    record.custom_field_id,
    record.customFieldId,
    record.field_id,
    record.fieldId,
    record.question,
    record.key,
  ]
    .filter((value) => value != null && String(value).trim() !== "")
    .map(String);

  const id = record.custom_field_id ?? record.customFieldId ?? record.field_id ?? record.fieldId;
  if (id != null) {
    const idStr = String(id).trim();
    keys.push(idStr);
    const aliases = CUSTOM_FIELD_ID_ALIASES[idStr];
    if (aliases) keys.push(...aliases);
  }

  return keys;
}

/**
 * Detect the customer's preferred language based on which Botbiz
 * custom field ID populated the name field.
 *
 * The Botbiz bot has 3 language flows — each uses a different custom
 * field ID for the name question:
 *   56356 → English flow
 *   56357 → Hindi flow
 *   56360 → Marathi flow
 *
 * We also check for Hindi/Marathi question text as a fallback.
 */
function detectLanguageFromPostback(flat: Record<string, unknown>): PreferredLanguage | null {
  const candidates = [
    flat.postback_id,
    flat["POSTBACK ID"],
    flat.postbackId,
    flat.postback,
    flat.button_title,
    flat.button_text,
    flat.title,
  ]
    .filter((v) => v != null && String(v).trim() !== "")
    .map((v) => String(v).toLowerCase());

  for (const text of candidates) {
    if (/marathi|मराठी/.test(text)) return "mr";
    if (/hindi|हिंदी|हिन्दी/.test(text)) return "hi";
    if (/english/.test(text)) return "en";
  }
  return null;
}

function detectPreferredLanguage(flat: Record<string, unknown>): PreferredLanguage {
  const fromPostback = detectLanguageFromPostback(flat);
  if (fromPostback) return fromPostback;

  // Check if Hindi-specific custom field ID has a value
  const hiNameId = BOTBIZ_CUSTOM_FIELD_IDS.full_name_hi;
  const hiName = flat[hiNameId];
  if (hiName != null && String(hiName).trim() !== "") return "hi";

  // Check if Marathi-specific custom field ID has a value
  const mrNameId = BOTBIZ_CUSTOM_FIELD_IDS.full_name_mr;
  const mrName = flat[mrNameId];
  if (mrName != null && String(mrName).trim() !== "") return "mr";

  // Check if Hindi-specific phone field has a value
  const hiPhoneId = BOTBIZ_CUSTOM_FIELD_IDS.mobile_hi;
  const hiPhone = flat[hiPhoneId];
  if (hiPhone != null && String(hiPhone).trim() !== "") return "hi";

  // Fallback: check for Hindi/Marathi question text as keys
  const hindiQuestions = [
    "कृपया अपना पूरा नाम लिखें।",
    "आपके पास किस प्रकार का लोन है?",
    "धन्यवाद! \nअब, कृपया अपना मोबाइल नंबर दें ताकि हमारी टीम आपसे संपर्क कर सके।",
  ];
  for (const q of hindiQuestions) {
    if (flat[q] != null && String(flat[q]).trim() !== "") return "hi";
  }

  const marathiQuestions = [
    "कृपया तुमचे पूर्ण नाव लिहा.",
    "तुमच्याकडे कोणत्या प्रकारचे कर्ज आहे?",
    "तुम्ही रिकव्हरी एजंट्सकडून होणाऱ्या त्रासाला (Harassment) सामोरे जात आहात का?",
  ];
  for (const q of marathiQuestions) {
    if (flat[q] != null && String(flat[q]).trim() !== "") return "mr";
  }

  // Default to English
  return "en";
}

function assignFlat(out: Record<string, unknown>, key: string, value: unknown) {
  if (value == null || String(value).trim() === "") return;
  out[key] = value;
  out[normalizeKey(key)] = value;
}

function flattenPayload(payload: unknown, prefix = ""): Record<string, unknown> {
  const unwrapped = unwrapJson(payload);
  if (unwrapped == null || typeof unwrapped !== "object") return {};
  const out: Record<string, unknown> = {};

  if (Array.isArray(unwrapped)) {
    for (const item of unwrapped) {
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        const value = recordValue(record);
        for (const key of recordKeys(record)) {
          assignFlat(out, key, value);
        }
        Object.assign(out, flattenPayload(item, prefix));
      }
    }
    return out;
  }

  for (const [key, value] of Object.entries(unwrapped as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const parsed = unwrapJson(value);
    assignFlat(out, path, parsed);
    assignFlat(out, key, parsed);

    if (parsed && typeof parsed === "object") {
      Object.assign(out, flattenPayload(parsed, path));
    }
  }

  return out;
}

/** Botbiz outbound webhook uses `user_input_data: [{ question, answer }, ...]`. */
function parseUserInputData(payload: Record<string, unknown>): Record<string, unknown> {
  const raw = payload.user_input_data ?? payload.userInputData;
  if (!Array.isArray(raw)) return {};

  const out: Record<string, unknown> = {};
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const question = record.question ?? record.Question;
    const answer = recordValue(record);
    if (question != null && answer != null && String(answer).trim() !== "") {
      assignFlat(out, String(question), answer);
    }
  }
  return out;
}

/** Ordered answers for slot-index fallback (same Client_Details order EN/HI/MR). */
function orderedUserInputAnswers(payload: Record<string, unknown>): string[] {
  const raw = payload.user_input_data ?? payload.userInputData;
  if (!Array.isArray(raw)) return [];

  const answers: string[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const answer = recordValue(item as Record<string, unknown>);
    if (answer != null && String(answer).trim() !== "") {
      answers.push(String(answer).trim());
    }
  }
  return answers;
}

function pickBySlotOrAlias(
  flat: Record<string, unknown>,
  aliases: readonly string[],
  ordered: string[],
  slotIndex: number
): unknown {
  const byAlias = pickValue(flat, aliases);
  if (byAlias != null && String(byAlias).trim() !== "") return byAlias;
  if (ordered.length >= CLIENT_DETAILS_SLOTS.length && ordered[slotIndex]) {
    return ordered[slotIndex];
  }
  return null;
}

function extractInputFlowSection(payload: Record<string, unknown>): Record<string, unknown> {
  const userInput = parseUserInputData(payload);
  if (Object.keys(userInput).length > 0) return userInput;

  const candidates = [
    payload.input_flow_data,
    payload["INPUT FLOW DATA"],
    payload.inputFlowData,
    payload.input_flow,
    payload.inputFlow,
    payload.custom_fields,
    payload.customFields,
    payload.user_input_flow,
    payload.userInputFlow,
    payload.subscriber_custom_fields,
    payload.subscriberCustomFields,
    payload.data,
    payload.webhook_data,
  ];

  for (const candidate of candidates) {
    const unwrapped = unwrapJson(candidate);
    if (!unwrapped || typeof unwrapped !== "object") continue;

    const record = unwrapped as Record<string, unknown>;
    const campaign =
      record.Client_Details ??
      record.client_details ??
      record["Client Details"] ??
      record.campaign_data ??
      record.campaignData;

    if (campaign && typeof campaign === "object") {
      return flattenPayload(campaign);
    }

    return flattenPayload(unwrapped);
  }

  return {};
}

function pickValue(flat: Record<string, unknown>, aliases: readonly string[]): unknown {
  for (const alias of aliases) {
    const direct = flat[alias] ?? flat[normalizeKey(alias)];
    if (direct != null && String(direct).trim() !== "") return direct;
  }

  for (const alias of aliases) {
    const lower = normalizeKey(alias);
    for (const [key, value] of Object.entries(flat)) {
      const normalized = normalizeKey(key);
      if (
        normalized === lower ||
        normalized.endsWith(`.${lower}`) ||
        normalized.includes(lower)
      ) {
        if (value != null && String(value).trim() !== "") return value;
      }
    }
  }

  return null;
}

function phoneFromSubscriberId(subscriberId: string | null): string | null {
  if (!subscriberId) return null;
  const match = subscriberId.match(/^(\d{10,15})/);
  return match ? normalizePhone(match[1]) : null;
}

function looksLikeName(value: string): boolean {
  const text = value.trim();
  if (!text || text.length < 2) return false;
  if (/^https?:\/\//i.test(text)) return false;
  if (/^\d+$/.test(text.replace(/\s/g, ""))) return false;
  if (text.includes("Hello! Can I get more info")) return false;
  if (["hi", "hello", "help", "start", "ok", "okay", "yes", "no"].includes(text.toLowerCase())) {
    return false;
  }
  return true;
}

export function extractBotbizLeadFields(payload: unknown): BotbizLeadFields | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const flat = {
    ...flattenPayload(root),
    ...extractInputFlowSection(root),
  };

  const subscriberRaw = pickValue(flat, BOTBIZ_CLIENT_DETAILS_FIELDS.subscriber_id);
  const botbiz_subscriber_id =
    subscriberRaw != null ? String(subscriberRaw).trim() : null;

  const nameFromFlow = pickValue(flat, [
    "Could you please tell me your full name?",
    "कृपया अपना पूरा नाम लिखें।",
    "कृपया तुमचे पूर्ण नाव लिहा.",
  ]);
  const nameRaw = pickValue(flat, BOTBIZ_CLIENT_DETAILS_FIELDS.client_name);
  let client_name = "";

  if (nameFromFlow != null && looksLikeName(String(nameFromFlow))) {
    client_name = String(nameFromFlow).trim();
  } else if (nameRaw != null && looksLikeName(String(nameRaw))) {
    client_name = String(nameRaw).trim();
  } else {
    const firstName = flat.first_name ?? flat["first name"] ?? flat.first_name;
    const lastName = flat["last name"] ?? flat.last_name;
    const combined = [firstName, lastName]
      .filter((part) => part != null && String(part).trim())
      .map(String)
      .join(" ")
      .trim();
    if (looksLikeName(combined)) client_name = combined;
    else if (firstName != null && looksLikeName(String(firstName))) {
      client_name = String(firstName).trim();
    }
  }

  const ordered = orderedUserInputAnswers(root);

  const phoneRaw = pickBySlotOrAlias(
    flat,
    BOTBIZ_CLIENT_DETAILS_FIELDS.client_phone,
    ordered,
    1
  );
  const client_phone =
    phoneRaw != null && !isMediaAnswer(phoneRaw)
      ? normalizePhone(String(phoneRaw))
      : phoneFromSubscriberId(botbiz_subscriber_id);

  const hasRealName = looksLikeName(client_name);
  // Early contact: POSTBACK / first message — phone or subscriber is enough
  if (!hasRealName) {
    if (!client_phone && !botbiz_subscriber_id) return null;
    const preferred_language = detectPreferredLanguage(flat);
    const displayPhone = client_phone ?? botbiz_subscriber_id?.split("-")[0] ?? "unknown";
    return {
      client_name: `WhatsApp ${displayPhone}`,
      client_phone,
      client_alternate_phone: null,
      client_email: null,
      loan_amount: null,
      personal_loan_amount_range: null,
      credit_card_amount_range: null,
      loan_type: null,
      harassment_faced: null,
      notes: "Early WhatsApp contact — Client_Details not completed yet. Employee can follow up in chat.",
      botbiz_subscriber_id,
      preferred_language,
      whatsapp_slot_answers: [],
      is_early_contact: true,
    };
  }

  const loanTypeRaw = pickBySlotOrAlias(
    flat,
    BOTBIZ_CLIENT_DETAILS_FIELDS.loan_type,
    ordered,
    2
  );
  const personalLoanRaw = pickBySlotOrAlias(
    flat,
    BOTBIZ_CLIENT_DETAILS_FIELDS.personal_loan_amount,
    ordered,
    3
  );
  const creditCardRaw = pickBySlotOrAlias(
    flat,
    BOTBIZ_CLIENT_DETAILS_FIELDS.credit_card_amount,
    ordered,
    4
  );
  const harassmentRaw = pickBySlotOrAlias(
    flat,
    BOTBIZ_CLIENT_DETAILS_FIELDS.harassment,
    ordered,
    5
  );

  const loan_type = isMediaAnswer(loanTypeRaw) ? null : mapBotbizLoanType(loanTypeRaw);
  const personal_loan_amount_range = normalizeRangeAnswer(personalLoanRaw, "personal_loan");
  const credit_card_amount_range = normalizeRangeAnswer(creditCardRaw, "credit_card");
  const harassment_faced = isMediaAnswer(harassmentRaw)
    ? null
    : mapBotbizHarassment(harassmentRaw);

  const nameSlotRaw =
    nameFromFlow ?? nameRaw ?? (ordered.length >= 6 ? ordered[0] : null);

  const whatsapp_slot_answers = [
    classifySlotAnswer("name", nameSlotRaw ?? client_name),
    classifySlotAnswer("phone", phoneRaw ?? client_phone),
    classifySlotAnswer("loan_type", loanTypeRaw, { loanType: loan_type }),
    classifySlotAnswer("personal_loan", personalLoanRaw, {
      rangeCanonical: personal_loan_amount_range,
    }),
    classifySlotAnswer("credit_card", creditCardRaw, {
      rangeCanonical: credit_card_amount_range,
    }),
    classifySlotAnswer("harassment", harassmentRaw, { harassment: harassment_faced }),
  ].filter((a): a is WhatsAppSlotAnswer => a != null);

  return {
    client_name,
    client_phone,
    client_alternate_phone: null,
    client_email: null,
    loan_amount: null,
    personal_loan_amount_range,
    credit_card_amount_range,
    loan_type,
    harassment_faced,
    notes: null,
    botbiz_subscriber_id,
    preferred_language: detectPreferredLanguage(flat),
    whatsapp_slot_answers,
    is_early_contact: false,
  };
}
