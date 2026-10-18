import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Missing Supabase environment variables. Check your .env file."
  );
}

// flowType "implicit" is required for 6-digit OTP verification via verifyOtp().
// The default "pkce" flow stores a code verifier that breaks the /auth/v1/verify
// endpoint when used with email OTPs, causing CORS/Load failed errors.
export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "", {
  auth: {
    flowType: "implicit",
  },
});
