/**
 * Delete all leads where source = 'manual'.
 * Leaves whatsapp leads and client_onboardings intact
 * (onboarding lead_id is nulled when needed for FK).
 *
 * Usage:
 *   node --env-file=.env.local scripts/delete-manual-leads.mjs
 */

import pg from "pg";
import {
  buildDatabaseUrlCandidates,
  discoverWorkingDatabaseUrl,
  maskDatabaseUrl,
} from "./db-utils.mjs";

function getDatabaseUrls() {
  if (process.env.DATABASE_URL) {
    return [process.env.DATABASE_URL];
  }

  return buildDatabaseUrlCandidates({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    password: process.env.DATABASE_PASSWORD,
  });
}

async function connectClient() {
  const urls = getDatabaseUrls();
  if (!urls?.length) {
    throw new Error(
      "Missing DATABASE_URL or NEXT_PUBLIC_SUPABASE_URL + DATABASE_PASSWORD in .env.local"
    );
  }

  const connectionString = await discoverWorkingDatabaseUrl(urls);
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log("Connected using:", maskDatabaseUrl(connectionString));
  return client;
}

async function hasNotificationsLeadId(client) {
  const { rows } = await client.query(`
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notifications'
      and column_name = 'lead_id'
    limit 1
  `);
  return rows.length > 0;
}

let client;

try {
  client = await connectClient();

  const { rows: manualLeads } = await client.query(
    `select id, client_name, status, created_at
     from public.leads
     where source = 'manual'
     order by created_at`
  );

  console.log(`\nManual leads found: ${manualLeads.length}`);
  for (const lead of manualLeads) {
    console.log(`  - ${lead.client_name} (${lead.id}) [${lead.status}]`);
  }

  if (manualLeads.length === 0) {
    console.log("\nNothing to delete.");
    process.exit(0);
  }

  const ids = manualLeads.map((l) => l.id);

  await client.query("begin");

  let notificationsDeleted = 0;
  if (await hasNotificationsLeadId(client)) {
    const notif = await client.query(
      `delete from public.notifications where lead_id = any($1::uuid[])`,
      [ids]
    );
    notificationsDeleted = notif.rowCount ?? 0;
    console.log(`\nDeleted notifications: ${notificationsDeleted}`);
  } else {
    console.log("\nnotifications.lead_id missing — skipped notification cleanup");
  }

  // Preserve onboardings: clear FK so lead delete is not blocked (NO ACTION).
  const cleared = await client.query(
    `update public.client_onboardings
     set lead_id = null
     where lead_id = any($1::uuid[])`,
    [ids]
  );
  console.log(`Nulled client_onboardings.lead_id: ${cleared.rowCount ?? 0}`);

  const deleted = await client.query(
    `delete from public.leads
     where source = 'manual'
     returning id, client_name`
  );

  await client.query("commit");

  console.log(`\nDeleted leads: ${deleted.rowCount ?? 0}`);
  for (const row of deleted.rows) {
    console.log(`  - ${row.client_name} (${row.id})`);
  }

  const { rows: remaining } = await client.query(
    `select source, count(*)::int as count
     from public.leads
     group by source
     order by source`
  );
  console.log("\nRemaining leads by source:");
  for (const row of remaining) {
    console.log(`  ${row.source}: ${row.count}`);
  }
} catch (error) {
  if (client) await client.query("rollback").catch(() => {});
  console.error("\nFailed:", error.message);
  process.exit(1);
} finally {
  if (client) await client.end();
}
