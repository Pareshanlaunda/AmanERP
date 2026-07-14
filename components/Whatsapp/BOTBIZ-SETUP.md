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

Botbiz only accepts a URL (no custom headers). Put the secret in the **path**, not `?secret=`:

```
https://YOUR-NGROK-URL/api/webhooks/botbiz/local-test-secret-123
```

Example:

```
https://abc123.ngrok-free.app/api/webhooks/botbiz/local-test-secret-123
```

When local testing works, switch the URL to production later — same settings, only host changes.

**Migration:** old `?secret=` URLs need `BOTBIZ_ALLOW_QUERY_SECRET=true` temporarily, then switch to path URL and remove that env.

---

## Fill the Botbiz form exactly like this

### WEBHOOK NAME

```
AMAN ERP Leads
```

### OUT-BOUND WEBHOOK URL

**Local (ngrok):**

```
https://YOUR-NGROK-URL/api/webhooks/botbiz/local-test-secret-123
```

**Production (Hostinger — debtfreelawyer.in):**

```
https://debtfreelawyer.in/api/webhooks/botbiz/YOUR_NEW_SECRET
```

Replace `YOUR_NEW_SECRET` with the same value as Hostinger env `BOTBIZ_WEBHOOK_SECRET`.

Secret must be URL-safe (e.g. `openssl rand -hex 32`). Prefer **path** secret (above). Do **not** use `?secret=` — that leaks in logs/Referer.

**Old Vercel (do not use):**

```
https://aman-erp-theta.vercel.app/api/webhooks/botbiz?secret=...
```

---

### SELECT ACTIONS THAT WILL TRIGGER THE WEBHOOK

| Toggle | ON/OFF | Why |
|--------|--------|-----|
| **POSTBACK** | **ON** | First contact — language / start buttons create a lead **before** the form finishes |
| **USER INPUT FLOW** | **ON** | Fires when Client_Details flow finishes — enriches the same lead |
| **LOCATION** | OFF | Not used |

Both **POSTBACK** and **USER INPUT FLOW** should be ON.

**Why POSTBACK?** Earliest webhook event (language / start button). Creates stub lead (`WhatsApp 91…`) so agents can chat while the form is still open.

**Fallback (code):** Admin dashboard also **pulls recent Botbiz subscribers** (latest message first) and creates leads if the webhook missed them — covers “customer messaged us” and “we messaged them first”. Use **Sync WhatsApp** or just open the dashboard.

When Client_Details completes, the same lead is updated (not duplicated).

**No duplicate leads:** ERP matches by **phone** (and subscriber id). Same person messaging again / tapping language again / sync → **updates the same lead**, never creates a second one.

---

### SELECT DATA FIELDS THAT WILL BE SENT

| Toggle | ON/OFF | Why |
|--------|--------|-----|
| **SUBSCRIBER ID** | **ON** | Dedup + phone fallback — **required for early leads** |
| **SUBSCRIBER NAME** | **ON** | Backup if name field empty |
| **PHONE NUMBER** | **ON** | Client mobile — **required for early leads** |
| **INPUT FLOW DATA** | **ON** | Full Name, Loan_Type, amounts, harassment (form completion) |
| **POSTBACK ID** | **ON** | Helps detect language from the button the user tapped |
| DATE OF BIRTH | OFF | Not in your flow |
| LOCATION | OFF | Not in your flow |
| LABELS | OFF | Optional later |

**Minimum for early contact:** SUBSCRIBER ID + PHONE NUMBER (+ POSTBACK action)  
**For full form:** also INPUT FLOW DATA + SUBSCRIBER NAME

> Your screen does **not** list Loan_Type separately — those live **inside INPUT FLOW DATA**. That is correct.

---

## After Save — test

1. Message the bot and tap a **language** button (English / Hindi / Marathi)
2. Check admin dashboard — a **new WhatsApp lead** should appear (name like `WhatsApp 91…`) with note that the form is not finished
3. Open the lead → **Chat** — employee can message the customer immediately
4. Complete **Client_Details** on WhatsApp
5. Same lead should update with real name + loan fields (not a second lead)

---

## Simulate webhook without WhatsApp (local curl)

**Early contact (POSTBACK-style — no form yet):**

```powershell
curl -X POST "http://localhost:3000/api/webhooks/botbiz/local-test-secret-123" ^
  -H "Content-Type: application/json" ^
  -d "{\"subscriber_id\":\"916300251728-390042\",\"phone_number\":\"6300251728\",\"postback_id\":\"English\",\"subscriber_name\":\"\"}"
```

**Form complete (USER INPUT FLOW):**

```powershell
curl -X POST "http://localhost:3000/api/webhooks/botbiz/local-test-secret-123" ^
  -H "Content-Type: application/json" ^
  -d "{\"subscriber_id\":\"916300251728-390042\",\"phone_number\":\"6300251728\",\"input_flow_data\":{\"Full Name\":\"Test User\",\"Loan_Type\":\"Unsecured Loans\",\"Personal_Loan_Amount\":\"5-10 Lakhs\",\"Credit_Card_Amount\":\"No Credit Card\",\"Recovery_Harassment\":\"Recovery Calls\"}}"
```

---

## When moving to production (Hostinger)

1. Redeploy on Hostinger after setting env vars
2. Set `BOTBIZ_WEBHOOK_SECRET` on Hostinger (URL-safe; same value as path segment)
3. Edit Botbiz outbound webhook URL → `https://debtfreelawyer.in/api/webhooks/botbiz/YOUR_NEW_SECRET`
4. Rotate secret if old Vercel `?secret=` URL was ever shared in chat/logs
5. Never enable `BOTBIZ_WEBHOOK_DEBUG` in production
6. Do not set `BOTBIZ_ALLOW_QUERY_SECRET` in production once path URL works
7. Supabase Auth Site URL / Redirect URLs → `https://debtfreelawyer.in`

Docs: [Botbiz Outbound Webhook](https://dash.botbiz.io/docs/whatsapp/bot-manager/whatsapp-out-bound-webhook)

---

## Lead WhatsApp chat panel (Developer API)

ERP can show the Botbiz conversation on a WhatsApp lead and send session text replies.

### Env vars (`.env.local` and Hostinger)

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
