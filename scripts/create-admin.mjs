/**
 * Create an admin login via Supabase Admin API.
 *
 * Usage:
 *   npm run create-admin -- admin@company.com SecurePass123
 */

import { createAuthUser, upsertProfile } from "./lib/supabase-admin.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.argv[2];
const password = process.argv[3];
const fullName = process.argv[4] || "Admin";

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

if (!email || !password) {
  console.error("Usage: npm run create-admin -- admin@company.com YourPassword [Full Name]");
  process.exit(1);
}

if (password.length < 6) {
  console.error("Password must be at least 6 characters.");
  process.exit(1);
}

try {
  const user = await createAuthUser(email, password);
  await upsertProfile(user.id, fullName, "admin");
  console.log("Admin created successfully.");
  console.log("  Email:", user.email);
  console.log("  User ID:", user.id);
  console.log("  Role: admin");
} catch (error) {
  console.error("Failed:", error.message);
  process.exit(1);
}
