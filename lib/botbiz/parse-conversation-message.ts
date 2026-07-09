import { isMediaAnswer } from "@/lib/botbiz/i18n-answer-maps";
import type { BotbizConversationRawMessage } from "@/lib/botbiz/api-client";

export type ChatSenderRole = "customer" | "bot" | "agent";

export type ParsedWhatsAppMessage = {
  id: string;
  role: ChatSenderRole;
  agentName: string | null;
  text: string;
  mediaUrl: string | null;
  mediaKind: "image" | "video" | "audio" | "document" | "link" | null;
  conversationTime: string | null;
  waMessageId: string | null;
  messageStatus: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function detectMediaKind(url: string): ParsedWhatsAppMessage["mediaKind"] {
  if (/\.(ogg|opus|mp3|m4a|wav|aac)(\?|#|$)/i.test(url)) return "audio";
  if (/\.(jpeg|jpg|png|gif|webp)(\?|#|$)/i.test(url)) return "image";
  if (/\.(mp4|webm|mov)(\?|#|$)/i.test(url)) return "video";
  if (/\.pdf(\?|#|$)/i.test(url)) return "document";
  return "link";
}

/** Inbound Meta Cloud API webhook envelopes (customer replies during Client_Details). */
function extractFromMetaWebhookEnvelope(payload: Record<string, unknown>): {
  text: string;
  mediaUrl: string | null;
  mediaKind: ParsedWhatsAppMessage["mediaKind"];
} | null {
  if (payload.object !== "whatsapp_business_account" && !Array.isArray(payload.entry)) {
    return null;
  }
  const entry = Array.isArray(payload.entry) ? payload.entry[0] : null;
  const entryRec = asRecord(entry);
  const changes = Array.isArray(entryRec?.changes) ? entryRec.changes[0] : null;
  const changeRec = asRecord(changes);
  const value = asRecord(changeRec?.value);
  if (!value) return null;

  const messages = Array.isArray(value.messages) ? value.messages : [];
  const firstMsg = asRecord(messages[0]);
  if (firstMsg) {
    return extractFromWhatsAppPayload(firstMsg);
  }

  // Status-only webhooks — skip empty bubbles
  if (Array.isArray(value.statuses) && value.statuses.length > 0) {
    return { text: "", mediaUrl: null, mediaKind: null };
  }

  return null;
}

function extractInteractiveReply(interactive: Record<string, unknown>): string | null {
  const buttonReply = asRecord(interactive.button_reply);
  const listReply = asRecord(interactive.list_reply);
  const nfmReply = asRecord(interactive.nfm_reply);
  return (
    pickString(
      buttonReply?.title,
      buttonReply?.id,
      listReply?.title,
      listReply?.description,
      listReply?.id,
      nfmReply?.body,
      nfmReply?.name,
      asRecord(interactive.body)?.text
    ) ?? null
  );
}

function extractFromWhatsAppPayload(payload: Record<string, unknown>): {
  text: string;
  mediaUrl: string | null;
  mediaKind: ParsedWhatsAppMessage["mediaKind"];
} {
  const fromWebhook = extractFromMetaWebhookEnvelope(payload);
  if (fromWebhook) return fromWebhook;

  const type = typeof payload.type === "string" ? payload.type : null;

  if (type === "text") {
    const textObj = asRecord(payload.text);
    return {
      text: pickString(textObj?.body, payload.body) ?? "",
      mediaUrl: null,
      mediaKind: null,
    };
  }

  if (type === "interactive") {
    const interactive = asRecord(payload.interactive);
    if (interactive) {
      const reply = extractInteractiveReply(interactive);
      if (reply) return { text: reply, mediaUrl: null, mediaKind: null };
      const body = asRecord(interactive.body);
      const header = asRecord(interactive.header);
      const parts = [pickString(header?.text), pickString(body?.text)].filter(Boolean);
      return { text: parts.join("\n") || "[Interactive message]", mediaUrl: null, mediaKind: null };
    }
  }

  if (type === "button" || type === "button_reply") {
    const button = asRecord(payload.button) ?? asRecord(asRecord(payload.interactive)?.button_reply);
    return {
      text: pickString(button?.text, button?.title, payload.text) ?? "[Button reply]",
      mediaUrl: null,
      mediaKind: null,
    };
  }

  if (type === "image" || type === "video" || type === "audio" || type === "document" || type === "sticker") {
    const media = asRecord(payload[type]);
    const url = pickString(media?.link, media?.url, media?.id);
    const caption = pickString(media?.caption);
    const kind =
      type === "image"
        ? "image"
        : type === "video"
          ? "video"
          : type === "audio" || type === "sticker"
            ? "audio"
            : "document";
    return {
      text: caption ?? (url ? `[${type}]` : `[${type} message]`),
      mediaUrl: url && /^https?:\/\//i.test(url) ? url : null,
      mediaKind: url && /^https?:\/\//i.test(url) ? kind : null,
    };
  }

  // Nested messaging_product envelopes from Botbiz sample
  const nestedText = asRecord(payload.text);
  if (nestedText?.body) {
    return { text: String(nestedText.body), mediaUrl: null, mediaKind: null };
  }

  const interactive = asRecord(payload.interactive);
  if (interactive) {
    const reply = extractInteractiveReply(interactive);
    if (reply) return { text: reply, mediaUrl: null, mediaKind: null };
    const body = asRecord(interactive.body);
    return {
      text: pickString(body?.text) ?? "[Interactive message]",
      mediaUrl: null,
      mediaKind: null,
    };
  }

  return { text: "", mediaUrl: null, mediaKind: null };
}

function parseMessageContent(raw: string | null | undefined): {
  text: string;
  mediaUrl: string | null;
  mediaKind: ParsedWhatsAppMessage["mediaKind"];
} {
  if (!raw || !raw.trim()) {
    return { text: "", mediaUrl: null, mediaKind: null };
  }

  const trimmed = raw.trim();

  if (isMediaAnswer(trimmed)) {
    return {
      text: "",
      mediaUrl: trimmed,
      mediaKind: detectMediaKind(trimmed),
    };
  }

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      const record = asRecord(parsed);
      if (record) {
        const extracted = extractFromWhatsAppPayload(record);
        if (extracted.text || extracted.mediaUrl) return extracted;
      }
    } catch {
      // fall through to plain text
    }
  }

  return { text: trimmed, mediaUrl: null, mediaKind: null };
}

export function mapSenderRole(sender: string | null | undefined): ChatSenderRole {
  const value = (sender ?? "").trim().toLowerCase();
  if (value === "bot") return "bot";
  if (
    value === "agent" ||
    value === "admin" ||
    value === "human" ||
    value === "team" ||
    value === "operator" ||
    value === "system"
  ) {
    return "agent";
  }
  // user / subscriber / customer / empty → customer
  return "customer";
}

export function parseConversationMessage(
  raw: BotbizConversationRawMessage
): ParsedWhatsAppMessage {
  const content = parseMessageContent(raw.message_content ?? null);
  const text =
    content.text ||
    (content.mediaUrl
      ? content.mediaKind === "audio"
        ? "Voice note"
        : content.mediaKind === "image"
          ? "Image"
          : content.mediaKind === "video"
            ? "Video"
            : content.mediaKind === "document"
              ? "Document"
              : "Attachment"
      : "(empty message)");

  return {
    id: String(raw.id),
    role: mapSenderRole(raw.sender),
    agentName: raw.agent_name?.trim() || null,
    text,
    mediaUrl: content.mediaUrl,
    mediaKind: content.mediaKind,
    conversationTime: raw.conversation_time ?? null,
    waMessageId: raw.wa_message_id ?? null,
    messageStatus: raw.message_status ?? null,
  };
}

export function parseConversationMessages(
  rows: BotbizConversationRawMessage[]
): ParsedWhatsAppMessage[] {
  return rows
    .map(parseConversationMessage)
    .filter((message) => Boolean(message.text.trim() || message.mediaUrl));
}
