import { parse, serialize } from "cookie";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SUPABASE_SESSION_COOKIE_OPTIONS,
  toBrowserSessionCookieOptions,
} from "@/lib/supabase/session-cookies";

let browserClient: SupabaseClient | undefined;

function readDocumentCookies() {
  const parsed = parse(document.cookie);
  return Object.keys(parsed).map((name) => ({
    name,
    value: parsed[name] ?? "",
  }));
}

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieOptions: SUPABASE_SESSION_COOKIE_OPTIONS,
        cookies: {
          getAll: () => readDocumentCookies(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              document.cookie = serialize(
                name,
                value,
                toBrowserSessionCookieOptions(options)
              );
            });
          },
        },
      }
    );
  }
  return browserClient;
}
