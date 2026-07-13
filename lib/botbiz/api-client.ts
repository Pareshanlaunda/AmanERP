/**
 * Server-only Botbiz Developer API client.
 * Docs: components/Whatsapp/BOTBIZ.DEV.MD
 */

export type BotbizConversationRawMessage = {
  id: number | string;
  whatsapp_bot_subscriber_subscriber_id?: string;
  whatsapp_bot_id?: number | string;
  sender?: string | null;
  agent_name?: string | null;
  message_content?: string | null;
  conversation_time?: string | null;
  wa_message_id?: string | null;
  reaction_data?: unknown;
  message_status?: string | null;
  delivery_status_updated_at?: string | null;
  failed_reason?: string | null;
};

type BotbizApiSuccess<T> = { ok: true; data: T };
type BotbizApiFailure = { ok: false; error: string };
export type BotbizApiResult<T> = BotbizApiSuccess<T> | BotbizApiFailure;

function getConfig():
  | { ok: true; apiToken: string; phoneNumberId: string; baseUrl: string }
  | { ok: false; error: string } {
  const apiToken = process.env.BOTBIZ_API_KEY?.trim();
  const phoneNumberId = process.env.BOTBIZ_PHONE_NUMBER_ID?.trim();
  const baseUrl = (process.env.BOTBIZ_API_BASE_URL?.trim() || "https://dash.botbiz.io").replace(
    /\/$/,
    ""
  );

  if (!apiToken) {
    return { ok: false, error: "BOTBIZ_API_KEY is not configured" };
  }
  if (!phoneNumberId) {
    return { ok: false, error: "BOTBIZ_PHONE_NUMBER_ID is not configured" };
  }

  return { ok: true, apiToken, phoneNumberId, baseUrl };
}

async function postForm(
  path: string,
  fields: Record<string, string>
): Promise<BotbizApiResult<unknown>> {
  const config = getConfig();
  if (!config.ok) return config;

  const body = new URLSearchParams();
  body.set("apiToken", config.apiToken);
  body.set("phone_number_id", config.phoneNumberId);
  for (const [key, value] of Object.entries(fields)) {
    body.set(key, value);
  }

  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}${path}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      cache: "no-store",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error calling Botbiz";
    return { ok: false, error: message };
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return {
      ok: false,
      error: `Botbiz returned non-JSON (HTTP ${response.status})`,
    };
  }

  if (!response.ok) {
    const msg =
      typeof json === "object" &&
      json !== null &&
      "message" in json &&
      typeof (json as { message: unknown }).message === "string"
        ? (json as { message: string }).message
        : `Botbiz HTTP ${response.status}`;
    return { ok: false, error: msg };
  }

  return { ok: true, data: json };
}

function isSuccessStatus(status: unknown): boolean {
  return status === "1" || status === 1 || status === true;
}

