/**
 * Print whatsapp_metadata JSON saved on a lead (exact Botbiz webhook body).
 *
 * Usage:
 *   npm run dump-whatsapp-payload -- <lead-id>
 *   npm run dump-whatsapp-payload -- c7c1fd9e-7eab-4ddf-bfbd-dbd4f1cbe913
 */
const leadId = process.argv[2];
if (!leadId) {
  console.error("Usage: npm run dump-whatsapp-payload -- <lead-id>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const response = await fetch(
  `${url}/rest/v1/leads?id=eq.${encodeURIComponent(leadId)}&select=id,client_name,loan_type,loan_amount,personal_loan_amount_range,credit_card_amount_range,harassment_faced,whatsapp_metadata`,
  {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  }
);

if (!response.ok) {
  console.error(await response.text());
  process.exit(1);
}

const rows = await response.json();
const data = rows[0];
if (!data) {
  console.error("Lead not found:", leadId);
  process.exit(1);
}

console.log("Lead:", data.client_name, `(${data.id})`);
console.log("Mapped loan_type:", data.loan_type);
console.log("Mapped personal_loan_amount_range:", data.personal_loan_amount_range);
console.log("Mapped credit_card_amount_range:", data.credit_card_amount_range);
console.log("Mapped loan_amount (exact, onboarding):", data.loan_amount);
console.log("Mapped harassment_faced:", data.harassment_faced);
console.log("\n--- whatsapp_metadata (raw Botbiz JSON) ---\n");
console.log(JSON.stringify(data.whatsapp_metadata, null, 2));
