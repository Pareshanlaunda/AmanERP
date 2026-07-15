"use server";

import { z } from "zod";
import { getUserWithRole } from "@/lib/auth/get-user";
import { publicActionError } from "@/lib/errors/public-error";
import { createClient } from "@/lib/supabase/server";
import type { LeadComment } from "@/lib/types/database";

export type ActionResult = { success: true } | { success: false; error: string };

const leadIdSchema = z.string().uuid();
const commentMessageSchema = z
  .string()
  .trim()
  .min(1, "Comment cannot be empty")
  .max(2000, "Comment is too long");

export async function getLeadComments(leadId: string): Promise<LeadComment[]> {
  const user = await getUserWithRole();
  if (!user) return [];

  const parsed = leadIdSchema.safeParse(leadId);
  if (!parsed.success) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lead_comments")
    .select("*")
    .eq("lead_id", parsed.data)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    console.error("[comments] getLeadComments failed", error.message);
    throw new Error("Unable to load comments");
  }

  return (data ?? []) as LeadComment[];
}

export async function hasUnreadComments(leadId: string): Promise<boolean> {
  const user = await getUserWithRole();
  if (!user) return false;

  const parsed = leadIdSchema.safeParse(leadId);
  if (!parsed.success) return false;

  const supabase = await createClient();
  const { data: comments, error: commentsError } = await supabase
    .from("lead_comments")
    .select("created_at, author_id")
    .eq("lead_id", parsed.data)
    .order("created_at", { ascending: false })
    .limit(1);

  if (commentsError) {
    console.error("[comments] hasUnreadComments failed", commentsError.message);
    throw new Error("Unable to check unread comments");
  }

  if (!comments?.length) return false;
  if (comments[0].author_id === user.id) return false;

  const { data: readState, error: readError } = await supabase
    .from("lead_comment_reads")
    .select("last_read_at")
    .eq("lead_id", parsed.data)
    .eq("user_id", user.id)
    .maybeSingle();

  if (readError) {
    console.error("[comments] hasUnreadComments read-state failed", readError.message);
    throw new Error("Unable to check unread comments");
  }

  if (!readState?.last_read_at) return true;
  return new Date(comments[0].created_at) > new Date(readState.last_read_at);
}

export async function addLeadComment(leadId: string, message: string): Promise<ActionResult> {
  const user = await getUserWithRole();
  if (!user) return { success: false, error: "Unauthorized" };

  const idParsed = leadIdSchema.safeParse(leadId);
  if (!idParsed.success) return { success: false, error: "Invalid lead id" };

  const msgParsed = commentMessageSchema.safeParse(message);
  if (!msgParsed.success) {
    return { success: false, error: msgParsed.error.errors[0]?.message ?? "Invalid comment" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("lead_comments").insert({
    lead_id: idParsed.data,
    author_id: user.id,
    message: msgParsed.data,
  });

  if (error) return { success: false, error: publicActionError("Unable to add comment", error) };

  return { success: true };
}

export async function markCommentsRead(leadId: string): Promise<ActionResult> {
  const user = await getUserWithRole();
  if (!user) return { success: false, error: "Unauthorized" };

  const parsed = leadIdSchema.safeParse(leadId);
  if (!parsed.success) return { success: false, error: "Invalid lead id" };

  const supabase = await createClient();
  const { error } = await supabase.from("lead_comment_reads").upsert({
    lead_id: parsed.data,
    user_id: user.id,
    last_read_at: new Date().toISOString(),
  });
  if (error) {
    return { success: false, error: publicActionError("Unable to mark comments read", error) };
  }
  return { success: true };
}
