/**
 * Sample Response To Pre-arbitration Notice Under Section 21 (NINAD SHIRDHANKAR).
 * Output: samples/sample-pre-arb-s21.docx
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const PizZip = (await import("pizzip")).default;
const Docxtemplater = (await import("docxtemplater")).default;
const ImageModule = (await import("docxtemplater-image-module-free")).default;

const logoPath = path.join(root, "public", "notices", "logo.png");
const sigPath = path.join(root, "public", "notices", "signature-placeholder.png");
const templatePath = path.join(root, "templates", "notices", "response-pre-arbitration-s21.docx");
const outDir = path.join(root, "samples");
const outFile = path.join(outDir, "sample-pre-arb-s21.docx");
const downloadsCopy = path.join("C:\\Users\\Dell\\Downloads", "sample-pre-arb-s21.docx");

const data = {
  advocate_name: "Kunal Gode",
  advocate_email: "advocate684@lawyerpanel.org",
  advocate_mobile: "+91- 9667064009",
  advocate_office: "Delhi NCR Office: B-33, Sector-2, Noida, Uttar Pradesh",
  notice_no: "CT298755527/JUN/2026",
  letter_date_long: "27 June 2026",
  notice_date_long: "22 June 2026",
  reply_to_name: "Whizdm Finance Private Limited",
  reply_to_address:
    "3rd Floor, 17/1, The Address Building, Outer Ring Road Marthahalli, Kadubeesenahalli, Bangalore-560087",
  client_name: "Ninad Shirdhankar",
  client_name_upper: "NINAD SHIRDHANKAR",
  reference_number_on_notice: "A492742",
  loan_id_bearing_no: "176957174772",
  copy_to_advocate: false,
  copy_to_advocate_name: "",
  copy_to_advocate_address: "",
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
  console.error("Template missing:", templatePath);
  console.error("Run: node scripts/build-pre-arb-s21-template.mjs");
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
fs.copyFileSync(outFile, downloadsCopy);
console.log("Wrote", outFile, "(" + buf.length + " bytes)");
console.log("Copied", downloadsCopy);