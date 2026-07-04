"use server";

import { getUserWithRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import type { LeadComment } from "@/lib/types/database";

export type ActionResult = { success: true } | { success: false; error: string };

export async function getLeadComments(leadId: string): Promise<LeadComment[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lead_comments")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true })
    .limit(50);

  return (data ?? []) as LeadComment[];
}

export async function hasUnreadComments(leadId: string): Promise<boolean> {
  const user = await getUserWithRole();
  if (!user) return false;

  const supabase = await createClient();
  const { data: comments } = await supabase
    .from("lead_comments")
    .select("created_at, author_id")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!comments?.length) return false;
  if (comments[0].author_id === user.id) return false;

  const { data: readState } = await supabase
    .from("lead_comment_reads")
    .select("last_read_at")
    .eq("lead_id", leadId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!readState?.last_read_at) return true;
  return new Date(comments[0].created_at) > new Date(readState.last_read_at);
}

export async function addLeadComment(leadId: string, message: string): Promise<ActionResult> {
  const user = await getUserWithRole();
  if (!user) return { success: false, error: "Unauthorized" };

  const trimmed = message.trim();
  if (!trimmed) return { success: false, error: "Comment cannot be empty" };

  const supabase = await createClient();
  const { error } = await supabase.from("lead_comments").insert({
    lead_id: leadId,
    author_id: user.id,
    message: trimmed,
  });

  if (error) return { success: false, error: error.message };

  return { success: true };
}

export async function markCommentsRead(leadId: string) {
  const user = await getUserWithRole();
  if (!user) return;

  const supabase = await createClient();
  await supabase.from("lead_comment_reads").upsert({
    lead_id: leadId,
    user_id: user.id,
    last_read_at: new Date().toISOString(),
  });
}
