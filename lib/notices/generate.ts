import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import ImageModule from "docxtemplater-image-module-free";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import ExcelJS from "exceljs";
import { buildReasonParagraphs } from "@/lib/notices/reason-options";
import { formatNoticeDate, formatNoticeDateLong, formatClidRef } from "@/lib/notices/format-notice-date";
import { DEFAMATION_CRIMINAL_CHARGES_RS } from "@/lib/notices/defamation-constants";
import {
  LOAN_RECALL_AGENT_BEHAVIOR_TEXT,
  LOAN_RECALL_OPS,
} from "@/lib/notices/loan-recall-constants";
import { getTemplateFieldConfig, PRE_ARB_S21 } from "@/lib/notices/template-fields";
import { resolveNoticeTemplateFile } from "@/lib/notices/template-types";

export type NoticeMergeInput = {
  template_type: string;
  notice_no: string;
  notice_date: string;
  expiry_date: string;
  loan_id_bearing_no: string;
  ref_number: string;
  reply_to_name: string;
  reply_to_address: string;
  reason_keys: string[];
  additional_reason?: string | null;
  copy_to_advocate: boolean;
  copy_to_advocate_name?: string | null;
  copy_to_advocate_address?: string | null;
  reference_number_on_notice: string;
  signature_mode: "digital" | "manual";
  enable_dates: boolean;
  client_name: string;
  signing_advocate_name: string;
  signing_advocate_email: string | null;
  signing_advocate_address?: string | null;
  signing_advocate_mobile?: string | null;
  advocate_office?: string | null;
  /** Defamation template fields */
  client_ro?: string | null;
  loan_of_rs?: string | null;
  emis_amounting_to_rs?: string | null;
  criminal_charges_payment_rs?: string | null;
  /** Loan recall Ops */
  agent_behavior?: boolean;
  intimation_mail_date?: string | null;
};

function templatesDir() {
  return path.join(process.cwd(), "templates", "notices");
}

function signaturePlaceholderPath() {
  return path.join(process.cwd(), "public", "notices", "signature-placeholder.png");
}

function logoPath() {
  return path.join(process.cwd(), "public", "notices", "logo.png");
}

/** DFL mark for Legal Notice Against Defamation letterhead (left).
 * Prefer print version (black on white) — white-on-black is invisible on paper.
 */
function defamationLogoPath() {
  const printLogo = path.join(process.cwd(), "public", "branding", "dfl-logo-print.png");
  if (fs.existsSync(printLogo)) return printLogo;
  const branding = path.join(process.cwd(), "public", "branding", "dfl-logo.png");
  if (fs.existsSync(branding)) return branding;
  return logoPath();
}

function logoPathForTemplate(templateType: string) {
  return templateType === "Legal Notice Against Defamation"
    ? defamationLogoPath()
    : logoPath();
}

