/**
 * Builds templates/notices/response-pre-arbitration-s21.docx
 * Letterhead (dual logos) → rule → BY POST/HAND/EMAIL → Ref|Date → To → SUBJECT → body → signature.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PizZip from "pizzip";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "templates", "notices");
const outFile = path.join(outDir, "response-pre-arbitration-s21.docx");

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

/** Full-width horizontal rule under letterhead */
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
    "SUBJECT: RESPONSE TO PRE-ARBITRATION NOTICE UNDER SECTION 21 OF ARBITRATION AND CONCILIATION ACT, 1996",
    { bold: true, underline: true, after: 120 }
  ),
  p("Dear concerned,", { after: 80 }),
  p(
    "1.\tThat it has come to our attention that my client, {client_name_upper}, has been served with a Pre-Arbitration Notice under section 21 of Arbitration and Conciliation Act, 1996, dated {notice_date_long}, with reference number {reference_number_on_notice}, pertaining to the Loan account number {loan_id_bearing_no}.",
    { both: true, hanging: 360, indentLeft: 360, after: 80 }
  ),
  p(
    "2.\tThat we explicitly decline your invitation to arbitrate in this matter. We would like to highlight the absence of a fair opportunity in the appointment of an Arbitrator (under section 11 of the Arbitration and Conciliation Act, 1996) which is a quintessential step in any arbitration process. It is a prerequisite for a fair and unbiased arbitration procedure.",
    { both: true, hanging: 360, indentLeft: 360, after: 80 }
  ),
  p(
    "3.\tThat we would like to underscore the fact that our loan agreement did not contain any separate clause for the appointment of a sole arbitrator in case of default, neither did we agree to proceed with arbitration under a separate agreement. Therefore, this arbitration is against the principle of natural justice.",
    { both: true, hanging: 360, indentLeft: 360, after: 80 }
  ),
  p(
    "4.\tThat we do not approve and would like to challenge the appointment of the sole arbitrator under section 12 of the Arbitration and Conciliation Act, 1996 and as stated by the Honourable Supreme Court within the case of Perkins Eastman Architects DPC v. HSCC (India) Ltd. that a party who has interest within the outcome of the dispute cannot appoint a sole arbitrator unilaterally.",
    { both: true, hanging: 360, indentLeft: 360, after: 80 }
  ),
  p(
    "5.\tThat my client has already replied to your previous demand notice/loan recall notice/conciliation notice. My client, with all due diligence, has already informed your client about their financial situation and inability to pay their outstanding dues because of the recent job loss/business loss/loss in source of income, through previous emails, calls, and other communications as well as through telephonic conversations with recovery agents representing your client.",
    { both: true, hanging: 360, indentLeft: 360, after: 80 }
  ),
  p(
    "6.\tThat I would like to deny all allegations of intentional and deliberate default. I would humbly like to establish the fact that my client is not a wilful defaulter as she/he doesn't fit the definition of wilful default as per RBI notice number DBR. NO. CID. BC.57/20.16.003/2014-2015 dated 07/01/15. My client is a law-abiding citizen who is facing extreme financial difficulties and has always tried in good faith to meet all her/his financial obligations.",
    { both: true, hanging: 360, indentLeft: 360, after: 80 }
  ),
  p(
    "7.\tThat we extend this letter as a final opportunity for an amicable resolution in the best interest of both parties through arbitration via ODR. We suggest the medium of CADRe for resolution. We would like a fair opportunity for the appointment of an arbitrator in order to ensure neutrality, impartiality, and unbiasedness.",
    { both: true, hanging: 360, indentLeft: 360, after: 80 }
  ),
  p(
    "8.\tThat as we have already informed you about our financial difficulties and inability to meet the respective dues, we urge you to hold on any further interest or penalty(s). Accordingly, we request that any legal proceedings be immediately halted and/or adjourned as our request for settlement is currently pending and my client is systematically planning and organizing their finances in order to settle and close their accounts with all the lenders.",
    { both: true, hanging: 360, indentLeft: 360, after: 80 }
  ),
  p(
    "9.\tThat we request you to follow the guidelines on fair practices code for lenders DBOD. Leg. No.BC.104 /09.07.007/2002-03, dated 5th May, 2003. You are hereby called upon to cease any harassment calls, intimidation, threats to life and property, and to refrain from engaging in any other unwanted actions against my client. We hereby put your client on notice that, in the event your client undertakes any harassment calls, intimidation, threats, maleficence, or frivolous legal action/litigation against my client, the same shall be defended by your client at your own costs, risks, and consequences.",
    { both: true, hanging: 360, indentLeft: 360, after: 80 }
  ),
  p(
    "10.\tThat my client has requested your client to ensure that they are NOT harassed or threatened by the recovery agents appointed by your client. If my client is harassed in any manner and RBI guidelines for recovery of loans as per notice RBI/2006/167 DBOD.NO.BP.40/21.04/21.04.158/ 2006-07 dated 03/11/2006 are not followed, my client reserves the right to initiate legal proceedings against your client.",
    { both: true, hanging: 360, indentLeft: 360, after: 80 }
  ),
  p(
    "11.\tThat, however, should you fail to comply with the requisitions in this notice, our client will have no choice but to initiate civil and criminal proceedings. These may include charges of harassment, criminal intimidation, threats to life, grievous harm, criminal breach of trust, and conspiracy for illegal recovery. The consequences of such actions will be entirely at your risk and cost.",
    { both: true, hanging: 360, indentLeft: 360, after: 80 }
  ),
  p(
    "12.\tThat this notice is sent to you without prejudice to my client's other rights, claims, actions, interests and contentions or any action or police complaint, criminal proceedings, civil proceedings already initiated or likely to be initiated against you and your agents as per the above notice. That this notice is sent to you without prejudice to my client's other rights, claims, actions, interests, and contentions, or any action, police complaint, criminal proceedings, or civil proceedings already initiated or likely to be initiated against you and your agents.",
    { both: true, hanging: 360, indentLeft: 360, after: 80 }
  ),
  p(
    "A copy of this Reply has been preserved in my office for record and future course of action. Please preserve the original copy of this notice as it may be required to be produced before an appropriate court of law as and when required.",
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
