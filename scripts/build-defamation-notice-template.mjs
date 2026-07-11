/**
 * Builds templates/notices/legal-notice-against-defamation.docx
 * Letterhead: DFL logo left + advocate right → Ref/Date → THROUGH… → To → SUBJECT → body.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PizZip from "pizzip";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "templates", "notices");
const outFile = path.join(outDir, "legal-notice-against-defamation.docx");

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

function cell(innerXml, widthTwips, opts = {}) {
  const vAlign = opts.vCenter ? `<w:vAlign w:val="center"/>` : "";
  return `<w:tc>
    <w:tcPr><w:tcW w:w="${widthTwips}" w:type="dxa"/>${vAlign}</w:tcPr>
    ${innerXml}
  </w:tc>`;
}

/** Logo left (DFL) + advocate name/office right — matches sample letterhead. */
const headerTable = `<w:tbl>
  <w:tblPr>
    <w:tblW w:w="10080" w:type="dxa"/>
    <w:tblBorders>
      <w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/>
      <w:insideH w:val="nil"/><w:insideV w:val="nil"/>
    </w:tblBorders>
  </w:tblPr>
  <w:tblGrid>
    <w:gridCol w:w="3600"/><w:gridCol w:w="6480"/>
  </w:tblGrid>
  <w:tr>
    ${cell(
      p("{#has_logo}") + p("{%logo_left}", { after: 0 }) + p("{/has_logo}"),
      3600,
      { vCenter: true }
    )}
    ${cell(
      p("Advocate {advocate_name}", { right: true, size: 36, after: 40 }) +
        p("{advocate_office}", { right: true, size: 18, font: "Arial", after: 0 }),
      6480,
      { vCenter: true }
    )}
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
    ${cell(p("Ref No.{ref_number}", { after: 0 }), 5040)}
    ${cell(p("Dated: {notice_date_long}", { right: true, after: 0 }), 5040)}
  </w:tr>
</w:tbl>`;

const body = [
  headerTable,
  blank(160),
  refDateTable,
  blank(200),
  p("THROUGH SPEED POST/WHATSAPP/E-MAIL", {
    bold: true,
    center: true,
    underline: true,
    after: 0,
  }),
  p("WITHOUT PREJUDICE", {
    bold: true,
    center: true,
    underline: true,
    after: 200,
  }),
  p("To,", { bold: true, after: 40 }),
  p("{reply_to_name}", { bold: true, after: 40 }),
  p("{reply_to_address}", { after: 160 }),
  p(
    "SUBJECT: LEGAL NOTICE AGAINST CRIMINAL DEFAMATION DONE BY THE AGENTS OF THE ADDRESSEE ABOVEMENTIONED",
    { bold: true, underline: true, after: 120 }
  ),
  p("Dear Sir/Madam,", { after: 80 }),
  p(
    "The undersigned, on behalf of my Client {client_name_upper}, R/O {client_ro} do hereby serve upon you the following legal notice under section 499 of The Indian Penal Code, 1860:",
    { both: true, after: 80 }
  ),
  p(
    "1.\tThat a loan of Rs. {loan_of_rs}/- was sanctioned in my client's name by your bank.",
    { both: true, hanging: 360, indentLeft: 360, after: 80 }
  ),
  p(
    "2.\tThat as per the agreement between us, My Client has paid all the EMI's amounting to Rs {emis_amounting_to_rs}/-.",
    { both: true, hanging: 360, indentLeft: 360, after: 80 }
  ),
  p(
    "3.\tThat my Client defaulted on the payment of the EMI(s) due to genuine reasons and conveyed the same to your bank as well as the agents.",
    { both: true, hanging: 360, indentLeft: 360, after: 80 }
  ),
  p(
    "4.\tThat soon after expressing his inability to pay the aforesaid EMI, my Client was visited by the recovery agent(s) of the bank who started to openly spread his financial woes to his distant relatives, friends and colleagues falsely claiming that he is a willful defaulter and a person of ill-repute. The recovery agents then proceeded to threaten my Client to cause him and his immediate family irreparable loss of reputation if he did not pay the EMI with immediately.",
    { both: true, hanging: 360, indentLeft: 360, after: 80 }
  ),
  p(
    "5.\tThat post that the agent(s) reached out to my clients known people where my client is known and spread falsehoods / threatened to spread falsehoods and cause my client to lose his rapport if he did not pay the amount immediately wherein repercussions were faced by my client.",
    { both: true, hanging: 360, indentLeft: 360, after: 80 }
  ),
  p(
    "6.\tThat the agent(s) not only verbally abused my client but also threatened and humiliated my client in public and violated his right to dignity and right against defamation granted to him by the Constitution under article 21.",
    { both: true, hanging: 360, indentLeft: 360, after: 80 }
  ),
  p(
    "7.\tThat the actions and behavior of the agents was extremely unethical and inappropriate and they did not adhere to the RBI guidelines and they were not trained according to the same.",
    { both: true, hanging: 360, indentLeft: 360, after: 80 }
  ),
  p("Therefore,", { bold: true, after: 80 }),
  p(
    "We hereby call upon you through this Notice, to make the payment of the Rs. 50000/- to my Client, within the period of 15 days of receipt of this Notice, failing which criminal charges will be framed against you, under section 499 of IPC in the competent court of law and in that event, you will be fully responsible for all costs, risks, responsibilities, expenses and consequences thereof and you can be punished for imprisonment which may extend to two years, or with fine or both.",
    { both: true, after: 80 }
  ),
  p(
    "A copy of this Notice is kept in my office for record and further necessary action and you are also advised to keep the copy safe as you would be asked to produce in the court.",
    { both: true, after: 160 }
  ),
  p("For and on behalf of {client_name_upper}", { after: 120 }),
  p("{#is_digital}"),
  p("{%signature}"),
  p("{/is_digital}"),
  p("{^is_digital}"),
  blank(400),
  blank(200),
  p("{/is_digital}"),
  p("Advocate {advocate_name}", { bold: true, after: 0 }),
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
