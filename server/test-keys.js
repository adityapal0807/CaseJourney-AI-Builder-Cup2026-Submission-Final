import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from parent directory
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;

console.log("=== API KEY DIAGNOSTIC SYSTEM ===");
console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Service Key Length:", supabaseServiceKey ? supabaseServiceKey.length : 0);
console.log("Resend Key Length:", resendApiKey ? resendApiKey.length : 0);

async function testSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Supabase variables missing from .env");
    return;
  }
  
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    // Attempt a simple read using service role
    const { data, error } = await supabaseAdmin.from("preauthorized_users").select("count");
    if (error) {
      console.error("❌ Supabase Service Role Key test failed:", error.message);
    } else {
      console.log("✅ Supabase Service Role Key is VALID! Successfully read database.");
    }
  } catch (e) {
    console.error("❌ Supabase test crashed:", e.message);
  }
}

async function testResend() {
  if (!resendApiKey) {
    console.error("❌ Resend API Key missing from .env");
    return;
  }

  const resend = new Resend(resendApiKey);
  try {
    console.log("Testing Resend API key...");
    const response = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: "singhadityapal08@gmail.com",
      subject: "Test Diagnostic",
      html: "<p>Testing API Key validity</p>"
    });
    
    if (response.error) {
      console.error("❌ Resend API Key is INVALID:", response.error);
    } else {
      console.log("✅ Resend API Key is VALID! Email sent successfully. ID:", response.data.id);
    }
  } catch (e) {
    console.error("❌ Resend test crashed:", e.message);
  }
}

async function run() {
  await testSupabase();
  console.log("------------------------");
  await testResend();
}

run();
