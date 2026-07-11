/**
 * Generates a sample Demand Notice DOCX for structure review.
 * Output: samples/sample-demand-notice-structure.docx
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

// Use compiled path via dynamic import of TS is hard; call generate via next isn't available.
// Inline: load generate from dist OR duplicate minimal render using same libs as generate.ts
const PizZip = (await import("pizzip")).default;
const Docxtemplater = (await import("docxtemplater")).default;
const ImageModule = (await import("docxtemplater-image-module-free")).default;

const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
function ordinal(day) {
  const j = day % 10, k = day % 100;
  if (j === 1 && k !== 11) return `${day}st`;
  if (j === 2 && k !== 12) return `${day}nd`;
  if (j === 3 && k !== 13) return `${day}rd`;
  return `${day}th`;
}
function formatNoticeDate(iso) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return `${ordinal(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

const reasons = [
  {
    letter: "i.",
    text: "That my client is facing significant financial difficulties and instability and is not in a position to pay the outstanding dues or subsequent EMIs as a consequence of recent job loss and absence of any other source of income.",
  },
  {
    letter: "ii.",
    text: "That my client has incurred substantial loss in business and in absence of any other source of income is unable to pay the outstanding dues or EMIs.",
  },
  {
    letter: "iii.",
    text: "That my client is unable to pay the outstanding dues due to medical emergency and expenses suffered due to it. My client has already requested a settlement of the dues based on their limited financial capacity in absence of any other source of income.",
  },
  {
    letter: "iv.",
    text: "That my client has faced significant losses in online trading betting online fraud. It is noteworthy that Indian law does not explicitly prohibit or regulate online betting or wagering activities. These pursuits inherently involve uncertainty and unpredictability with outcomes largely dependent on volatile factors beyond individual control. My client has now understood this but is unfortunately unable to recover the losses. We have diligently informed your client of this predicament through various means including direct communication with recovery agents.",
  },
];

const noticeDate = formatNoticeDate("2026-06-11");
const logoPath = path.join(root, "public", "notices", "logo.png");
const sigPath = path.join(root, "public", "notices", "signature-placeholder.png");
const templatePath = path.join(root, "templates", "notices", "demand-notice.docx");
const outDir = path.join(root, "samples");
const outFile = path.join(outDir, "sample-demand-notice-structure.docx");

const data = {
  advocate_name: "AUM KHARBANDA",
  advocate_email: "advocate907@lawyerpanel.org",
  advocate_mobile: "+91 98765 43210",
  advocate_office: "Delhi NCR Office: B-33, Sector-2, Noida, Uttar Pradesh",
  notice_no: "CT298764837/JUN/2026",
  notice_date: noticeDate,
  expiry_date: formatNoticeDate("2026-07-11"),
  loan_id_bearing_no: "LOAN-998877",
  ref_number: "CT298764837/JUN/2026",
  reply_to_name: "SBI Cards & Payment Services Ltd.",
  reply_to_address:
    "401 & 402, 4th Floor, Aggarwal\nMillennium Tower, E 1,2,3, Netaji\nSubhash Place, Wazirpur, New Delhi –\n110034",
  client_name: "MD Ghani",
  client_name_upper: "MD GHANI",
  reference_number_on_notice: "DN-2026-0611",
  copy_to_advocate: true,
  copy_to_advocate_name: "Sagar Aggarwal, Advocate Areness\nAttorneys",
  copy_to_advocate_address:
    "5, Sardar Patel Marg, Diplomatic Enclave,\nChanakyapuri, New Delhi –110021",
  subject_notice_date: noticeDate,
  reasons,
  has_reasons: true,
  is_digital: true,
  has_logo: fs.existsSync(logoPath),
  logo: fs.existsSync(logoPath) ? "logo" : null,
  logo_left: fs.existsSync(logoPath) ? "logo" : null,
  logo_right: fs.existsSync(logoPath) ? "logo" : null,
  signature: fs.existsSync(sigPath) ? "signature" : null,
};

const emptyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

const imageOpts = {
  centered: false,
  getImage(tagValue) {
    if (tagValue === "logo" || tagValue === "logo_left" || tagValue === "logo_right") {
      if (fs.existsSync(logoPath)) return fs.readFileSync(logoPath);
    }
    if (tagValue === "signature" && fs.existsSync(sigPath)) {
      return fs.readFileSync(sigPath);
    }
    return emptyPng;
  },
  getSize(_img, tagValue) {
    if (tagValue === "logo" || tagValue === "logo_left" || tagValue === "logo_right") {
      return [72, 72];
    }
    if (tagValue === "signature") return [210, 80];
    return [160, 60];
  },
};

if (!fs.existsSync(templatePath)) {
  console.error("Template missing. Run: node scripts/build-demand-notice-template.mjs");
  process.exit(1);
}

const content = fs.readFileSync(templatePath);
const zip = new PizZip(content);
const doc = new Docxtemplater(zip, {
  paragraphLoop: true,
  linebreaks: true,
  modules: [new ImageModule(imageOpts)],
});
doc.render(data);

fs.mkdirSync(outDir, { recursive: true });
const buf = doc.getZip().generate({ type: "nodebuffer" });
fs.writeFileSync(outFile, buf);
console.log("Wrote", outFile, `(${buf.length} bytes)`);
console.log("Open this file to review letter structure + reasons a)–d).");
