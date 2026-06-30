import pg from "pg";

export const SUPABASE_REGIONS = [
  "ap-south-1",
  "ap-south-2",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-northeast-1",
  "ap-northeast-2",
  "ap-east-1",
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "eu-central-1",
  "eu-central-2",
  "eu-north-1",
  "ca-central-1",
  "sa-east-1",
  "me-south-1",
  "af-south-1",
];

const POOLER_PREFIXES = ["aws-0", "aws-1", "aws"];

export function getProjectRef(supabaseUrl) {
  return supabaseUrl.replace("https://", "").replace(".supabase.co", "").replace(/\/$/, "");
}

function poolerHosts(region) {
  return POOLER_PREFIXES.map((prefix) => `${prefix}-${region}.pooler.supabase.com`);
}

export function buildDatabaseUrlCandidates({ supabaseUrl, password }) {
  if (!password || !supabaseUrl) return [];

  const ref = getProjectRef(supabaseUrl);
  const encoded = encodeURIComponent(password);
  const urls = new Set();

  // Direct connection (best for migrations)
  urls.add(`postgresql://postgres:${encoded}@db.${ref}.supabase.co:5432/postgres`);
  urls.add(`postgresql://postgres.${ref}:${encoded}@db.${ref}.supabase.co:5432/postgres`);
  urls.add(`postgresql://postgres.${ref}:${encoded}@db.${ref}.supabase.co:6543/postgres`);

  for (const region of SUPABASE_REGIONS) {
    for (const host of poolerHosts(region)) {
      urls.add(`postgresql://postgres.${ref}:${encoded}@${host}:5432/postgres`);
      urls.add(`postgresql://postgres.${ref}:${encoded}@${host}:6543/postgres`);
    }
  }

  return [...urls];
}

export function maskDatabaseUrl(url) {
  return url.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:****@");
}

export async function discoverWorkingDatabaseUrl(candidates, { onTry } = {}) {
  let lastError;

  for (const connectionString of candidates) {
    if (onTry) onTry(maskDatabaseUrl(connectionString));

    const client = new pg.Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
    });

    try {
      await client.connect();
      await client.query("select 1");
      await client.end();
      return connectionString;
    } catch (error) {
      lastError = error;
      await client.end().catch(() => {});
    }
  }

  throw lastError ?? new Error("Could not connect to Supabase database");
}

export async function resolveDatabaseUrl(env = process.env) {
  if (env.DATABASE_URL) return env.DATABASE_URL;

  const candidates = buildDatabaseUrlCandidates({
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    password: env.DATABASE_PASSWORD,
  });

  if (!candidates.length) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL and DATABASE_PASSWORD in .env.local");
  }

  return discoverWorkingDatabaseUrl(candidates);
}
