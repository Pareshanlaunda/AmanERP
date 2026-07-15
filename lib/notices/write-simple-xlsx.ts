import PizZip from "pizzip";

/**
 * Minimal write-only XLSX (OpenXML SpreadsheetML) via pizzip.
 * Replaces exceljs for notice exports — avoids exceljs→unzipper→fstream/rimraf/glob junk.
 * Read path intentionally unsupported; do not reintroduce exceljs until upstream drops unzipper
 * (exceljs 5+) or a zero-read-dep writer is adopted.
 */

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    // XML 1.0 forbids most C0 controls
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[:\\/?*[\]]/g, " ").trim().slice(0, 31);
  return cleaned || "Sheet1";
}

function colLetter(index1: number): string {
  let n = index1;
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export type SimpleXlsxCell = string | number | boolean | null | undefined;

/**
 * Build a single-sheet .xlsx Buffer. First row = headers; remaining = data rows.
 */
export function writeSimpleXlsx(
  sheetName: string,
  headers: string[],
  rows: SimpleXlsxCell[][],
): Buffer {
  const strings: string[] = [];
  const stringIndex = new Map<string, number>();

  function sst(value: string): number {
    const existing = stringIndex.get(value);
    if (existing !== undefined) return existing;
    const i = strings.length;
    strings.push(value);
    stringIndex.set(value, i);
    return i;
  }

  function cellXml(r: number, c: number, value: SimpleXlsxCell): string {
    const ref = `${colLetter(c)}${r}`;
    if (value === null || value === undefined || value === "") {
      return `<c r="${ref}"/>`;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return `<c r="${ref}"><v>${value}</v></c>`;
    }
    if (typeof value === "boolean") {
      return `<c r="${ref}" t="b"><v>${value ? 1 : 0}</v></c>`;
    }
    const si = sst(String(value));
    return `<c r="${ref}" t="s"><v>${si}</v></c>`;
  }

  const allRows: SimpleXlsxCell[][] = [headers, ...rows];
  const sheetRows = allRows
    .map((row, i) => {
      const r = i + 1;
      const cells = row.map((val, j) => cellXml(r, j + 1, val)).join("");
      return `<row r="${r}">${cells}</row>`;
    })
    .join("");

  const sstXml = strings
    .map((s) => {
      const t = escapeXml(s);
      const space = /\s/.test(s) ? ' xml:space="preserve"' : "";
      return `<si><t${space}>${t}</t></si>`;
    })
    .join("");

  const name = sanitizeSheetName(sheetName);
  const zip = new PizZip();

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
  );

  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
  );

  zip.file(
    "xl/workbook.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${escapeXml(name)}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`,
  );

  zip.file(
    "xl/_rels/workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
  );

  zip.file(
    "xl/worksheets/sheet1.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${sheetRows}</sheetData>
</worksheet>`,
  );

  zip.file(
    "xl/sharedStrings.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">
${sstXml}
</sst>`,
  );

  // Minimal stylesheet so Excel accepts the package
  zip.file(
    "xl/styles.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border/></borders>
  <cellStyleXfs count="1"><xf/></cellStyleXfs>
  <cellXfs count="1"><xf/></cellXfs>
</styleSheet>`,
  );

  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" }) as Buffer;
}
