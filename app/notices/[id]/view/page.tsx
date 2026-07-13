import { notFound } from "next/navigation";
import { z } from "zod";
import { assertClientAccess } from "@/lib/auth/client-access";
import { requireUserWithRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";

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

  const pdfUrl = `/api/notices/${idParsed.data}/download?format=pdf&inline=1`;
  const docxUrl = `/api/notices/${idParsed.data}/download?format=docx`;

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold">Reply Notice</h1>
          <p className="truncate text-sm text-muted-foreground">{notice.notice_no}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <a
            href={docxUrl}
            className="inline-flex h-9 items-center rounded-md border px-3 text-sm hover:bg-accent"
          >
            Download Word
          </a>
          <a
            href={pdfUrl}
            download
            className="inline-flex h-9 items-center rounded-md border px-3 text-sm hover:bg-accent"
          >
            Download PDF
          </a>
        </div>
      </header>
      <iframe title="Notice document" src={pdfUrl} className="min-h-0 w-full flex-1 border-0" />
    </div>
  );
}
