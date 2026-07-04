/**
 * Apply Supabase SQL migrations automatically.
 *
 * Usage (from project folder):
 *   npm run migrate
 *
 * Setup once in .env.local — copy the Session pooler URI from
 * Supabase → Project Settings → Database → Connection string:
 *   DATABASE_URL=postgresql://postgres.[ref]:[password]@....pooler.supabase.com:5432/postgres
 *
 * Or set DATABASE_PASSWORD (script tries common Supabase host patterns).
 *
 * Safe to re-run: already-applied files are skipped.
 */

import { createHash } from "crypto";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import {
  buildDatabaseUrlCandidates,
  discoverWorkingDatabaseUrl,
  maskDatabaseUrl,
} from "./db-utils.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const MIGRATION_FILES = [
  "supabase/migration.sql",
  "supabase/migration-leads.sql",
  "supabase/migration-v2.sql",
  "supabase/migration-v3-profiles-rls.sql",
  "supabase/migration-v4-client-id.sql",
  "supabase/migration-v5-lead-fields.sql",
  "supabase/migration-v6-realtime-notifications.sql",
  "supabase/migration-v7-realtime-leads-comments.sql",
  "supabase/migration-v8-realtime-onboardings-profiles.sql",
  "supabase/migration-v9-employee-types-lead-fields.sql",
  "supabase/migration-v10-harassment-types.sql",
  "supabase/migration-v11-csa-employee-type.sql",
];

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
  if (!urls?.length) return null;

  try {
    const connectionString = await discoverWorkingDatabaseUrl(urls);
    const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();
    console.log("Connected using:", maskDatabaseUrl(connectionString));
    return client;
  } catch (error) {
    throw error;
  }
}

async function ensureMigrationTable(client) {
  await client.query(`
    create table if not exists public._app_migrations (
      filename text primary key,
      checksum text not null,
      applied_at timestamptz default now()
    );
  `);
}

async function isApplied(client, filename, checksum) {
  const { rows } = await client.query(
    "select checksum from public._app_migrations where filename = $1",
    [filename]
  );
  if (!rows.length) return false;
  if (rows[0].checksum !== checksum) {
    throw new Error(
      `${filename} was changed after it was applied. Create a new migration file instead.`
    );
  }
  return true;
}

async function markApplied(client, filename, checksum) {
  await client.query(
    `insert into public._app_migrations (filename, checksum)
     values ($1, $2)
     on conflict (filename) do nothing`,
    [filename, checksum]
  );
}

function checksumFor(content) {
  return createHash("sha256").update(content).digest("hex");
}

const databaseUrls = getDatabaseUrls();

if (!databaseUrls) {
  console.error("Missing database credentials in .env.local\n");
  console.error("Add ONE of these:");
  console.error("  DATABASE_URL=postgresql://postgres.[ref]:[password]@....pooler.supabase.com:5432/postgres");
  console.error("  DATABASE_PASSWORD=your-db-password  (plus NEXT_PUBLIC_SUPABASE_URL)");
  console.error("\nGet the URI from Supabase → Settings → Database → Connection string (Session pooler).");
  process.exit(1);
}

let client;

try {
  client = await connectClient();
  if (!client) throw new Error("Could not connect");

  await ensureMigrationTable(client);

  for (const file of MIGRATION_FILES) {
    const sql = readFileSync(join(root, file), "utf8");
    const checksum = checksumFor(sql);

    if (await isApplied(client, file, checksum)) {
      console.log(`Skip (already applied): ${file}`);
      continue;
    }

    console.log(`Running ${file}...`);
    await client.query(sql);
    await markApplied(client, file, checksum);
    console.log(`Done: ${file}`);
  }

  console.log("\nAll migrations up to date.");
} catch (error) {
  console.error("\nMigration failed:", error.message);
  console.error("\nIf connection failed, run:");
  console.error("  npm run db:url     # auto-find DATABASE_URL and save to .env.local");
  console.error("  npm run db:setup   # find URL + run all migrations in one go");
  process.exit(1);
} finally {
  if (client) await client.end();
}
