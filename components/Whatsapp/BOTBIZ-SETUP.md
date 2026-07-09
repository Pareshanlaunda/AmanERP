# Botbiz Outbound Webhook — exact settings (from your screen)

Use this when you see the **Out-bound Webhook** create form in Bot Manager.

---

## Free text vs list replies — how it works

Your CSV exports show customers sometimes **type free text** instead of picking list buttons. That is OK for v1:

| Layer | What happens |
|-------|----------------|
| **Botbiz bot** | Saves whatever the user answered into **custom fields** (Full Name, Loan_Type, etc.) — Botbiz may normalize messy text before saving |
| **Outbound webhook** | Sends those saved values inside **INPUT FLOW DATA** |
| **AMAN ERP** | Maps fields to a lead; free text like `5,00,000` or `71,000` is parsed; odd text is kept in **notes** + raw JSON in `whatsapp_metadata` |

You do **not** need separate AI in ERP if Botbiz already stores cleaned answers in custom fields. The webhook uses **Botbiz’s saved answers**, not raw chat logs.

---

## Local testing first (before Vercel)

### 1. Add to `.env.local`

```env
BOTBIZ_WEBHOOK_SECRET=local-test-secret-123
```

### 2. Run ERP locally

```powershell
npm run dev
```

Open http://localhost:3000/api/webhooks/botbiz — should show `{ "ok": true }`.

### 3. Expose localhost to Botbiz (ngrok)

Install [ngrok](https://ngrok.com), then:

```powershell
ngrok http 3000
```

Copy the `https://xxxx.ngrok-free.app` URL.

### 4. Use this webhook URL in Botbiz

```
https://YOUR-NGROK-URL/api/webhooks/botbiz?secret=local-test-secret-123
```

Example:

```
https://abc123.ngrok-free.app/api/webhooks/botbiz?secret=local-test-secret-123
```

When local testing works, switch the URL to Vercel later — same settings, only URL changes.

---

## Fill the Botbiz form exactly like this

### WEBHOOK NAME

```
AMAN ERP Leads
```

### OUT-BOUND WEBHOOK URL

**Local (ngrok):**

```
https://YOUR-NGROK-URL/api/webhooks/botbiz?secret=local-test-secret-123
```

**Production (later):**

```
https://aman-erp-theta.vercel.app/api/webhooks/botbiz?secret=YOUR_PRODUCTION_SECRET
```

---

### SELECT ACTIONS THAT WILL TRIGGER THE WEBHOOK

| Toggle | ON/OFF | Why |
|--------|--------|-----|
| **POSTBACK** | OFF | Not needed for Client_Details completion |
| **USER INPUT FLOW** | **ON** | Fires when Client_Details flow finishes |
| **LOCATION** | OFF | Not used |

Only **USER INPUT FLOW** should be ON.

---

### SELECT DATA FIELDS THAT WILL BE SENT

| Toggle | ON/OFF | Why |
|--------|--------|-----|
| **SUBSCRIBER ID** | **ON** | Dedup + phone fallback |
| **SUBSCRIBER NAME** | **ON** | Backup if name field empty |
| **PHONE NUMBER** | **ON** | Client mobile |
| **INPUT FLOW DATA** | **ON** | **Most important** — contains Full Name, Loan_Type, Personal_Loan_Amount, Credit_Card_Amount, Recovery_Harassment |
| DATE OF BIRTH | OFF | Not in your flow |
| LOCATION | OFF | Not in your flow |
| LABELS | OFF | Optional later |
| POSTBACK ID | OFF | Not needed |

**Minimum required:** SUBSCRIBER ID + PHONE NUMBER + **INPUT FLOW DATA**  
**Recommended:** also SUBSCRIBER NAME

> Your screen does **not** list Loan_Type separately — those live **inside INPUT FLOW DATA**. That is correct.

---

## After Save — test

1. Complete **Client_Details** on WhatsApp (test number)
2. Check terminal running `npm run dev` for webhook POST
3. Open http://localhost:3000/admin/dashboard
4. New lead with **WhatsApp** source should appear

---

## Simulate webhook without WhatsApp (local curl)

```powershell
curl -X POST "http://localhost:3000/api/webhooks/botbiz?secret=local-test-secret-123" ^
  -H "Content-Type: application/json" ^
  -d "{\"subscriber_id\":\"916300251728-390042\",\"phone_number\":\"6300251728\",\"input_flow_data\":{\"Full Name\":\"Test User\",\"Loan_Type\":\"Unsecured Loans\",\"Personal_Loan_Amount\":\"5-10 Lakhs\",\"Credit_Card_Amount\":\"No Credit Card\",\"Recovery_Harassment\":\"Recovery Calls\"}}"
```

---

## When moving to production

1. Push code to GitHub → Vercel redeploys
2. Add `BOTBIZ_WEBHOOK_SECRET` on Vercel (same idea as local)
3. Edit Botbiz webhook URL → change ngrok URL to `https://aman-erp-theta.vercel.app/api/webhooks/botbiz?secret=...`
4. Rotate the secret if the URL was ever shared in chat/logs (query-string secrets can leak)
5. Never enable `BOTBIZ_WEBHOOK_DEBUG` on Vercel production

Docs: [Botbiz Outbound Webhook](https://dash.botbiz.io/docs/whatsapp/bot-manager/whatsapp-out-bound-webhook)

---

## Lead WhatsApp chat panel (Developer API)

ERP can show the Botbiz conversation on a WhatsApp lead and send session text replies.

### Env vars (`.env.local` and Vercel)

```env
BOTBIZ_API_KEY=your-api-token-from-botbiz-developer-console
BOTBIZ_PHONE_NUMBER_ID=your-whatsapp-phone-number-id
BOTBIZ_API_BASE_URL=https://dash.botbiz.io
```

| Variable | Where to get it |
|----------|-----------------|
| `BOTBIZ_API_KEY` | Botbiz → profile → **API Developer** (apiToken) |
| `BOTBIZ_PHONE_NUMBER_ID` | **Connect Account → WhatsApp Integration** → under Messaging Limit (`TIER_2K`) for **+91 92723 94857** (e.g. `1116225628241343`). Not the Business Account ID. |
| `BOTBIZ_API_BASE_URL` | Default `https://dash.botbiz.io` — do not use `api.botbiz.io` |

Without `BOTBIZ_PHONE_NUMBER_ID`, the chat panel shows a config error.

### How it works

1. Open a lead with **source = WhatsApp** (admin or assigned employee).
2. **WhatsApp** panel loads **full history** via `get/conversation` (paged until complete) using the lead’s `client_phone`.
3. **Send** uses `POST /api/v1/whatsapp/send` — free text only works within WhatsApp’s **24h customer-service window** after the last customer message (Meta policy). History itself is not limited to 24h.
4. Chat drawer **auto-refreshes every few seconds** while open (Botbiz outbound webhook does **not** push every LiveChat message — only Client_Details / USER INPUT FLOW). Manual Refresh still works.

Full API reference: [BOTBIZ.DEV.MD](./BOTBIZ.DEV.MD)
