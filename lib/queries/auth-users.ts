import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

const AUTH_USERS_PAGE_SIZE = 1000;

export async function listAllAuthUsers(): Promise<User[]> {
  const admin = createAdminClient();
  const users: User[] = [];
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: AUTH_USERS_PAGE_SIZE });
    if (error) {
      console.error("[auth-users] listUsers failed", error.message);
      throw new Error("Unable to load users");
    }

    const batch = data?.users ?? [];
    users.push(...batch);

    if (batch.length < AUTH_USERS_PAGE_SIZE) break;
    page += 1;
  }

  return users;
}
