import type { HarassmentFaced } from "@/lib/types/database";

const HARASSMENT_ALIASES: Record<string, HarassmentFaced> = {
  no: "no",
  "no harassment": "no",
  "कोई उत्पीड़न नहीं": "no",
  "कोणताही त्रास नाही": "no",
  nhi: "no",
  nahi: "no",
  nehi: "no",
  नहीं: "no",
  "recovery calls": "yes_calls",
  "रिकवरी कॉल": "yes_calls",
  "रिकवरी कॉल्स": "yes_calls",
  "रिकव्हरी कॉल्स": "yes_calls",
  "recovery call": "yes_calls",
  "home visits": "yes_home_visit",
  "home visit": "yes_home_visit",
  "घर पर विज़िट": "yes_home_visit",
  "घरी येऊन त्रास देणे": "yes_home_visit",
  both: "yes_calls_home_visit",
  दोनों: "yes_calls_home_visit",
  दोन्ही: "yes_calls_home_visit",
  "दोन्ही both": "yes_calls_home_visit",
  ho: "yes_calls",
  ha: "yes_calls",
  haa: "yes_calls",
  han: "yes_calls",
  hn: "yes_calls",
  yes: "yes_calls",
  yesss: "yes_calls",
  ji: "yes_calls",
  हां: "yes_calls",
  हाँ: "yes_calls",
  हा: "yes_calls",
  हो: "yes_calls",
  होय: "yes_calls",
  "जी हां": "yes_calls",
  जी: "yes_calls",
};

export function mapBotbizHarassment(value: unknown): HarassmentFaced | null {
  if (value == null || value === "") return null;
  const key = String(value).trim().toLowerCase();
  if (HARASSMENT_ALIASES[key]) return HARASSMENT_ALIASES[key];
  // Exact Devanagari keys (toLowerCase may not change them)
  const exact = String(value).trim();
  return HARASSMENT_ALIASES[exact] ?? HARASSMENT_ALIASES[exact.toLowerCase()] ?? null;
}
