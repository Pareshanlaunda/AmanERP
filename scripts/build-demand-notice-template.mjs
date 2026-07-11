/**
 * Builds templates/notices/demand-notice.docx — formal letter layout matching sample:
 * letterhead (dual logos) → BY POST/HAND/EMAIL → Ref | Date → To → Copy To → SUBJECT → body.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PizZip from "pizzip";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "templates", "notices");
const outFile = path.join(outDir, "demand-notice.docx");

function escapeXml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Times New Roman run props */
function rPr(opts = {}) {
  const parts = [
    `<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>`,
    `<w:sz w:val="${opts.size ?? 22}"/><w:szCs w:val="${opts.size ?? 22}"/>`,
  ];
  if (opts.bold) parts.push(`<w:b/><w:bCs/>`);
  if (opts.underline) parts.push(`<w:u w:val="single"/>`);
  return `<w:rPr>${parts.join("")}</w:rPr>`;
}

function p(text, opts = {}) {
  const after = opts.after ?? 0;
  const before = opts.before ?? 0;
  const line = opts.line ?? 240; // single spacing (match reference notice)
  let jc = "";
  if (opts.center) jc = `<w:jc w:val="center"/>`;
  else if (opts.right) jc = `<w:jc w:val="right"/>`;
  else if (opts.both) jc = `<w:jc w:val="both"/>`;

  let ind = "";
  let tabs = "";
  if (opts.hanging != null) {
    const left = opts.indentLeft ?? opts.hanging;
    ind = `<w:ind w:left="${left}" w:hanging="${opts.hanging}"/>`;
    tabs = `<w:tabs><w:tab w:val="left" w:pos="${left}"/></w:tabs>`;
  } else if (opts.indentLeft != null) {
    ind = `<w:ind w:left="${opts.indentLeft}"/>`;
  }

  return `<w:p>
    <w:pPr>
      ${jc}
      ${tabs}
      ${ind}
      <w:spacing w:before="${before}" w:after="${after}" w:line="${line}" w:lineRule="auto"/>
    </w:pPr>
    <w:r>${rPr(opts)}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>
  </w:p>`;
}

function blank(after = 80) {
  return `<w:p><w:pPr><w:spacing w:after="${after}"/></w:pPr></w:p>`;
}

function cell(innerXml, widthTwips, opts = {}) {
  const vAlign = opts.vCenter ? `<w:vAlign w:val="center"/>` : "";
  return `<w:tc>
    <w:tcPr><w:tcW w:w="${widthTwips}" w:type="dxa"/>${vAlign}</w:tcPr>
    ${innerXml}
  </w:tc>`;
}

const headerTable = `<w:tbl>
  <w:tblPr>
    <w:tblW w:w="10080" w:type="dxa"/>
    <w:tblBorders>
      <w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/>
      <w:insideH w:val="nil"/><w:insideV w:val="nil"/>
    </w:tblBorders>
  </w:tblPr>
  <w:tblGrid>
    <w:gridCol w:w="1440"/><w:gridCol w:w="7200"/><w:gridCol w:w="1440"/>
  </w:tblGrid>
  <w:tr>
    ${cell(p("{#has_logo}") + p("{%logo_left}", { center: true, after: 0 }) + p("{/has_logo}"), 1440, { vCenter: true })}
    ${cell(
      p("ADVOCATE {advocate_name}", { bold: true, center: true, size: 28, after: 40 }) +
        p("{advocate_office}", { center: true, size: 20, after: 40 }) +
        p("EMAIL - {advocate_email}", { center: true, size: 20, after: 40 }) +
        p("Mobile: {advocate_mobile}", { center: true, size: 20, after: 0 }),
      7200,
      { vCenter: true }
    )}
    ${cell(p("{#has_logo}") + p("{%logo_right}", { center: true, after: 0 }) + p("{/has_logo}"), 1440, { vCenter: true })}
  </w:tr>
</w:tbl>`;

const refDateTable = `<w:tbl>
  <w:tblPr>
    <w:tblW w:w="10080" w:type="dxa"/>
    <w:tblBorders>
      <w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/>
      <w:insideH w:val="nil"/><w:insideV w:val="nil"/>
    </w:tblBorders>
  </w:tblPr>
  <w:tblGrid><w:gridCol w:w="5040"/><w:gridCol w:w="5040"/></w:tblGrid>
  <w:tr>
    ${cell(p("Ref: {ref_number}", { bold: true, after: 0 }), 5040)}
    ${cell(p("Date: {notice_date}", { bold: true, right: true, after: 0 }), 5040)}
  </w:tr>
</w:tbl>`;

