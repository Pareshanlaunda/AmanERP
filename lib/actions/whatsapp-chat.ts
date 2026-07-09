"use server";

import {
  getFullConversation,
  listMessageTemplates,
  sendTemplateMessage,
  sendTextMessage,
  type BotbizMessageTemplate,
} from "@/lib/botbiz/api-client";
import { normalizePhone } from "@/lib/botbiz/normalize-phone";
import {
  parseConversationMessages,
  type ParsedWhatsAppMessage,
} from "@/lib/botbiz/parse-conversation-message";
import { getUserWithRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";

export type WhatsAppChatActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

type LeadChatRow = {
  id: string;
  source: string | null;
  client_phone: string | null;
  botbiz_subscriber_id: string | null;
  assigned_to: string | null;
};

function phoneFromSubscriberId(subscriberId: string | null): string | null {
  if (!subscriberId) return null;
  const match = subscriberId.match(/^(\d{10,15})/);
  return match ? normalizePhone(match[1]) : null;
}

/**
 * Phones to try for Botbiz chat, in order.
 * Prefer subscriber_id (WhatsApp chat identity) over form-entered client_phone —
 * customers often mistype the mobile in Client_Details (e.g. Sushant …658 vs …648).
 */
function resolveChatPhoneCandidates(lead: LeadChatRow): string[] {
  const fromSubscriber = phoneFromSubscriberId(lead.botbiz_subscriber_id);
  const fromLead = normalizePhone(lead.client_phone);
  const candidates: string[] = [];
  for (const phone of [fromSubscriber, fromLead]) {
    if (phone && !candidates.includes(phone)) candidates.push(phone);
  }
  return candidates;
}

async function loadLeadForChat(
  leadId: string
): Promise<WhatsAppChatActionResult<LeadChatRow & { phones: string[] }>> {
  const user = await getUserWithRole();
  if (!user) return { success: false, error: "Unauthorized" };

  const supabase = await createClient();
  let query = supabase
    .from("leads")
    .select("id, source, client_phone, botbiz_subscriber_id, assigned_to")
    .eq("id", leadId);

  if (user.role === "employee") {
    query = query.eq("assigned_to", user.id);
  } else if (user.role !== "admin") {
    return { success: false, error: "Unauthorized" };
  }

  const { data: lead, error } = await query.single();

  if (error || !lead) {
    return {
      success: false,
      error:
        user.role === "employee"
          ? "Lead not found or not assigned to you"
          : "Lead not found",
    };
  }

  const typed = lead as LeadChatRow;
  if (typed.source !== "whatsapp") {
    return { success: false, error: "This lead has no WhatsApp conversation" };
  }

  const phones = resolveChatPhoneCandidates(typed);
  if (phones.length === 0) {
    return { success: false, error: "Lead has no phone number to load WhatsApp chat" };
  }

  return { success: true, data: { ...typed, phones } };
}

/**
 * Load the full WhatsApp thread for a lead (all pages from Botbiz).
 * Not limited to 24 hours — that rule only applies when *sending* free text.
 */
export async function getLeadWhatsAppConversation(
  leadId: string
): Promise<
  WhatsAppChatActionResult<{
    messages: ParsedWhatsAppMessage[];
    phone: string;
  }>
> {
  const access = await loadLeadForChat(leadId);
  if (!access.success) return access;

  let lastError = "Failed to load conversation";
  let usedPhone = access.data.phones[0]!;
  let rawMessages: Awaited<ReturnType<typeof getFullConversation>> | null = null;

  for (const phone of access.data.phones) {
    const result = await getFullConversation({
      phoneNumber: phone,
      pageSize: 100,
      maxPages: 50,
    });
    if (!result.ok) {
      lastError = result.error;
      continue;
    }
    usedPhone = phone;
    rawMessages = result;
    if (result.data.length > 0) break;
  }

  if (!rawMessages || !rawMessages.ok) {
    return { success: false, error: lastError };
  }

  const messages = parseConversationMessages(rawMessages.data).sort((a, b) => {
    const left = a.conversationTime ?? "";
    const right = b.conversationTime ?? "";
    return left.localeCompare(right);
  });

  return {
    success: true,
    data: {
      messages,
      phone: usedPhone,
    },
  };
}

export async function sendLeadWhatsAppMessage(
  leadId: string,
  message: string
): Promise<WhatsAppChatActionResult<{ waMessageId?: string; sentAt: string }>> {
  const trimmed = message.trim();
  if (!trimmed) {
    return { success: false, error: "Message cannot be empty" };
  }
  if (trimmed.length > 4000) {
    return { success: false, error: "Message is too long" };
  }

  const access = await loadLeadForChat(leadId);
  if (!access.success) return access;

  // Prefer the WhatsApp subscriber number so replies land in the real thread
  // even when the form phone was mistyped.
  let lastError = "Failed to send message";
  for (const phone of access.data.phones) {
    const result = await sendTextMessage({
      phoneNumber: phone,
      message: trimmed,
    });
    if (result.ok) {
      return {
        success: true,
        data: {
          waMessageId: result.data.wa_message_id,
          sentAt: new Date().toISOString(),
        },
      };
    }
    lastError = result.error;
  }

  return { success: false, error: lastError };
}

export async function listLeadWhatsAppTemplates(
  leadId: string
): Promise<WhatsAppChatActionResult<{ templates: BotbizMessageTemplate[] }>> {
  const access = await loadLeadForChat(leadId);
  if (!access.success) return access;

  const result = await listMessageTemplates();
  if (!result.ok) {
    return { success: false, error: result.error };
  }

  return { success: true, data: { templates: result.data } };
}

export async function sendLeadWhatsAppTemplate(
  leadId: string,
  template: { id: string; name: string }
): Promise<WhatsAppChatActionResult<{ waMessageId?: string; sentAt: string }>> {
  const name = template.name.trim();
  if (!name) {
    return { success: false, error: "Choose a template" };
  }

  const access = await loadLeadForChat(leadId);
  if (!access.success) return access;

  let lastError = "Failed to send template";
  for (const phone of access.data.phones) {
    const result = await sendTemplateMessage({
      phoneNumber: phone,
      templateName: name,
      templateId: template.id,
    });
    if (result.ok) {
      return {
        success: true,
        data: {
          waMessageId: result.data.wa_message_id,
          sentAt: new Date().toISOString(),
        },
      };
    }
    lastError = result.error;
  }

  return { success: false, error: lastError };
}
