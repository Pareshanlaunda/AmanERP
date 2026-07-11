/**
 * Delete test data: all source=manual leads + named test employees.
 * Never deletes WhatsApp leads or admin profiles.
 *
 *   node --env-file=.env.local scripts/cleanup-manual-test-data.mjs
 */
import pg from "pg";
import {
  buildDatabaseUrlCandidates,
  discoverWorkingDatabaseUrl,
} from "./db-utils.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const EMPLOYEE_EMAILS = [
  "employee@amanerp.com",
  "geetai@gmail.com",
  "harsh@amanerp.com",
  "johndeo@amanerp.com",
];

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

async function getPgClient() {
  if (process.env.DATABASE_URL) {
    const client = new pg.Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();
    return client;
  }
  const password = process.env.DATABASE_PASSWORD;
  const candidates = buildDatabaseUrlCandidates({ supabaseUrl: url, password });
  const found = await discoverWorkingDatabaseUrl(candidates);
  if (!found) throw new Error("No working DATABASE_URL / DATABASE_PASSWORD");
  const client = new pg.Client({
    connectionString: found,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  return client;
}

async function deleteAuthUser(userId) {
  const response = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || response.statusText);
  }
}

async function tryQuery(client, sql, params) {
  try {
    return await client.query(sql, params);
  } catch (e) {
    console.warn("skip:", e.message.split("\n")[0]);
    return null;
  }
}

const pgClient = await getPgClient();

try {
  const { rows: manualLeads } = await pgClient.query(
    `SELECT id, client_name, status FROM public.leads WHERE source = 'manual' ORDER BY created_at`
  );
  console.log(`Manual leads to delete: ${manualLeads.length}`);
  for (const row of manualLeads) {
    console.log(`  - ${row.client_name} (${row.status}) ${row.id}`);
  }

  if (manualLeads.length > 0) {
    const ids = manualLeads.map((r) => r.id);

    await tryQuery(
      pgClient,
      `DELETE FROM public.notifications WHERE lead_id = ANY($1::uuid[])`,
      [ids]
    );

    const clients = await pgClient.query(
      `SELECT id, client_name FROM public.client_onboardings WHERE lead_id = ANY($1::uuid[])`,
      [ids]
    );
    console.log(`Linked client onboardings: ${clients.rowCount}`);
    for (const c of clients.rows) console.log(`  - ${c.client_name} ${c.id}`);

    // Break circular FKs first
    await tryQuery(
      pgClient,
      `UPDATE public.leads SET onboarding_record_id = NULL WHERE id = ANY($1::uuid[])`,
      [ids]
    );
    await tryQuery(
      pgClient,
      `UPDATE public.leads SET converted_onboarding_id = NULL WHERE id = ANY($1::uuid[])`,
      [ids]
    );
    await tryQuery(
      pgClient,
      `UPDATE public.client_onboardings SET lead_id = NULL WHERE lead_id = ANY($1::uuid[])`,
      [ids]
    );

    if (clients.rows.length > 0) {
      const clientIds = clients.rows.map((c) => c.id);
      const delClients = await pgClient.query(
        `DELETE FROM public.client_onboardings WHERE id = ANY($1::uuid[]) RETURNING id, client_name`,
        [clientIds]
      );
      console.log(`Client onboardings deleted: ${delClients.rowCount}`);
    }

    const del = await pgClient.query(
      `DELETE FROM public.leads WHERE source = 'manual' RETURNING id, client_name`
    );
    console.log(`Manual leads deleted: ${del.rowCount}`);
    for (const r of del.rows) console.log(`  deleted lead: ${r.client_name}`);
  }

  const { rows: profiles } = await pgClient.query(
    `SELECT p.id, p.full_name, p.role, u.email
     FROM public.profiles p
     JOIN auth.users u ON u.id = p.id
     WHERE lower(u.email) = ANY($1::text[])`,
    [EMPLOYEE_EMAILS.map((e) => e.toLowerCase())]
  );

  console.log(`Employees to delete: ${profiles.length}`);
  for (const p of profiles) {
    console.log(`  - ${p.full_name} <${p.email}> role=${p.role}`);
    if (p.role === "admin") {
      console.error(`SKIP admin ${p.email}`);
      continue;
    }
    await tryQuery(pgClient, `UPDATE public.leads SET assigned_to = NULL WHERE assigned_to = $1`, [
      p.id,
    ]);
    await tryQuery(
      pgClient,
      `DELETE FROM public.lead_additional_assignees WHERE employee_id = $1`,
      [p.id]
    );
    await tryQuery(pgClient, `DELETE FROM public.notifications WHERE user_id = $1`, [p.id]);
    await tryQuery(
      pgClient,
      `UPDATE public.client_onboardings SET submitted_by = NULL WHERE submitted_by = $1`,
      [p.id]
    );

    try {
      await deleteAuthUser(p.id);
      console.log(`  Deleted auth+profile ${p.email}`);
    } catch (err) {
      console.error(`  Auth delete failed ${p.email}:`, err.message);
      await pgClient.query(`DELETE FROM public.profiles WHERE id = $1`, [p.id]);
      console.log(`  Deleted profile only ${p.email}`);
    }
  }

  const { rows: remaining } = await pgClient.query(
    `SELECT source, count(*)::int AS n FROM public.leads GROUP BY source ORDER BY source`
  );
  console.log("Remaining leads by source:", remaining);

  const { rows: remainingEmp } = await pgClient.query(
    `SELECT p.full_name, u.email, p.role
     FROM public.profiles p
     JOIN auth.users u ON u.id = p.id
     WHERE p.role = 'employee'
     ORDER BY u.email`
  );
  console.log("Remaining employees:", remainingEmp);
} finally {
  await pgClient.end();
}
