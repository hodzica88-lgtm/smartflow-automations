import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { loadServerEnv, publicEnv } from "@/shared/config/env";

export const createSupabaseServerClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies. Middleware can refresh them.
        }
      },
    },
  });
};

const buildSupabaseServiceRoleClient = () =>
  createClient(publicEnv.supabaseUrl, loadServerEnv().supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

let serviceRoleClient:
  | ReturnType<typeof buildSupabaseServiceRoleClient>
  | undefined;

export const createSupabaseServiceRoleClient = () => {
  serviceRoleClient ??= buildSupabaseServiceRoleClient();
  return serviceRoleClient;
};