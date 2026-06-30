/**
 * Find a working Supabase DATABASE_URL and save it to .env.local.
 *
 * Usage:
 *   npm run db:url
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   DATABASE_PASSWORD
 */

import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  buildDatabaseUrlCandidates,
  discoverWorkingDatabaseUrl,
  maskDatabaseUrl,
} from "./db-utils.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const password = process.env.DATABASE_PASSWORD;

if (!supabaseUrl || !password) {
  console.error("Add these to .env.local first:");
  console.error("  NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co");
  console.error("  DATABASE_PASSWORD=your-db-password");
  console.error("\nPassword: Supabase → Settings → Database");
  process.exit(1);
}

try {
  console.log("Searching for a working Supabase database connection...");
  const candidates = buildDatabaseUrlCandidates({ supabaseUrl, password });
  let tried = 0;
  const databaseUrl = await discoverWorkingDatabaseUrl(candidates, {
    onTry: () => {
      tried += 1;
      if (tried % 10 === 0) process.stdout.write(".");
    },
  });
  if (tried >= 10) console.log("");

  let envContent = readFileSync(envPath, "utf8");
  const line = `DATABASE_URL=${databaseUrl}`;

  if (/^DATABASE_URL=.*$/m.test(envContent)) {
    envContent = envContent.replace(/^DATABASE_URL=.*$/m, line);
  } else {
    envContent = envContent.trimEnd() + `\n${line}\n`;
  }

  writeFileSync(envPath, envContent, "utf8");

  console.log("\nSaved to .env.local:");
  console.log(`  ${maskDatabaseUrl(line)}`);
  console.log("\nNext, run migrations:");
  console.log("  npm run migrate");
} catch (error) {
  console.error("\nCould not find a working connection:", error.message);
  console.error("\nCheck DATABASE_PASSWORD in Supabase → Settings → Database.");
  process.exit(1);
}
