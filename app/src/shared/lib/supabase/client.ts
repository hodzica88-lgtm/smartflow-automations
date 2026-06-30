import { createBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/shared/config/env";

export const createSupabaseBrowserClient = () =>
  createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