function buildMergeData(input: NoticeMergeInput) {
  const reasons = buildReasonParagraphs(input.reason_keys, input.additional_reason);
  const noticeDateFmt = formatNoticeDate(input.notice_date);
  const noticeDateLong = formatNoticeDateLong(input.notice_date);
  const expiryDateFmt = formatNoticeDate(input.expiry_date);

  const normalizeMultiline = (value: string | null | undefined) =>
    (value ?? "").replace(/\r\n/g, "\n").trim();

  const fieldCfg = getTemplateFieldConfig(input.template_type);
  const refForDoc =
    fieldCfg?.showRefNumber === false
      ? input.ref_number
      : formatClidRef(input.ref_number);

  const isDefamation = input.template_type === "Legal Notice Against Defamation";
  const noticeLogo = logoPathForTemplate(input.template_type);
  const hasLogo = fs.existsSync(noticeLogo);

  return {
    advocate_name: input.signing_advocate_name.toUpperCase(),
    advocate_email: input.signing_advocate_email ?? "",
    advocate_mobile: input.signing_advocate_mobile ?? "",
    // Letterhead = our advocate employee (profile). Copy-to = lender's advocate (form).
    advocate_office:
      normalizeMultiline(input.signing_advocate_address) ||
      normalizeMultiline(input.advocate_office) ||
      "",
    notice_no: input.notice_no,
    notice_date: noticeDateFmt,
    notice_date_long: noticeDateLong,
    letter_date_long: formatNoticeDateLong(input.expiry_date),
    expiry_date: expiryDateFmt,
    loan_id_bearing_no: input.loan_id_bearing_no,
    ref_number: refForDoc,
    reply_to_name: input.reply_to_name.trim(),
    reply_to_address: normalizeMultiline(input.reply_to_address),
    client_name: input.client_name,
    client_name_upper: input.client_name.toUpperCase(),
    reference_number_on_notice: input.reference_number_on_notice,
    copy_to_advocate: Boolean(input.copy_to_advocate),
    copy_to_advocate_name: (input.copy_to_advocate_name ?? "").trim(),
    copy_to_advocate_address: normalizeMultiline(input.copy_to_advocate_address),
    enable_dates: input.enable_dates,
    subject_notice_date: noticeDateFmt,
    reasons,
    has_reasons: reasons.length > 0,
    signature_mode: input.signature_mode,
    is_digital: input.signature_mode === "digital",
    has_logo: hasLogo,
    logo: hasLogo ? "logo" : null,
    logo_left: hasLogo ? "logo" : null,
    logo_right: hasLogo && !isDefamation ? "logo" : null,
    signature: input.signature_mode === "digital" ? "signature" : null,
    client_ro: normalizeMultiline(input.client_ro),
    loan_of_rs: (input.loan_of_rs ?? "").trim(),
    emis_amounting_to_rs: (input.emis_amounting_to_rs ?? "").trim(),
    criminal_charges_payment_rs:
      input.template_type === "Legal Notice Against Defamation"
        ? DEFAMATION_CRIMINAL_CHARGES_RS
        : (input.criminal_charges_payment_rs ?? "").trim(),
    agent_behavior: Boolean(input.agent_behavior),
    agent_behavior_text: LOAN_RECALL_AGENT_BEHAVIOR_TEXT,
    intimation_mail_date_long: input.intimation_mail_date
      ? formatNoticeDateLong(input.intimation_mail_date)
      : "",
  };
}

