import { requireUserWithRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function NoticeViewPage({ params }: PageProps) {
  await requireUserWithRole(["admin", "employee"]);
  const { id } = await params;
  const supabase = await createClient();

  const { data: notice } = await supabase
    .from("client_notices")
    .select("id, notice_no, client_onboarding_id")
    .eq("id", id)
    .maybeSingle();

  if (!notice) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 text-muted-foreground">
        Notice not found.
      </main>
    );
  }

  const pdfUrl = `/api/notices/${id}/download?format=pdf&inline=1`;
  const docxUrl = `/api/notices/${id}/download?format=docx`;

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