function extractErrorMessage(data: unknown, fallback: string): string {
  if (typeof data === "object" && data !== null && "message" in data) {
    const msg = (data as { message: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return fallback;
}

export async function getConversation(params: {
  phoneNumber: string;
  limit?: number;
  offset?: number;
}): Promise<BotbizApiResult<BotbizConversationRawMessage[]>> {
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 100);
  const offset = Math.max(params.offset ?? 1, 1);

  const result = await postForm("/api/v1/whatsapp/get/conversation", {
    phone_number: params.phoneNumber,
    limit: String(limit),
    offset: String(offset),
  });

  if (!result.ok) return result;

  const payload = result.data as { status?: unknown; message?: unknown };
  if (!isSuccessStatus(payload.status)) {
    return {
      ok: false,
      error: extractErrorMessage(payload, "Failed to load conversation"),
    };
  }

  const messages = normalizeMessageList(payload.message);
  return { ok: true, data: messages };
}

/**
 * Pull the full Botbiz conversation for a phone by paging until exhausted.
 * History is not limited to 24h — that window only applies to free-text *sends*.
 */
export async function getFullConversation(params: {
  phoneNumber: string;
  pageSize?: number;
  maxPages?: number;
}): Promise<BotbizApiResult<BotbizConversationRawMessage[]>> {
  const pageSize = Math.min(Math.max(params.pageSize ?? 100, 1), 100);
  const maxPages = Math.min(Math.max(params.maxPages ?? 50, 1), 100);
  const all: BotbizConversationRawMessage[] = [];
  const seen = new Set<string>();

  for (let page = 1; page <= maxPages; page++) {
    const result = await getConversation({
      phoneNumber: params.phoneNumber,
      limit: pageSize,
      offset: page,
    });
    if (!result.ok) {
      if (all.length > 0) {
        // Return what we have if a later page fails
        return { ok: true, data: all };
      }
      return result;
    }

    if (result.data.length === 0) break;

    for (const row of result.data) {
      const key = String(row.wa_message_id ?? row.id);
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(row);
    }

    if (result.data.length < pageSize) break;
  }

  return { ok: true, data: all };
}

/**
 * Botbiz returns conversation as:
 * - a JSON array, or
 * - a JSON string of an array, or
 * - a JSON string of an object map keyed by index: `{"0":{...},"1":{...}}`
 * (the form/bot thread is in this payload — we must not drop the object shape).
 */
function normalizeMessageList(message: unknown): BotbizConversationRawMessage[] {
  let value: unknown = message;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "[]" || trimmed === "{}") return [];
    try {
      value = JSON.parse(trimmed) as unknown;
    } catch {
      return [];
    }
  }

  let rows: BotbizConversationRawMessage[] = [];

  if (Array.isArray(value)) {
    rows = value as BotbizConversationRawMessage[];
  } else if (typeof value === "object" && value !== null) {
    rows = Object.values(value as Record<string, unknown>).filter(
      (item): item is BotbizConversationRawMessage =>
        typeof item === "object" &&
        item !== null &&
        ("message_content" in item || "id" in item || "sender" in item)
    );
  }

  return rows.sort((a, b) => {
    const left = a.conversation_time ?? "";
    const right = b.conversation_time ?? "";
    if (left && right && left !== right) return left.localeCompare(right);
    return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
  });
}

export async function sendTextMessage(params: {
  phoneNumber: string;
  message: string;
}): Promise<BotbizApiResult<{ wa_message_id?: string }>> {
  const result = await postForm("/api/v1/whatsapp/send", {
    phone_number: params.phoneNumber,
    message: params.message,
  });

  if (!result.ok) return result;

  const payload = result.data as {
    status?: unknown;
    message?: unknown;
    wa_message_id?: string;
  };

  if (!isSuccessStatus(payload.status)) {
    return {
      ok: false,
      error: extractErrorMessage(payload, "Failed to send message"),
    };
  }

  return {
    ok: true,
    data: { wa_message_id: payload.wa_message_id },
  };
}

export type BotbizMessageTemplate = {
  id: string;
  name: string;
  status: string | null;
  locale: string | null;
  body: string | null;
};

function normalizeTemplateList(message: unknown): BotbizMessageTemplate[] {
  let value: unknown = message;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return [];
    }
  }

  const rows: unknown[] = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? Object.values(value as Record<string, unknown>)
      : [];

  return rows
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const rec = row as Record<string, unknown>;
      const id = rec.id ?? rec.template_id;
      const name = rec.template_name ?? rec.name;
      if (id == null || typeof name !== "string" || !name.trim()) return null;
      return {
        id: String(id),
        name: name.trim(),
        status: typeof rec.status === "string" ? rec.status : null,
        locale: typeof rec.locale === "string" ? rec.locale : null,
        body: typeof rec.body_content === "string" ? rec.body_content : null,
      } satisfies BotbizMessageTemplate;
    })
    .filter((row): row is BotbizMessageTemplate => row !== null);
}

export async function listMessageTemplates(): Promise<
  BotbizApiResult<BotbizMessageTemplate[]>