export function generateNoticeDocx(input: NoticeMergeInput): Buffer {
  const fileName = resolveNoticeTemplateFile(input.template_type);
  const templatePath = path.join(templatesDir(), fileName);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Notice template not found: ${fileName}`);
  }

  const content = fs.readFileSync(templatePath);
  const zip = new PizZip(content);
  const data = buildMergeData(input);

  // Tiny valid PNG — image module crashes on empty buffers
  const emptyPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );

  const imageOpts = {
    centered: false,
    getImage(tagValue: string) {
      if (tagValue === "logo" || tagValue === "logo_left" || tagValue === "logo_right") {
        const p = logoPathForTemplate(input.template_type);
        if (fs.existsSync(p)) return fs.readFileSync(p);
      }
      if (tagValue === "signature") {
        const p = signaturePlaceholderPath();
        if (fs.existsSync(p)) return fs.readFileSync(p);
      }
      return emptyPng;
    },
    getSize(_img: Buffer, tagValue?: string): [number, number] {
      if (tagValue === "logo" || tagValue === "logo_left" || tagValue === "logo_right") {
        // DFL square mark — slightly larger on defamation letterhead
        if (input.template_type === "Legal Notice Against Defamation") {
          return [110, 110];
        }
        return [72, 72];
      }
      if (tagValue === "signature") {
        return [210, 80];
      }
      return [160, 60];
    },
  };

  try {
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      modules: [new ImageModule(imageOpts)],
    });
    doc.render(data);
    return doc.getZip().generate({ type: "nodebuffer" }) as Buffer;
  } catch {
    // Retry without image module if signature merge fails
    const zip2 = new PizZip(content);
    const doc2 = new Docxtemplater(zip2, {
      paragraphLoop: true,
      linebreaks: true,
    });
    doc2.render({ ...data, is_digital: false, has_logo: false, signature: "", logo: null });
    return doc2.getZip().generate({ type: "nodebuffer" }) as Buffer;
  }
}

/** Simple text PDF of the notice fields (letter layout stays in Word for v1). */
export async function generateNoticePdf(input: NoticeMergeInput): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  let page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const data = buildMergeData(input);
  let y = 800;
  const left = 50;
  const right = 545;
  const isDefamation = input.template_type === "Legal Notice Against Defamation";

  const line = (text: string, size = 11, useBold = false) => {
    const f = useBold ? bold : font;
    const paragraphs = String(text).split(/\n/);
    for (const para of paragraphs) {
      const lines = wrapText(para, 90);
      for (const l of lines) {
        if (y < 50) {
          y = 800;
          page = pdf.addPage([595, 842]);
        }
        page.drawText(l, { x: left, y, size, font: f, color: rgb(0.1, 0.1, 0.1) });
        y -= size + 2;
      }
    }
  };

  if (isDefamation) {
    // Letterhead: DFL logo left + advocate right (same row)
    const dflPath = defamationLogoPath();
    let logoH = 0;
    if (fs.existsSync(dflPath)) {
      try {
        const logoBytes = fs.readFileSync(dflPath);
        const png = await pdf.embedPng(logoBytes);
        const maxW = 90;
        const scale = Math.min(maxW / png.width, maxW / png.height);
        const w = png.width * scale;
        logoH = png.height * scale;
        page.drawImage(png, { x: left, y: y - logoH, width: w, height: logoH });
      } catch {
        // continue without logo
      }
    }
    const nameText = `Advocate ${data.advocate_name}`;
    const nameWidth = bold.widthOfTextAtSize(nameText, 16);
    page.drawText(nameText, {
      x: right - nameWidth,
      y: y - 14,
      size: 16,
      font: bold,
      color: rgb(0.1, 0.1, 0.1),
    });
    let officeY = y - 30;
    if (data.advocate_office) {
      const officeLines = wrapText(data.advocate_office, 42);
      for (const ol of officeLines) {
        const ow = font.widthOfTextAtSize(ol, 9);
        page.drawText(ol, {
          x: right - ow,
          y: officeY,
          size: 9,
          font,
          color: rgb(0.1, 0.1, 0.1),
        });
        officeY -= 12;
      }
    }
    y = Math.min(y - logoH, officeY) - 16;
  } else if (data.has_logo && fs.existsSync(logoPath())) {
    try {
      const logoBytes = fs.readFileSync(logoPath());
      const png = await pdf.embedPng(logoBytes);
      const maxW = 90;
      const scale = Math.min(maxW / png.width, maxW / png.height);
      const w = png.width * scale;
      const h = png.height * scale;
      page.drawImage(png, { x: (595 - w) / 2, y: y - h, width: w, height: h });
      y -= h + 16;
    } catch {
      // ignore bad logo; continue without it
    }
  }

  if (!isDefamation) {
    line(`ADVOCATE ${data.advocate_name}`, 14, true);
    if (data.advocate_office) line(data.advocate_office);
    if (data.advocate_email) line(`EMAIL - ${data.advocate_email}`);
    if (data.advocate_mobile) line(`Mobile: ${data.advocate_mobile}`);
    y -= 10;
    line("BY POST/HAND/EMAIL", 11, true);
    y -= 6;
  }

  // Ref left / Date right on one row
  {
    if (y < 50) {
      y = 800;
      page = pdf.addPage([595, 842]);
    }
    const isPreArb = input.template_type === PRE_ARB_S21;
    const isLoanRecall = input.template_type === LOAN_RECALL_OPS;
    const refText = isDefamation
      ? `Ref No.${data.ref_number}`
      : isPreArb || isLoanRecall
        ? `Ref: ${data.notice_no}`
        : `Ref: ${data.ref_number}`;
    const dateText = isDefamation
      ? `Dated: ${data.notice_date_long}`
      : isPreArb || isLoanRecall
        ? `Date: ${data.letter_date_long}`
        : `Date: ${data.notice_date}`;
    page.drawText(refText, {
      x: left,
      y,
      size: 11,
      font: bold,
      color: rgb(0.1, 0.1, 0.1),
    });
    const dateWidth = bold.widthOfTextAtSize(dateText, 11);
    page.drawText(dateText, {
      x: 595 - 50 - dateWidth,
      y,
      size: 11,
      font: bold,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 18;
  }

  y -= 6;

  if (isDefamation) {
    line("THROUGH SPEED POST/WHATSAPP/E-MAIL", 11, true);
    line("WITHOUT PREJUDICE", 11, true);
    y -= 10;
    line("To,", 11, true);
    line(data.reply_to_name, 11, true);
    line(data.reply_to_address);
    y -= 8;
    line(
      "SUBJECT: LEGAL NOTICE AGAINST CRIMINAL DEFAMATION DONE BY THE AGENTS OF THE ADDRESSEE ABOVEMENTIONED",
      11,
      true
    );
    y -= 6;
    line("Dear Sir/Madam,");
    line(
      `The undersigned, on behalf of my Client ${data.client_name_upper}, R/O ${data.client_ro} do hereby serve upon you the following legal notice under section 499 of The Indian Penal Code, 1860:`
    );
    line(
      `1. That a loan of Rs. ${data.loan_of_rs}/- was sanctioned in my client's name by your bank.`
    );
    line(
      `2. That as per the agreement between us, My Client has paid all the EMI's amounting to Rs ${data.emis_amounting_to_rs}/-.`
    );
    line(
      "3. That my Client defaulted on the payment of the EMI(s) due to genuine reasons and conveyed the same to your bank as well as the agents."
    );
    line(
      "4. That soon after expressing his inability to pay the aforesaid EMI, my Client was visited by the recovery agent(s) of the bank who started to openly spread his financial woes to his distant relatives, friends and colleagues falsely claiming that he is a willful defaulter and a person of ill-repute. The recovery agents then proceeded to threaten my Client to cause him and his immediate family irreparable loss of reputation if he did not pay the EMI with immediately."
    );
    line(
      "5. That post that the agent(s) reached out to my clients known people where my client is known and spread falsehoods / threatened to spread falsehoods and cause my client to lose his rapport if he did not pay the amount immediately wherein repercussions were faced by my client."
    );
    line(
      "6. That the agent(s) not only verbally abused my client but also threatened and humiliated my client in public and violated his right to dignity and right against defamation granted to him by the Constitution under article 21."
    );
    line(
      "7. That the actions and behavior of the agents was extremely unethical and inappropriate and they did not adhere to the RBI guidelines and they were not trained according to the same."
    );
    line("Therefore,", 11, true);
    line(
      `We hereby call upon you through this Notice, to make the payment of the Rs. ${DEFAMATION_CRIMINAL_CHARGES_RS}/- to my Client, within the period of 15 days of receipt of this Notice, failing which criminal charges will be framed against you, under section 499 of IPC in the competent court of law and in that event, you will be fully responsible for all costs, risks, responsibilities, expenses and consequences thereof and you can be punished for imprisonment which may extend to two years, or with fine or both.`
    );
    line(
      "A copy of this Notice is kept in my office for record and further necessary action and you are also advised to keep the copy safe as you would be asked to produce in the court."
    );
    y -= 8;
    line(`For and on behalf of ${data.client_name_upper}`);
  } else if (input.template_type === PRE_ARB_S21) {
    line("To,", 11, true);
    line(data.reply_to_name, 11, true);
    line(data.reply_to_address);
    if (data.copy_to_advocate) {
      y -= 8;
      line("Copy To,", 11, true);
      line(data.copy_to_advocate_name, 11, true);
      line(data.copy_to_advocate_address);
    }
    y -= 8;
    line(
      "SUBJECT: RESPONSE TO PRE-ARBITRATION NOTICE UNDER SECTION 21 OF ARBITRATION AND CONCILIATION ACT, 1996",
      11,
      true
    );
    y -= 6;
    line("Dear concerned,");
    line(
      `1. That it has come to our attention that my client, ${data.client_name_upper}, has been served with a Pre-Arbitration Notice under section 21 of Arbitration and Conciliation Act, 1996, dated ${data.notice_date_long}, with reference number ${data.reference_number_on_notice}, pertaining to the Loan account number ${data.loan_id_bearing_no}.`
    );
    line(
      "2. That we explicitly decline your invitation to arbitrate in this matter. We would like to highlight the absence of a fair opportunity in the appointment of an Arbitrator (under section 11 of the Arbitration and Conciliation Act, 1996) which is a quintessential step in any arbitration process. It is a prerequisite for a fair and unbiased arbitration procedure."
    );
    line(
      "3. That we would like to underscore the fact that our loan agreement did not contain any separate clause for the appointment of a sole arbitrator in case of default, neither did we agree to proceed with arbitration under a separate agreement. Therefore, this arbitration is against the principle of natural justice."
    );
    line(
      "4. That we do not approve and would like to challenge the appointment of the sole arbitrator under section 12 of the Arbitration and Conciliation Act, 1996 and as stated by the Honourable Supreme Court within the case of Perkins Eastman Architects DPC v. HSCC (India) Ltd. that a party who has interest within the outcome of the dispute cannot appoint a sole arbitrator unilaterally."
    );
    line(
      "5. That my client has already replied to your previous demand notice/loan recall notice/conciliation notice. My client, with all due diligence, has already informed your client about their financial situation and inability to pay their outstanding dues because of the recent job loss/business loss/loss in source of income, through previous emails, calls, and other communications as well as through telephonic conversations with recovery agents representing your client."
    );
    line(
      "6. That I would like to deny all allegations of intentional and deliberate default. I would humbly like to establish the fact that my client is not a wilful defaulter as she/he doesn't fit the definition of wilful default as per RBI notice number DBR. NO. CID. BC.57/20.16.003/2014-2015 dated 07/01/15. My client is a law-abiding citizen who is facing extreme financial difficulties and has always tried in good faith to meet all her/his financial obligations."
    );
    line(
      "7. That we extend this letter as a final opportunity for an amicable resolution in the best interest of both parties through arbitration via ODR. We suggest the medium of CADRe for resolution. We would like a fair opportunity for the appointment of an arbitrator in order to ensure neutrality, impartiality, and unbiasedness."
    );
    line(
      "8. That as we have already informed you about our financial difficulties and inability to meet the respective dues, we urge you to hold on any further interest or penalty(s). Accordingly, we request that any legal proceedings be immediately halted and/or adjourned as our request for settlement is currently pending and my client is systematically planning and organizing their finances in order to settle and close their accounts with all the lenders."
    );
    line(
      "9. That we request you to follow the guidelines on fair practices code for lenders DBOD. Leg. No.BC.104 /09.07.007/2002-03, dated 5th May, 2003. You are hereby called upon to cease any harassment calls, intimidation, threats to life and property, and to refrain from engaging in any other unwanted actions against my client. We hereby put your client on notice that, in the event your client undertakes any harassment calls, intimidation, threats, maleficence, or frivolous legal action/litigation against my client, the same shall be defended by your client at your own costs, risks, and consequences."
    );
    line(
      "10. That my client has requested your client to ensure that they are NOT harassed or threatened by the recovery agents appointed by your client. If my client is harassed in any manner and RBI guidelines for recovery of loans as per notice RBI/2006/167 DBOD.NO.BP.40/21.04/21.04.158/ 2006-07 dated 03/11/2006 are not followed, my client reserves the right to initiate legal proceedings against your client."
    );
    line(
      "11. That, however, should you fail to comply with the requisitions in this notice, our client will have no choice but to initiate civil and criminal proceedings. These may include charges of harassment, criminal intimidation, threats to life, grievous harm, criminal breach of trust, and conspiracy for illegal recovery. The consequences of such actions will be entirely at your risk and cost."
    );
    line(
      "12. That this notice is sent to you without prejudice to my client's other rights, claims, actions, interests and contentions or any action or police complaint, criminal proceedings, civil proceedings already initiated or likely to be initiated against you and your agents as per the above notice. That this notice is sent to you without prejudice to my client's other rights, claims, actions, interests, and contentions, or any action, police complaint, criminal proceedings, or civil proceedings already initiated or likely to be initiated against you and your agents."
    );
    line(
      "A copy of this Reply has been preserved in my office for record and future course of action. Please preserve the original copy of this notice as it may be required to be produced before an appropriate court of law as and when required."
    );
    y -= 8;
    line("Yours sincerely,");
    line(`Advocate for ${data.client_name_upper}`);
  } else if (input.template_type === LOAN_RECALL_OPS) {
    line("To,", 11, true);
    line(data.reply_to_name, 11, true);
    line(data.reply_to_address);
    if (data.copy_to_advocate) {
      y -= 8;
      line("Copy To,", 11, true);
      line(data.copy_to_advocate_name, 11, true);
      line(data.copy_to_advocate_address);
    }
    y -= 8;
    line(
      `SUBJECT: REPLY ON BEHALF OF ${data.client_name_upper} TO THE ALLEGED LOAN RECALL NOTICE DATED ${data.notice_date_long} SENT BY THE ABOVE`,
      11,
      true
    );
    y -= 6;
    line("Dear concerned,");
    line(
      `1. That it has come to our attention that my client, ${data.client_name_upper}, has been served with a Loan Recall Notice dated ${data.notice_date_long} with reference number ${data.reference_number_on_notice}, pertaining to the Loan account number ${data.loan_id_bearing_no}.`
    );
    line(
      `2. That the notice alleges that my client has wilfully and deliberately defaulted on the Equated Monthly Instalments (EMI) obligations associated with the aforementioned account. Furthermore, it is claimed that my client has failed, neglected, and refused to regularize and settle the outstanding unsecured Credit Facilities extended by ${data.reply_to_name} (hereinafter referred to as "the Lender").`
    );
    line(
      `3. That we wish to clarify that this is not the case from our perspective, and it appears to be a misunderstanding. my client has previously communicated the client's situation through emails dated ${data.intimation_mail_date_long}, other forms of communication (WhatsApp calls and messages), and telephonic conversations with recovery agents representing the Lender.`
    );
    line(
      "4. That my client is currently facing severe financial distress, which has rendered the Client unable to fulfil the obligations regarding the Equated Monthly Instalments (EMI) payments or to continue servicing the outstanding dues. The gravity of the Client's financial predicament has been consistently and promptly communicated in our previous responses to the Lender's demand notices, wherein we have elucidated the nature and extent of the Client's financial constraints."
    );
    line(
      "5. That we respectfully submit that my client should not be classified as a wilful defaulter as per RBI notice number DBR. NO. CID. BC.57/20.16.003/2014-2015 dated 7th January, 2015, but rather as an obligor experiencing financial exigencies. The Client has demonstrably engaged in good faith efforts to address the Client's pecuniary obligations, including proactively initiating debt restructuring proceedings with the express purpose of discharging the Client's outstanding liabilities to all creditors."
    );
    line(
      "6. That my client is a law-abiding citizen facing extreme financial difficulties and has always attempted in good faith to meet all financial obligations. A request for settlement has been initiated as per the RBI guidelines, notice no. RBI/2005-06/153 RPCD.PLNFS. BC.No.39 / 06.02.31/ 2005-06 dated 3rd September, 2005 under section 2(A), which covers guidelines for one-time settlement of chronic NPAs. We urge the Lender to hold on any further interest or penalties, given our previously communicated financial difficulties and inability to meet the respective dues."
    );
    line(
      "7. That in light of the information provided, we request the Lender's consideration of the following points: my client is endeavouring to accumulate and organize funds to settle the Client's debt accounts with the Lender; the Client has every intention to settle the Client's dues as per the RBI rules for settlement and is ready to cooperate; and the Client amicably seeks to resolve this matter, requesting that the Lender explore all possible options for resolution and provide relief, including provision of a moratorium of appropriate tenure, waiving off fines, late payment fees, penalties, and other charges, as well as negotiating a repayment plan based on the Client's capacity to pay."
    );
    if (data.agent_behavior) {
      line(`8. ${data.agent_behavior_text}`);
    }
    line(
      "9. That we urge the Lender to adhere to the guidelines on fair practices code for lenders DBOD. Leg. No.BC.104 /09.07.007/2002-03, dated 5th May, 2003. The Lender is hereby called upon to cease any harassment calls, intimidation, threats to life and property, and to refrain from engaging in any other unwanted actions against my client. We put the Lender on notice that any harassment, intimidation, threats, maleficence, or frivolous legal action against my client shall be defended at the Lender's own costs, risks, and consequences."
    );
    line(
      "That this notice is sent without prejudice to my client's other rights, claims, actions, interests, and contentions, or any action, police complaint, criminal proceedings, or civil proceedings already initiated or likely to be initiated against the Lender and the Lender's agents."
    );
    line(
      "A copy of this reply has been preserved in our office for record and future course of action. Please preserve the original copy of this notice as it may be required to be produced before an appropriate court of law when necessary."
    );
    y -= 8;
    line("Yours sincerely,");
    line(`Advocate for ${data.client_name_upper}`);
  } else {
    line("To,", 11, true);
    line(data.reply_to_name, 11, true);
    line(data.reply_to_address);
    if (data.copy_to_advocate) {
      y -= 8;
      line("Copy To,", 11, true);
      line(data.copy_to_advocate_name, 11, true);
      line(data.copy_to_advocate_address);
    }
    y -= 10;
    line(
      `SUBJECT: REPLY ON BEHALF OF ${data.client_name_upper} TO THE ALLEGED DEMAND NOTICE DATED ${data.subject_notice_date} SENT BY THE ABOVE ADDRESSEE`,
      11,
      true
    );
    y -= 8;
    line(
      `1. That I am writing on behalf of my client, ${data.client_name}, in response to the Demand Notice dated ${data.subject_notice_date} with reference number ${data.reference_number_on_notice}, pertaining to the Loan account number ${data.loan_id_bearing_no}, concerning the ${data.reply_to_name} herein after referred 'Institution'.`
    );
    line(
      "2. That my client denies all claims of intentional and deliberate default. My client has previously notified your institution about the financial circumstances and inability to pay the outstanding amounts through prior emails, telephone calls, and other forms of communication."
    );
    line("3.");
    for (const r of data.reasons) {
      line(`    ${r.letter}  ${r.text}`);
    }
    line(
      "4. That, my client is not a wilful defaulter as per RBI notice number DBR. NO. CID. BC. 57/20.16.003/2014-2015 dated 07th January, 2015 under 2.1 'Definition of wilful default'. My client is a law-abiding citizen facing extreme financial difficulties and has always tried in good faith to meet all their financial obligations."
    );
    line(
      "5. That, my client has initiated a request for settlement as per the RBI guidelines, notice no. RBI/2005-06/153 RPCD.PLNFS. BC.No.39 / 06.02.31/ 2005-06 dated 03rd September, 2005 under section 2(A) which covers Guidelines for one-time settlement of chronic NPAs."
    );
    line(
      "6. That, in view of the current situation, I kindly request your consideration of the following key points before proceeding:"
    );
    line(
      "    i.  My client is actively working to gather funds to settle their outstanding debts with your client."
    );
    line(
      "    ii. My client is fully committed to settling their dues in accordance with RBI settlement guidelines and is prepared to cooperate fully."
    );
    line(
      "    iii. My client respectfully asks your client to explore all feasible resolution options and provide relief measures, including but not limited to: granting a moratorium, waiving fines, late payment fees, penalties, and other charges, as well as offering settlement options tailored to my client's financial capacity."
    );
    line(
      "7. That, we request you to ensure that my client is NOT harassed or threatened by the recovery agents appointed by your client, as per RBI guidelines for recovery of loans (notice RBI/2006/167 DBOD.NO.BP. 40/21.04/21.04.158/ 2006-07 dated 03rd November, 2006)."
    );
    line(
      "8. That, we request you to follow the guidelines on fair practices code for lenders DBOD. Leg. No.BC.104 /09.07.007/2002-03, dated 05th May, 2003."
    );
    line(
      "9. That, you are hereby called upon to cease any harassment calls, intimidation, threats to life and property, and to refrain from engaging in any other unwanted actions against my client."
    );
    line(
      "10. That, this notice is sent without prejudice to my client's other rights, claims, actions, interests, and contentions or any action or police complaint, criminal proceedings, civil proceedings already initiated or likely to be initiated against you and your agents."
    );
    line(
      "11. That, a copy of this Reply has been preserved in my office for record and future course of action. Please preserve the original copy of this notice as it may be asked to be produced before the appropriate court of law as and when required."
    );
    y -= 8;
    line("Yours sincerely,");
    y -= 4;
    line(`Advocate for ${data.client_name_upper}`);
  }
  y -= 6;

  if (data.is_digital && fs.existsSync(signaturePlaceholderPath())) {
    try {
      const sigBytes = fs.readFileSync(signaturePlaceholderPath());
      const png = await pdf.embedPng(sigBytes);
      const maxW = 180;
      const scale = Math.min(maxW / png.width, 70 / png.height);
      const w = png.width * scale;
      const h = png.height * scale;
      if (y - h < 50) {
        y = 800;
        page = pdf.addPage([595, 842]);
      }
      page.drawImage(png, { x: left, y: y - h, width: w, height: h });
      y -= h + 10;
    } catch {
      y -= 40;
    }
  } else {
    y -= 50;
  }

  line(`ADVOCATE, ${data.advocate_name}`, 11, true);

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

