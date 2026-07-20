"use client";

type Props = {
  noticeId: string;
  noticeNo: string;
};

/**
 * No iframe — global CSP/XFO block framed PDFs ("site blocked / contact owner").
 * Native browser PDF viewer via top-level navigation.
 */
export function NoticeViewActions({ noticeId, noticeNo }: Props) {
  const pdfUrl = `/api/notices/${noticeId}/download?format=pdf&inline=1`;
  const docxUrl = `/api/notices/${noticeId}/download?format=docx`;

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 p-6">
      <div className="max-w-md text-center">
        <h2 className="font-display text-lg font-semibold tracking-tight">{noticeNo}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Open the PDF in your browser, or download Word / PDF.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Open PDF
        </a>
        <a
          href={docxUrl}
          className="inline-flex h-11 items-center rounded-md border px-4 text-sm hover:bg-accent"
        >
          Download Word
        </a>
        <a
          href={pdfUrl}
          download
          className="inline-flex h-11 items-center rounded-md border px-4 text-sm hover:bg-accent"
        >
          Download PDF
        </a>
      </div>
    </div>
  );
}