> {
  const result = await postForm("/api/v1/whatsapp/template/list", {});
  if (!result.ok) return result;

  const payload = result.data as { status?: unknown; message?: unknown };
  if (!isSuccessStatus(payload.status)) {
    return {
      ok: false,
      error: extractErrorMessage(payload, "Failed to load templates"),
    };
  }

  return { ok: true, data: normalizeTemplateList(payload.message) };
}

/** Outside the 24h window — Meta requires an approved template. */
export async function sendTemplateMessage(params: {
  phoneNumber: string;
  templateName: string;
  templateId?: string;
}): Promise<BotbizApiResult<{ wa_message_id?: string }>> {
  const fields: Record<string, string> = {
    phone_number: params.phoneNumber,
    template_name: params.templateName,
  };
  if (params.templateId) {
    fields.template_id = params.templateId;
    fields.message_template_id = params.templateId;
  }

  const result = await postForm("/api/v1/whatsapp/send/template", fields);
  if (!result.ok) return result;

  const payload = result.data as {
    status?: unknown;
    message?: unknown;
    wa_message_id?: string;
  };

  if (!isSuccessStatus(payload.status)) {
    return {
      ok: false,
      error: extractErrorMessage(payload, "Failed to send template"),
    };
  }

  return {
    ok: true,
    data: { wa_message_id: payload.wa_message_id },
  };
}

export type BotbizSubscriber = {
  subscriberId: string;
  phone: string;
  firstName: string | null;
  lastName: string | null;
};

/**
 * Recent WhatsApp contacts from Botbiz (orderBy=1 = latest message first).
 * Used to create ERP leads when webhook POSTBACK did not fire yet.
 */
export async function listSubscribers(params?: {
  limit?: number;
  offset?: number;
  /** 1 = most recent message first */
  orderBy?: 0 | 1;
}): Promise<BotbizApiResult<BotbizSubscriber[]>> {
  const limit = Math.min(Math.max(params?.limit ?? 40, 1), 100);
  const offset = Math.max(params?.offset ?? 1, 1);
  const orderBy = params?.orderBy === 0 ? "0" : "1";

  const result = await postForm("/api/v1/whatsapp/subscriber/list", {
    limit: String(limit),
    offset: String(offset),
    orderBy,
  });
  if (!result.ok) return result;

  const payload = result.data as { status?: unknown; message?: unknown };
  if (!isSuccessStatus(payload.status)) {
    return {
      ok: false,
      error: extractErrorMessage(payload, "Failed to list subscribers"),
    };
  }

  let rows: unknown[] = [];
  const message = payload.message;
  if (Array.isArray(message)) {
    rows = message;
  } else if (typeof message === "string") {
    try {
      const parsed = JSON.parse(message) as unknown;
      rows = Array.isArray(parsed) ? parsed : [];
    } catch {
      rows = [];
    }
  } else if (message && typeof message === "object") {
    rows = Object.values(message as Record<string, unknown>);
  }

  const subscribers: BotbizSubscriber[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const chatId = rec.chat_id ?? rec.phone_number ?? rec.phoneNumber ?? rec.phone;
    const subId = rec.subscriber_id ?? rec.subscriberId ?? rec.id;
    if (chatId == null && subId == null) continue;
    const phone = String(chatId ?? subId).replace(/\D/g, "");
    if (phone.length < 10) continue;
    subscribers.push({
      subscriberId: subId != null ? String(subId) : phone,
      phone,
      firstName:
        typeof rec.first_name === "string" && rec.first_name.trim() && rec.first_name !== "null"
          ? rec.first_name.trim()
          : null,
      lastName:
        typeof rec.last_name === "string" && rec.last_name.trim() && rec.last_name !== "null"
          ? rec.last_name.trim()
          : null,
    });
  }

  return { ok: true, data: subscribers };
}

export function isOutside24HourWindowError(message: string): boolean {
  return /24\s*hour|template message/i.test(message);
}

export function isBotbizChatConfigured(): boolean {
  return getConfig().ok;
}
