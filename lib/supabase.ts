import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function createServerSupabase() {
  return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface AingeprdTask {
  id: string;
  user_id: string;
  title: string;
  content: Record<string, unknown>;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageDb {
  id: string;
  user_id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface ChatSessionDb {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}
