import { createClient } from "@supabase/supabase-js";

// Service role key — never expose this to the frontend. It only lives here,
// in serverless functions that run on Vercel's server, never in index.html.
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
