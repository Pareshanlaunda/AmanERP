/**
 * Sample Legal Notice Against Defamation (NINAD SHIRDHANKAR).
 * Output: samples/sample-defamation-notice.docx
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const PizZip = (await import("pizzip")).default;
const Docxtemplater = (await import("docxtemplater")).default;
const ImageModule = (await import("docxtemplater-image-module-free")).default;

const logoPath = path.join(root, "public", "branding", "dfl-logo-print.png");
const fallbackLogo = path.join(root, "public", "branding", "dfl-logo.png");
const noticesLogo = path.join(root, "public", "notices", "logo.png");
const sigPath = path.join(root, "public", "notices", "signature-placeholder.png");
const templatePath = path.join(root, "templates", "notices", "legal-notice-against-defamation.docx");
const outDir = path.join(root, "samples");
const outFile = path.join(outDir, "sample-defamation-notice.docx");
const downloadsCopy = path.join("C:\\Users\\Dell\\Downloads", "sample-defamation-notice.docx");

const resolvedLogo = fs.existsSync(logoPath)
  ? logoPath
  : fs.existsSync(fallbackLogo)
    ? fallbackLogo
    : noticesLogo;

const data = {
  advocate_name: "Kunal Gode",
  advocate_email: "advocate907@lawyerpanel.org",
  advocate_mobile: "+91 98765 43210",
  advocate_office: "Delhi NCR Office: B-33, Sector-2, Noida, Uttar Pradesh",
  ref_number: "CLID2026071001/JUL/2026",
  notice_date_long: "10 July 2026",
  reply_to_name: "The Manager / Authorized Officer",
  reply_to_address: "Concerned Bank / NBFC\n(As per loan account records)",
  client_name: "Ninad Shirdhankar",
  client_name_upper: "NINAD SHIRDHANKAR",
  client_ro: "784 Garava Aalawa Deulwadi Opp Navlai Mandir Jakimirya Ratnagiri Ratnagiri 415612",
  loan_of_rs: "328610",
  emis_amounting_to_rs: "15526",
  criminal_charges_payment_rs: "50000",
  is_digital: true,
  has_logo: fs.existsSync(resolvedLogo),
  logo: fs.existsSync(resolvedLogo) ? "logo" : null,
  logo_left: fs.existsSync(resolvedLogo) ? "logo" : null,
  logo_right: null,
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
      if (fs.existsSync(resolvedLogo)) return fs.readFileSync(resolvedLogo);
    }
    if (tagValue === "signature" && fs.existsSync(sigPath)) {
      return fs.readFileSync(sigPath);
    }
    return emptyPng;
  },
  getSize(_img, tagValue) {
    if (tagValue === "logo" || tagValue === "logo_left" || tagValue === "logo_right") {
      return [110, 110];
    }
    if (tagValue === "signature") return [210, 80];
    return [160, 60];
  },
};

if (!fs.existsSync(templatePath)) {
  console.error("Template missing:", templatePath);
  console.error("Run: node scripts/build-defamation-notice-template.mjs");
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
try {
  fs.copyFileSync(outFile, downloadsCopy);
  console.log("Copied", downloadsCopy);
} catch (err) {
  console.warn(
    "Could not copy to Downloads (file may be open):",
    err instanceof Error ? err.message : err
  );
}
