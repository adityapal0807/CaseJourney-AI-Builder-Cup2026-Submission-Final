import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase URL or Key missing in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    const { data, error } = await supabase.from("cases").select("*").limit(1);
    if (error) {
      console.error("Database connection failed:", error.message);
      process.exit(1);
    } else {
      console.log("✅ Database connection successful!");
      console.log(`Found ${data.length} case(s) in the database.`);
      if (data.length > 0) {
        console.log("Sample case name:", data[0].name);
      }
      process.exit(0);
    }
  } catch (err) {
    console.error("Unexpected error:", err);
    process.exit(1);
  }
}

testConnection();