export async function generateNoticeXlsx(input: NoticeMergeInput & { id?: string }): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Notice");
  const data = buildMergeData(input);
  const rows: [string, string][] = [
    ["Notice ID", input.id ?? ""],
    ["Template Type", input.template_type],
    ["Notice No", input.notice_no],
    ["Notice Date", data.notice_date],
    ["Expiry Date", data.expiry_date],
    ["Loan ID Bearing No", input.loan_id_bearing_no],
    ["Ref Number", input.ref_number],
    ["Reply To Name", input.reply_to_name],
    ["Reply To Address", input.reply_to_address],
    ["Client Name", input.client_name],
    ["Signing Advocate", input.signing_advocate_name],
    ["Advocate Email", input.signing_advocate_email ?? ""],
    ["Reference On Notice", input.reference_number_on_notice],
    ["Signature Mode", input.signature_mode],
    ["Enable Dates", String(input.enable_dates)],
    ["Copy To Advocate", String(input.copy_to_advocate)],
    ["Copy To Name", input.copy_to_advocate_name ?? ""],
    ["Copy To Address", input.copy_to_advocate_address ?? ""],
    ["Client R/O", input.client_ro ?? ""],
    ["Loan of Rs", input.loan_of_rs ?? ""],
    ["EMIs amounting to Rs", input.emis_amounting_to_rs ?? ""],
    ["Criminal charges payment Rs", input.criminal_charges_payment_rs ?? ""],
    ["Agent Behavior", String(Boolean(input.agent_behavior))],
    ["Intimation Mail Date", data.intimation_mail_date_long],
    ["Reasons", data.reasons.map((r) => `${r.letter} ${r.text}`).join("\n")],
  ];
  sheet.columns = [
    { header: "Field", key: "field", width: 28 },
    { header: "Value", key: "value", width: 80 },
  ];
  for (const [field, value] of rows) {
    sheet.addRow({ field, value });
  }
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
