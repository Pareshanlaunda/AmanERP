/**
 * Backfill profiles for existing auth users without a profile row.
 *
 * Usage:
 *   npm run backfill-profiles
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Missing env vars in .env.local");
  process.exit(1);
}

const usersResponse = await fetch(`${url}/auth/v1/admin/users`, {
  headers: {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  },
});

const usersBody = await usersResponse.json();
if (!usersResponse.ok) {
  console.error("Failed to list users:", usersBody);
  process.exit(1);
}

const users = usersBody.users ?? [];

for (const user of users) {
  const profileResponse = await fetch(
    `${url}/rest/v1/profiles?id=eq.${user.id}&select=id`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    }
  );
  const existing = await profileResponse.json();
  if (existing.length > 0) continue;

  const role = user.email?.includes("admin") ? "admin" : "employee";
  const insertResponse = await fetch(`${url}/rest/v1/profiles`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: user.id,
      full_name: user.email?.split("@")[0] ?? "User",
      role,
    }),
  });

  if (!insertResponse.ok) {
    console.error("Failed for", user.email, await insertResponse.text());
  } else {
    console.log("Created profile for", user.email, "as", role);
  }
}

console.log("Backfill complete.");
