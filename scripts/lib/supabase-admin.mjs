/**
 * Create a user via Supabase Admin API and profiles row.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function createAuthUser(email, password) {
  const response = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
    }),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.msg || body.message || body.error_description || response.statusText);
  }

  return body;
}

export async function upsertProfile(userId, fullName, role) {
  const response = await fetch(`${url}/rest/v1/profiles`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      id: userId,
      full_name: fullName,
      role,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || response.statusText);
  }
}
