import { notFound } from "next/navigation";
import { z } from "zod";
import { assertClientAccess } from "@/lib/auth/client-access";
import { requireUserWithRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { NoticeViewActions } from "@/components/shared/notice-view-actions";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function NoticeViewPage({ params }: PageProps) {
  const user = await requireUserWithRole(["admin", "employee"]);
  const { id } = await params;
  const idParsed = z.string().uuid().safeParse(id);
  if (!idParsed.success) notFound();

  const supabase = await createClient();

  const { data: notice } = await supabase
    .from("client_notices")
    .select("id, notice_no, client_onboarding_id")
    .eq("id", idParsed.data)
    .maybeSingle();

  if (!notice) notFound();

  const access = await assertClientAccess(
    supabase,
    notice.client_onboarding_id as string,
    user.id,
    user.role
  );
  if (!access.ok) notFound();

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold">Reply Notice</h1>
          <p className="truncate text-sm text-muted-foreground">{notice.notice_no}</p>
        </div>
      </header>
      <NoticeViewActions
        noticeId={idParsed.data}
        noticeNo={String(notice.notice_no)}
      />
    </div>
  );
}