const body = [
  headerTable,
  blank(200),
  p("BY POST/HAND/EMAIL", { bold: true, center: true, underline: true, size: 22, after: 200 }),
  refDateTable,
  blank(200),
  p("To,", { bold: true, after: 60 }),
  p("{reply_to_name}", { bold: true, after: 40 }),
  p("{reply_to_address}", { after: 200 }),
  p("{#copy_to_advocate}"),
  p("Copy To,", { bold: true, after: 60 }),
  p("{copy_to_advocate_name}", { bold: true, after: 40 }),
  p("{copy_to_advocate_address}", { after: 200 }),
  p("{/copy_to_advocate}"),
  p(
    "SUBJECT: REPLY ON BEHALF OF {client_name_upper} TO THE ALLEGED DEMAND NOTICE DATED {subject_notice_date} SENT BY THE ABOVE ADDRESSEE",
    { bold: true, underline: true, after: 240 }
  ),
  // Small gap after main points (~4pt); sub-points stay after=0
  p(
    "1.\tThat I am writing on behalf of my client, {client_name}, in response to the Demand Notice dated {subject_notice_date} with reference number {reference_number_on_notice}, pertaining to the Loan account number {loan_id_bearing_no}, concerning the {reply_to_name} herein after referred 'Institution'.",
    { both: true, hanging: 360, indentLeft: 360, after: 80 }
  ),
  p(
    "2.\tThat my client denies all claims of intentional and deliberate default. My client has previously notified your institution about the financial circumstances and inability to pay the outstanding amounts through prior emails, telephone calls, and other forms of communication.",
    { both: true, hanging: 360, indentLeft: 360, after: 80 }
  ),
  p("3.", { hanging: 360, indentLeft: 360 }),
  p("{#reasons}"),
  p("{letter}\t{text}", { both: true, hanging: 360, indentLeft: 720 }),
  p("{/reasons}"),
  p(
    "4.\tThat, my client is not a wilful defaulter as per RBI notice number DBR. NO. CID. BC. 57/20.16.003/2014-2015 dated 07th January, 2015 under 2.1 'Definition of wilful default'. My client is a law-abiding citizen facing extreme financial difficulties and has always tried in good faith to meet all their financial obligations.",
    { both: true, hanging: 360, indentLeft: 360, before: 80, after: 80 }
  ),
  p(
    "5.\tThat, my client has initiated a request for settlement as per the RBI guidelines, notice no. RBI/2005-06/153 RPCD.PLNFS. BC.No.39 / 06.02.31/ 2005-06 dated 03rd September, 2005 under section 2(A) which covers Guidelines for one-time settlement of chronic NPAs.",
    { both: true, hanging: 360, indentLeft: 360, after: 80 }
  ),
  p(
    "6.\tThat, in view of the current situation, I kindly request your consideration of the following key points before proceeding:",
    { both: true, hanging: 360, indentLeft: 360 }
  ),
  p(
    "i.\tMy client is actively working to gather funds to settle their outstanding debts with your client.",
    { both: true, hanging: 360, indentLeft: 720 }
  ),
  p(
    "ii.\tMy client is fully committed to settling their dues in accordance with RBI settlement guidelines and is prepared to cooperate fully.",
    { both: true, hanging: 360, indentLeft: 720 }
  ),
  p(
    "iii.\tMy client respectfully asks your client to explore all feasible resolution options and provide relief measures, including but not limited to: granting a moratorium, waiving fines, late payment fees, penalties, and other charges, as well as offering settlement options tailored to my client's financial capacity.",
    { both: true, hanging: 360, indentLeft: 720, after: 80 }
  ),
  p(
    "7.\tThat, we request you to ensure that my client is NOT harassed or threatened by the recovery agents appointed by your client, as per RBI guidelines for recovery of loans (notice RBI/2006/167 DBOD.NO.BP. 40/21.04/21.04.158/ 2006-07 dated 03rd November, 2006).",
    { both: true, hanging: 360, indentLeft: 360, after: 80 }
  ),
  p(
    "8.\tThat, we request you to follow the guidelines on fair practices code for lenders DBOD. Leg. No.BC.104 /09.07.007/2002-03, dated 05th May, 2003.",
    { both: true, hanging: 360, indentLeft: 360, after: 80 }
  ),
  p(
    "9.\tThat, you are hereby called upon to cease any harassment calls, intimidation, threats to life and property, and to refrain from engaging in any other unwanted actions against my client.",
    { both: true, hanging: 360, indentLeft: 360, after: 80 }
  ),
  p(
    "10.\tThat, this notice is sent without prejudice to my client's other rights, claims, actions, interests, and contentions or any action or police complaint, criminal proceedings, civil proceedings already initiated or likely to be initiated against you and your agents.",
    { both: true, hanging: 360, indentLeft: 360, after: 80 }
  ),
  p(
    "11.\tThat, a copy of this Reply has been preserved in my office for record and future course of action. Please preserve the original copy of this notice as it may be asked to be produced before the appropriate court of law as and when required.",
    { both: true, hanging: 360, indentLeft: 360, after: 200 }
  ),
  p("Yours sincerely,", { after: 120 }),
  p("Advocate for {client_name_upper}", { after: 40 }),
  p("{#is_digital}"),
  p("{%signature}"),
  p("{/is_digital}"),
  p("{^is_digital}"),
  blank(400),
  blank(200),
  p("{/is_digital}"),
  p("ADVOCATE, {advocate_name}", { bold: true, after: 0 }),
].join("");

const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    ${body}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="720" w:right="1080" w:bottom="720" w:left="1080"/>
    </w:sectPr>
  </w:body>
</w:document>`;

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;

fs.mkdirSync(outDir, { recursive: true });
const zip = new PizZip();
zip.file("[Content_Types].xml", contentTypes);
zip.file("_rels/.rels", rels);
zip.file("word/document.xml", documentXml);
zip.file("word/_rels/document.xml.rels", docRels);
fs.writeFileSync(outFile, zip.generate({ type: "nodebuffer" }));
console.log("Wrote", outFile);
