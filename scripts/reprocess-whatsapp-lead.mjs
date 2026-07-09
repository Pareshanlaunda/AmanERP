/**
 * Re-apply stored whatsapp_metadata through the local webhook (updates mapped fields).
 *
 * Usage:
 *   npm run reprocess-whatsapp-lead -- c7c1fd9e-7eab-4ddf-bfbd-dbd4f1cbe913
 */
const leadId = process.argv[2];
if (!leadId) {
  console.error("Usage: npm run reprocess-whatsapp-lead -- <lead-id>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const secret = process.env.BOTBIZ_WEBHOOK_SECRET ?? "local-test-secret-123";
const webhookBase = process.env.BOTBIZ_WEBHOOK_URL ?? "http://localhost:3000/api/webhooks/botbiz";

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const fetchLead = await fetch(
  `${url}/rest/v1/leads?id=eq.${encodeURIComponent(leadId)}&select=whatsapp_metadata`,
  {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  }
);
const rows = await fetchLead.json();
const metadata = rows[0]?.whatsapp_metadata;
if (!metadata) {
  console.error("Lead not found or has no whatsapp_metadata:", leadId);
  process.exit(1);
}

const webhookUrl = `${webhookBase}?secret=${encodeURIComponent(secret)}`;
const response = await fetch(webhookUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(metadata),
});

const body = await response.text();
console.log("Status:", response.status);
console.log(body);
