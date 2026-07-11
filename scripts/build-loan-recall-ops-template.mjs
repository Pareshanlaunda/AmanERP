/**
 * Builds templates/notices/loan-recall-ops-reply.docx
 * Letterhead (dual logos) → rule → BY POST/HAND/EMAIL → Ref|Date → To → SUBJECT → body → signature.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PizZip from "pizzip";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "templates", "notices");
const outFile = path.join(outDir, "loan-recall-ops-reply.docx");

function escapeXml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function rPr(opts = {}) {
  const font = opts.font ?? "Times New Roman";
  const parts = [
    `<w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/>`,
    `<w:sz w:val="${opts.size ?? 22}"/><w:szCs w:val="${opts.size ?? 22}"/>`,
  ];
  if (opts.bold) parts.push(`<w:b/><w:bCs/>`);
  if (opts.underline) parts.push(`<w:u w:val="single"/>`);
  return `<w:rPr>${parts.join("")}</w:rPr>`;
}

function p(text, opts = {}) {
  const after = opts.after ?? 0;
  const before = opts.before ?? 0;
  const line = opts.line ?? 240;
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

function hrule() {
  return `<w:p>
    <w:pPr>
      <w:pBdr>
        <w:bottom w:val="single" w:sz="18" w:space="1" w:color="000000"/>
      </w:pBdr>
      <w:spacing w:before="120" w:after="200"/>
    </w:pPr>
  </w:p>`;
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
        p("EMAIL - {advocate_email}", { center: true, size: 20, after: 0 }),
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
    ${cell(p("Ref: {notice_no}", { bold: true, after: 0 }), 5040)}
    ${cell(p("Date: {letter_date_long}", { bold: true, right: true, after: 0 }), 5040)}
  </w:tr>
</w:tbl>`;

const body = [
  headerTable,
  hrule(),
  p("BY POST/HAND/EMAIL", { bold: true, center: true, underline: true, after: 200 }),
  refDateTable,
  blank(160),
  p("To,", { bold: true, after: 40 }),
  p("{reply_to_name}", { bold: true, after: 40 }),
  p("{reply_to_address}", { after: 120 }),
  p("{#copy_to_advocate}"),
  p("Copy To,", { bold: true, after: 40 }),
  p("{copy_to_advocate_name}", { bold: true, after: 40 }),
  p("{copy_to_advocate_address}", { after: 120 }),
  p("{/copy_to_advocate}"),
  p(
    "SUBJECT: REPLY ON BEHALF OF {client_name_upper} TO THE ALLEGED LOAN RECALL NOTICE DATED {notice_date_long} SENT BY THE ABOVE",
    { bold: true, underline: true, after: 120 }
  ),
  p("Dear concerned,", { after: 80 }),
  p(
    "1.\tThat it has come to our attention that my client, {client_name_upper}, has been served with a Loan Recall Notice dated {notice_date_long} with reference number {reference_number_on_notice}, pertaining to the Loan account number {loan_id_bearing_no}.",
    { both: true, hanging: 360, indentLeft: 360, after: 80 }
  ),
  p(
    '2.\tThat the notice alleges that my client has wilfully and deliberately defaulted on the Equated Monthly Instalments (EMI) obligations associated with the aforementioned account. Furthermore, it is claimed that my client has failed, neglected, and refused to regularize and settle the outstanding unsecured Credit Facilities extended by {reply_to_name} (hereinafter referred to as "the Lender").',
    { both: true, hanging: 360, indentLeft: 360, after: 80 }
  ),
  p(
    "3.\tThat we wish to clarify that this is not the case from our perspective, and it appears to be a misunderstanding. my client has previously communicated the client's situation through emails dated {intimation_mail_date_long}, other forms of communication (WhatsApp calls and messages), and telephonic conversations with recovery agents representing the Lender.",
    { both: true, hanging: 360, indentLeft: 360, after: 80 }
  ),
  p(
    "4.\tThat my client is currently facing severe financial distress, which has rendered the Client unable to fulfil the obligations regarding the Equated Monthly Instalments (EMI) payments or to continue servicing the outstanding dues. The gravity of the Client's financial predicament has been consistently and promptly communicated in our previous responses to the Lender's demand notices, wherein we have elucidated the nature and extent of the Client's financial constraints.",
    { both: true, hanging: 360, indentLeft: 360, after: 80 }
  ),
  p(
    "5.\tThat we respectfully submit that my client should not be classified as a wilful defaulter as per RBI notice number DBR. NO. CID. BC.57/20.16.003/2014-2015 dated 7th January, 2015, but rather as an obligor experiencing financial exigencies. The Client has demonstrably engaged in good faith efforts to address the Client's pecuniary obligations, including proactively initiating debt restructuring proceedings with the express purpose of discharging the Client's outstanding liabilities to all creditors.",
    { both: true, hanging: 360, indentLeft: 360, after: 80 }
  ),
  p(
    "6.\tThat my client is a law-abiding citizen facing extreme financial difficulties and has always attempted in good faith to meet all financial obligations. A request for settlement has been initiated as per the RBI guidelines, notice no. RBI/2005-06/153 RPCD.PLNFS. BC.No.39 / 06.02.31/ 2005-06 dated 3rd September, 2005 under section 2(A), which covers guidelines for one-time settlement of chronic NPAs. We urge the Lender to hold on any further interest or penalties, given our previously communicated financial difficulties and inability to meet the respective dues.",
    { both: true, hanging: 360, indentLeft: 360, after: 80 }
  ),
  p(
    "7.\tThat in light of the information provided, we request the Lender's consideration of the following points: my client is endeavouring to accumulate and organize funds to settle the Client's debt accounts with the Lender; the Client has every intention to settle the Client's dues as per the RBI rules for settlement and is ready to cooperate; and the Client amicably seeks to resolve this matter, requesting that the Lender explore all possible options for resolution and provide relief, including provision of a moratorium of appropriate tenure, waiving off fines, late payment fees, penalties, and other charges, as well as negotiating a repayment plan based on the Client's capacity to pay.",
    { both: true, hanging: 360, indentLeft: 360, after: 80 }
  ),
  p("{#agent_behavior}"),
  p(
    "8.\t{agent_behavior_text}",
    { both: true, hanging: 360, indentLeft: 360, after: 80 }
  ),
  p("{/agent_behavior}"),
  p(
    "9.\tThat we urge the Lender to adhere to the guidelines on fair practices code for lenders DBOD. Leg. No.BC.104 /09.07.007/2002-03, dated 5th May, 2003. The Lender is hereby called upon to cease any harassment calls, intimidation, threats to life and property, and to refrain from engaging in any other unwanted actions against my client. We put the Lender on notice that any harassment, intimidation, threats, maleficence, or frivolous legal action against my client shall be defended at the Lender's own costs, risks, and consequences.",
    { both: true, hanging: 360, indentLeft: 360, after: 80 }
  ),
  p(
    "That this notice is sent without prejudice to my client's other rights, claims, actions, interests, and contentions, or any action, police complaint, criminal proceedings, or civil proceedings already initiated or likely to be initiated against the Lender and the Lender's agents.",
    { both: true, after: 120 }
  ),
  p(
    "A copy of this reply has been preserved in our office for record and future course of action. Please preserve the original copy of this notice as it may be required to be produced before an appropriate court of law when necessary.",
    { both: true, after: 160 }
  ),
  p("Yours sincerely,", { after: 80 }),
  p("Advocate for {client_name_upper}", { after: 80 }),
  p("{#is_digital}"),
  p("{%signature}"),
  p("{/is_digital}"),
  p("{^is_digital}"),
  blank(400),
  blank(200),
  p("{/is_digital}"),
  p("ADVOCATE, {advocate_name}", { bold: true, after: 40 }),
  p("{advocate_mobile}", { bold: true, after: 0 }),
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
