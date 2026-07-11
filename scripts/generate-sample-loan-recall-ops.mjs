/**
 * Sample merge for Loan Recall Ops reply.
 * Output: samples/sample-loan-recall-ops.docx (+ Downloads copy)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import ImageModule from "docxtemplater-image-module-free";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const templatePath = path.join(root, "templates", "notices", "loan-recall-ops-reply.docx");
const outDir = path.join(root, "samples");
const outFile = path.join(outDir, "sample-loan-recall-ops.docx");
const downloadsCopy = path.join("C:\\Users\\Dell\\Downloads", "sample-loan-recall-ops.docx");

const AGENT_BEHAVIOR_TEXT =
  "The Lender mention of taking criminal action against my client in the loan recall notice appears unnecessary and potentially mala fide, given our previous communication regarding the Client financial situation and the obstacles the Client faces in paying the EMIs. Regarding the proposed arbitration and conciliation under the Arbitration and Conciliation Act 1996, we are prepared to proceed only if a sole arbitrator is appointed by SAMA or Presolv360, and if we can settle the outstanding dues through an online dispute resolution system. If any action is initiated against my client under section 138 of the Negotiable Instrument Act or under section 25 of the Payment and Settlement System Act, as mentioned in the loan recall notice, we are prepared to face the due process of law and court. Furthermore, we request that the Lender ensure my client is not harassed or threatened by appointed recovery agents, in accordance with RBI guidelines for recovery of loans as per notice RBI/2006/167 DBOD.NO.BP.40/21.04/21.04.158/2006-07 dated 03/11/2006.";

if (!fs.existsSync(templatePath)) {
  console.error("Missing template. Run: node scripts/build-loan-recall-ops-template.mjs");
  process.exit(1);
}

const logoPath = path.join(root, "public", "notices", "logo.png");
const sigPath = path.join(root, "public", "notices", "signature-placeholder.png");

const imageOpts = {
  centered: false,
  fileType: "docx",
  getImage(tagValue) {
    if (tagValue === "logo" && fs.existsSync(logoPath)) return fs.readFileSync(logoPath);
    if (tagValue === "signature" && fs.existsSync(sigPath)) return fs.readFileSync(sigPath);
    return Buffer.alloc(0);
  },
  getSize() {
    return [90, 90];
  },
};

const zip = new PizZip(fs.readFileSync(templatePath));
const doc = new Docxtemplater(zip, {
  paragraphLoop: true,
  linebreaks: true,
  modules: [new ImageModule(imageOpts)],
});

doc.render({
  advocate_name: "KUNAL GODE",
  advocate_office: "Delhi NCR Office: B-33, Sector-2, Noida, Uttar Pradesh",
  advocate_email: "advocate684@lawyerpanel.org",
  advocate_mobile: "+91- 9667064009",
  has_logo: fs.existsSync(logoPath),
  logo_left: fs.existsSync(logoPath) ? "logo" : null,
  logo_right: fs.existsSync(logoPath) ? "logo" : null,
  notice_no: "CT298755527/APR/2026",
  letter_date_long: "20 April 2026",
  notice_date_long: "09 April 2026",
  reply_to_name: "SMFG India Credit Company Limited",
  reply_to_address:
    "10th Floor, Office No. 101-103, 2 North Avenue, Maker Maxity, Bandra Kurla Complex (BKC), Bandra (East), Mumbai - 400051",
  copy_to_advocate: true,
  copy_to_advocate_name: "Adv. Chaitan C. Kini",
  copy_to_advocate_address:
    "201, Samarth Penidanekar House Heights, opp. Civil Hospital, Pimpalpada, Thane (W) - 400601",
  client_name_upper: "NINAD SHIRDHANKAR",
  reference_number_on_notice: "07002212137838 / PL - Sal / 2026-04-09/2039",
  loan_id_bearing_no: "107002212137838",
  intimation_mail_date_long: "03 February 2026",
  agent_behavior: false,
  agent_behavior_text: AGENT_BEHAVIOR_TEXT,
  is_digital: true,
  signature: fs.existsSync(sigPath) ? "signature" : null,
});

fs.mkdirSync(outDir, { recursive: true });
const buf = doc.getZip().generate({ type: "nodebuffer" });
fs.writeFileSync(outFile, buf);
try {
  fs.writeFileSync(downloadsCopy, buf);
  console.log("Wrote", outFile, "and", downloadsCopy);
} catch {
  console.log("Wrote", outFile);
}
