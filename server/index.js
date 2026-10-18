import express from "express";
import cors from "cors";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from .env in local dev; on Vercel they are injected directly
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// PostHog removed for hackathon submission — lightweight no-op mock
const posthog = {
  capture: () => { },
  captureException: () => { },
  shutdown: async () => { },
};
const setupExpressRequestContext = () => { };
const setupExpressErrorHandler = () => { };

const app = express();
const PORT = process.env.PORT || 3001;

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:4173",
  ...(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin))
        return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
  }),
);
app.use(express.json());
setupExpressRequestContext(posthog, app);

// ── Rate limiters ────────────────────────────────────────────────────────────
const rateLimitKeyGenerator = (req) =>
  req.headers["x-forwarded-for"]?.split(",")[0].trim() || ipKeyGenerator(req);

const waitlistLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: rateLimitKeyGenerator,
  message: { error: "Too many requests. Please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: rateLimitKeyGenerator,
  message: { error: "Too many requests. Please try again later." },
});

// ── Admin auth middleware ────────────────────────────────────────────────────
const ADMIN_SECRET = process.env.ADMIN_SECRET;
if (!ADMIN_SECRET) {
  console.warn(
    "WARNING: ADMIN_SECRET not set — all /api/admin/* routes will be blocked.",
  );
}

function requireAdmin(req, res, next) {
  const token = req.headers["x-admin-secret"];
  if (!ADMIN_SECRET || token !== ADMIN_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

app.use("/api/admin", requireAdmin);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anthropicApiKey =
  process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
const claudeModel =
  process.env.VITE_CLAUDE_MODEL ||
  process.env.CLAUDE_MODEL ||
  "claude-3-5-sonnet-20241022";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("WARNING: Supabase variables are missing from env.");
}

// Anon client — respects RLS (used for interview reads)
const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");

// Service role client — bypasses RLS (used for admin writes)
const supabaseAdmin = createClient(
  supabaseUrl || "",
  supabaseServiceKey || supabaseAnonKey || "",
  { auth: { autoRefreshToken: false, persistSession: false } },
);

if (!supabaseServiceKey) {
  console.warn(
    "WARNING: SUPABASE_SERVICE_ROLE_KEY missing — admin writes will use anon key and may fail due to RLS.",
  );
}

import { Resend } from "resend";
const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const resend = resendApiKey ? new Resend(resendApiKey) : null;
if (!resendApiKey) {
  console.warn(
    "[email-config] RESEND_API_KEY is missing — email dispatch will be skipped entirely.",
  );
} else {
  console.log(
    `[email-config] RESEND_API_KEY present (length=${resendApiKey.length})`,
  );
  console.log(`[email-config] From address: "${resendFrom}"`);
  if (resendFrom === "onboarding@resend.dev") {
    console.warn(
      "[email-config] WARNING: Using onboarding@resend.dev — Resend only delivers to your own account email in this mode. Set RESEND_FROM_EMAIL to a verified domain to reach any recipient.",
    );
  }
}

import { renderTemplate } from "./email.js";

// Logo reading removed since we'll use a remote URL
console.log(
  `[email-config] Logo attachment logic removed — using hosted remote logo instead`,
);
async function sendEmail({ to, subject, html }) {
  console.log(`[email] Attempting to send "${subject}" → ${to}`);
  console.log(`[email]   from: ${resendFrom}`);
  console.log(`[email]   resend client initialized: ${!!resend}`);

  if (!resend) {
    console.warn(
      `[email] SKIPPED — no RESEND_API_KEY. "${subject}" was not sent to ${to}.`,
    );
    return { ok: false, reason: "no_api_key" };
  }

  const attachments = [];

  try {
    console.log(`[email] Calling resend.emails.send...`);
    const result = await resend.emails.send({
      from: resendFrom,
      to,
      subject,
      html,
      attachments,
    });
    console.log(
      `[email] Resend raw response:`,
      JSON.stringify(result, null, 2),
    );

    if (result.error) {
      console.error(`[email] FAILED — Resend returned error for ${to}:`);
      console.error(`[email]   name: ${result.error.name}`);
      console.error(`[email]   message: ${result.error.message}`);
      console.error(`[email]   statusCode: ${result.error.statusCode}`);
      return { ok: false, reason: result.error.message };
    }

    console.log(
      `[email] SUCCESS — sent to ${to} (Resend id: ${result.data?.id})`,
    );
    return { ok: true };
  } catch (err) {
    console.error(`[email] EXCEPTION while sending to ${to}:`);
    console.error(`[email]   message: ${err?.message || String(err)}`);
    console.error(`[email]   stack: ${err?.stack}`);
    return { ok: false, reason: err?.message || String(err) };
  }
}

// ── Admin User Management routes ───────────────────────────────────────────

// ── Waitlist (Wishlist) API routes ─────────────────────────────────────────

app.get("/api/waitlist/count", waitlistLimiter, async (req, res) => {
  try {
    const [waitlistRes, usersRes] = await Promise.all([
      supabaseAdmin
        .from("waitlist")
        .select("*", { count: "exact", head: true }),
      supabaseAdmin.from("users").select("*", { count: "exact", head: true }),
    ]);
    if (waitlistRes.error)
      return res.status(400).json({ error: waitlistRes.error.message });
    if (usersRes.error)
      return res.status(400).json({ error: usersRes.error.message });
    const total = 100 + (waitlistRes.count ?? 0) + (usersRes.count ?? 0);
    res.json({ count: total });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/waitlist", waitlistLimiter, async (req, res) => {
  try {
    const { name, email, target_firm, timeline } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists in waitlist
    const { data: existing } = await supabaseAdmin
      .from("waitlist")
      .select("status")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existing) {
      if (existing.status === "pending") {
        return res
          .status(409)
          .json({
            code: "ALREADY_WAITLISTED",
            error:
              "You're already on the waitlist. We'll reach out when your slot opens.",
          });
      }
      if (existing.status === "approved") {
        return res
          .status(409)
          .json({
            code: "ALREADY_APPROVED",
            error:
              "Your application has already been approved. Check your inbox to sign in.",
          });
      }
      // rejected — allow resubmission: update the existing row
      if (existing.status === "rejected") {
        const { data, error } = await supabaseAdmin
          .from("waitlist")
          .update({ name, target_firm, timeline, status: "pending" })
          .eq("email", normalizedEmail)
          .select()
          .single();
        if (error) return res.status(400).json({ error: error.message });
        posthog.capture({
          distinctId: normalizedEmail,
          event: "waitlist rejoined",
          properties: {
            name,
            target_firm,
            timeline,
            $set: { name, target_firm, timeline },
          },
        });
        console.log(
          `[waitlist] Re-join flow for ${normalizedEmail}: DB update succeeded, awaiting rejoin email`,
        );
        const rejoinResult = await sendEmail({
          to: normalizedEmail,
          subject: "Welcome back to CaseJourney Waitlist",
          html: renderTemplate("2-waitlist-rejoin", { name }),
        });
        if (rejoinResult?.ok === false)
          console.warn(
            `[waitlist] Rejoin email did not send for ${normalizedEmail}: ${rejoinResult.reason}`,
          );
        else
          console.log(`[waitlist] Rejoin email sent OK for ${normalizedEmail}`);
        return res.json(data);
      }
    }

    // Insert into waitlist table
    const { data, error } = await supabaseAdmin
      .from("waitlist")
      .insert({
        name,
        email: normalizedEmail,
        target_firm,
        timeline,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    posthog.capture({
      distinctId: normalizedEmail,
      event: "waitlist signup submitted",
      properties: {
        name,
        target_firm,
        timeline,
        waitlist_id: data?.id,
        $set: { name, target_firm, timeline },
      },
    });
    console.log(
      `[waitlist] New signup saved for ${normalizedEmail} (id: ${data?.id}), awaiting confirmation email`,
    );
    const { count: waitlistCount } = await supabaseAdmin
      .from("waitlist")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");
    const waitlist_number = 100 + (waitlistCount ?? 0);
    const confirmResult = await sendEmail({
      to: normalizedEmail,
      subject: "Welcome to CaseJourney Waitlist",
      html: renderTemplate("1-waitlist-new", { name, target_firm: (target_firm || "Not specified").toUpperCase(), waitlist_number }),
    });
    if (confirmResult?.ok === false)
      console.warn(
        `[waitlist] Confirmation email did not send for ${normalizedEmail}: ${confirmResult.reason}`,
      );
    else
      console.log(
        `[waitlist] Confirmation email sent OK for ${normalizedEmail}`,
      );
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/admin/waitlist", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("waitlist")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/auth/check", authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    const normalizedEmail = email.toLowerCase().trim();
    const { data } = await supabaseAdmin
      .from("preauthorized_users")
      .select("email")
      .eq("email", normalizedEmail)
      .maybeSingle();
    if (!data) {
      posthog.capture({
        distinctId: normalizedEmail,
        event: "auth check failed",
        properties: { email: normalizedEmail },
      });
      return res
        .status(403)
        .json({
          code: "NOT_APPROVED",
          error:
            "This email isn't approved yet. Apply for the waitlist to get access.",
        });
    }
    posthog.capture({
      distinctId: normalizedEmail,
      event: "auth check passed",
      properties: { email: normalizedEmail },
    });
    res.json({ allowed: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/admin/waitlist/:id/approve", async (req, res) => {
  try {
    // 1. Fetch waitlist entry
    const { data: waitlistEntry, error: fetchError } = await supabaseAdmin
      .from("waitlist")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (fetchError || !waitlistEntry) {
      return res.status(404).json({ error: "Waitlist entry not found" });
    }

    // 2. Pre-authorize in database
    const { error: authError } = await supabaseAdmin
      .from("preauthorized_users")
      .insert({
        email: waitlistEntry.email,
        name: waitlistEntry.name,
        role: "user",
      })
      .select()
      .maybeSingle();

    // Check if error is not duplicate key (if duplicate, it's already preauthorized)
    if (authError && authError.code !== "23505") {
      return res.status(400).json({ error: authError.message });
    }

    // 3. Update waitlist status
    const { data, error: updateError } = await supabaseAdmin
      .from("waitlist")
      .update({ status: "approved" })
      .eq("id", req.params.id)
      .select()
      .single();

    if (updateError)
      return res.status(400).json({ error: updateError.message });

    posthog.capture({
      distinctId: waitlistEntry.email,
      event: "user approved",
      properties: {
        name: waitlistEntry.name,
        target_firm: waitlistEntry.target_firm,
        timeline: waitlistEntry.timeline,
      },
    });

    // 4. Generate a magic link so the user can sign in without needing a password
    const origin = req.headers.origin || "https://casejourney.co.in";
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: waitlistEntry.email,
        options: { redirectTo: origin },
      });

    if (linkError) {
      console.error(
        "[approve] Failed to generate magic link:",
        linkError.message,
      );
    }

    const magicLink = linkData?.properties?.action_link ?? null;
    console.log(
      `[approve] Magic link for ${waitlistEntry.email}: ${magicLink ? "generated" : "unavailable"}`,
    );

    // 5. Send Approval email with magic link
    const cta_block = magicLink
      ? `<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
      <tr><td style="background:#0e8f5a;border-radius:6px;">
        <a href="${magicLink}" style="display:inline-block;padding:14px 28px;color:#fff;text-decoration:none;font-family:'Courier New',Courier,monospace;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">Sign in to CaseJourney →</a>
      </td></tr>
    </table>
    <p style="margin:0 0 24px;font-size:11px;font-family:'Courier New',Courier,monospace;color:#b0afa8;line-height:1.7;">This link expires in 24 hours and can only be used once. After signing in you can set a password from your account settings.</p>`
      : `<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
      <tr><td style="background:#0e8f5a;border-radius:6px;">
        <a href="${origin}" style="display:inline-block;padding:14px 28px;color:#fff;text-decoration:none;font-family:'Courier New',Courier,monospace;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">Open CaseJourney →</a>
      </td></tr>
    </table>
    <p style="margin:0 0 24px;font-size:11px;font-family:'Courier New',Courier,monospace;color:#b0afa8;line-height:1.7;">Use your email address to sign in with Google or request a magic link on the sign-in page.</p>`;

    await sendEmail({
      to: waitlistEntry.email,
      subject: "You're in — CaseJourney access approved",
      html: renderTemplate("3-approval-access", { name: waitlistEntry.name, email: waitlistEntry.email, cta_block }),
    });

    // 6. Send Onboarding email with key functionalities
    await sendEmail({
      to: waitlistEntry.email,
      subject: "Welcome to CaseJourney — Start your case interview journey",
      html: renderTemplate("4-approval-onboarding", { name: waitlistEntry.name }),
    });

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/admin/waitlist/:id/reject", async (req, res) => {
  try {
    // 1. Fetch waitlist entry
    const { data: waitlistEntry, error: fetchError } = await supabaseAdmin
      .from("waitlist")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (fetchError || !waitlistEntry) {
      return res.status(404).json({ error: "Waitlist entry not found" });
    }

    // 2. Remove preauthorization if they were pre-authorized by chance
    await supabaseAdmin
      .from("preauthorized_users")
      .delete()
      .eq("email", waitlistEntry.email);

    // 3. Update status
    const { data, error: updateError } = await supabaseAdmin
      .from("waitlist")
      .update({ status: "rejected" })
      .eq("id", req.params.id)
      .select()
      .single();

    if (updateError)
      return res.status(400).json({ error: updateError.message });

    posthog.capture({
      distinctId: waitlistEntry.email,
      event: "user rejected",
      properties: { name: waitlistEntry.name },
    });

    // 4. Send Rejection email
    await sendEmail({
      to: waitlistEntry.email,
      subject: "Update on your CaseJourney application",
      html: renderTemplate("5-rejection", { name: waitlistEntry.name }),
    });

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/admin/users", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/admin/preauthorized_users", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("preauthorized_users")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/admin/usage_logs", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("usage_logs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/admin/preauthorized_users", async (req, res) => {
  try {
    const { email, name, role } = req.body;
    const { data, error } = await supabaseAdmin
      .from("preauthorized_users")
      .insert({ email, name, role })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    posthog.capture({
      distinctId: email,
      event: "user invited",
      properties: { name, role, $set: { name, role } },
    });

    // Send Invite Email
    await sendEmail({
      to: email,
      subject: "You've been invited to CaseJourney",
      html: renderTemplate("6-direct-invite", { name: name || "there", role }),
    });

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/admin/preauthorized_users/:id", async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from("preauthorized_users")
      .delete()
      .eq("id", req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/admin/users/:id", async (req, res) => {
  try {
    const { email } = req.query;
    if (email) {
      await supabaseAdmin
        .from("preauthorized_users")
        .delete()
        .eq("email", email.toLowerCase());
    }
    const { error } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("id", req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Admin CRUD routes ──────────────────────────────────────────────────────
app.get("/api/admin/cases", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("cases")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/admin/cases/:id", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("cases")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/admin/cases", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("cases")
      .insert(req.body)
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch("/api/admin/cases/:id", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("cases")
      .update(req.body)
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/admin/cases/:id", async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from("cases")
      .delete()
      .eq("id", req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Case turns
app.get("/api/admin/cases/:caseId/turns", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("case_turns")
      .select("*")
      .eq("case_id", req.params.caseId)
      .order("turn_number", { ascending: true });
    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/admin/cases/:caseId/turns", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("case_turns")
      .insert({ ...req.body, case_id: req.params.caseId })
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch("/api/admin/turns/:id", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("case_turns")
      .update(req.body)
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/admin/turns/:id", async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from("case_turns")
      .delete()
      .eq("id", req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Framework nodes
app.get("/api/admin/cases/:caseId/nodes", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("framework_nodes")
      .select("*")
      .eq("case_id", req.params.caseId);
    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/admin/cases/:caseId/nodes", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("framework_nodes")
      .insert({ ...req.body, case_id: req.params.caseId })
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch("/api/admin/nodes/:id", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("framework_nodes")
      .update(req.body)
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/admin/nodes/:id", async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from("framework_nodes")
      .delete()
      .eq("id", req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const LEGACY_CASES = {
  nordvik: {
    title: "Nordvik Margin Collapse",
    caseType: "Profitability",
    opening: `Your client is Nordvik, a Norwegian consumer goods company with revenues of €2.1B. Their operating margin has collapsed from 14% to 9% in 18 months. The CEO needs a diagnosis and turnaround plan by end of Q4. How would you approach this?`,
    rootCause:
      "COGS inflation driven by raw material supplier concentration — top 2 suppliers represent 68% of input costs; both passed through a combined 34% price increase while competitors diversified.",
    wildcard: {
      message:
        "Breaking — Nordvik's second-largest supplier just announced a 40% price increase citing global commodity inflation. The CFO is asking whether this changes your diagnosis and whether you'd recommend an emergency hedge.",
      type: "market_shock",
    },
    frameworkPillars: [
      { name: "Revenue Analysis", desc: "Volume, pricing, mix" },
      { name: "Cost Structure", desc: "COGS, opex, overhead" },
      { name: "Turnaround Plan", desc: "Quick wins, strategic" },
    ],
    stages: [
      "Problem Framing",
      "Framework",
      "Analysis",
      "Synthesis",
      "Recommendation",
    ],
  },
  fastfashion: {
    title: "FashionCo EU Market Entry",
    caseType: "Market Entry",
    opening: `Your client is a fast-fashion retailer based in Southeast Asia with €800M revenue, looking to enter the German and French markets. They've seen 30% CAGR domestically. Should they enter? If yes, how?`,
    rootCause:
      "Market entry is viable but only via digital-first with 2–3 selective flagship stores in Berlin and Paris — not a full physical rollout.",
    wildcard: {
      message:
        "H&M just announced aggressive discounting across EU — a 15% average price reduction across all categories for the next two quarters. Your client's planned price positioning overlaps directly. Does this change your market entry recommendation?",
      type: "market_shock",
    },
    frameworkPillars: [
      { name: "Market Attractiveness", desc: "Size, growth, segment fit" },
      { name: "Competitive Dynamics", desc: "Players, price points, share" },
      { name: "Entry Strategy", desc: "Channel, format, phasing" },
    ],
    stages: [
      "Problem Framing",
      "Framework",
      "Analysis",
      "Synthesis",
      "Recommendation",
    ],
  },
  indev: {
    title: "IndEV Breakeven Push",
    caseType: "Profitability",
    opening: `Your client is a domestic Indian electric two-wheeler manufacturer. They IPO'd 18 months ago but are under pressure to reach EBITDA breakeven. Revenue is ₹3,200 Cr but margins are –8%. What would you look at?`,
    rootCause:
      "Subsidy dependency (FAME II) combined with high customer acquisition cost (CAC ₹8,200 per unit vs. industry ₹4,100). Battery cost at 42% of unit economics is addressable through battery-as-a-service pivot.",
    wildcard: {
      message:
        "The Ministry of Heavy Industries just announced a 6-month delay in FAME III subsidy rollout — longer than expected. Your client's FY25 plan assumed ₹12,000 per unit subsidy from Q3. The CFO needs a revised recommendation within the hour.",
      type: "client_shock",
    },
    frameworkPillars: [
      { name: "Unit Economics", desc: "Revenue, COGS, margin per unit" },
      { name: "Growth Levers", desc: "CAC, channels, pricing" },
      { name: "Strategic Options", desc: "BaaS, D2C, partnerships" },
    ],
    stages: [
      "Problem Framing",
      "Framework",
      "Analysis",
      "Synthesis",
      "Recommendation",
    ],
  },
  evcharging: {
    title: "EV Charging Infrastructure in Gurgaon",
    caseType: "Guesstimate",
    opening: "Welcome. Today I'd like you to help me with an estimate for the Chief Minister of Haryana. The CM is reviewing public fast-charging infrastructure for four-wheeler electric cars (passenger EVs & commercial cabs) in Gurgaon. How many public fast-charging stations are currently operational in Gurgaon, and what should the target be by 2030? Please focus specifically on 4-wheeler cars — take a moment to lay out your structure.",
    rootCause:
      "The answer is approximately 250–350 public 4W EV charging stations in Gurgaon as of mid-2025. Scope is strictly 4-wheelers (cars & commercial fleet cabs; 2-wheelers use home/battery swap and are out of scope). Key estimation logic: Gurgaon has ~3,500 registered 4W electric cars. Segment into retail personal cars (80% charge at home overnight) vs commercial fleet cabs (20% fleet, but drive 180-200 km/day requiring daily public fast charging). At ~1 public charger per 10-12 EV cars, demand yields ~280-320 stations. At 12h peak utilization and 45 min dwell, need ~300 stations. For 2030 CM target: 2,000-2,500 stations (~₹800-1,000 Cr capex) with DHBVN grid substation upgrades.",
    wildcard: {
      message:
        "DHBVN just notified the CM that current grid substations in Cyber City and Golf Course Road can only support 15 additional fast charging stations before transformer upgrades are required. How would you factor this grid constraint into your rollout timeline?",
      type: "grid_shock",
    },
    frameworkPillars: [
      { name: "4W Fleet Sizing", desc: "Gurgaon pop -> 4W EV car stock -> retail vs fleet split" },
      { name: "Dwell Time & Peak Ops", desc: "45 min fast charge, 12h peak window, downtime buffer" },
      { name: "2030 CM Target & Grid", desc: "2,000-2,500 stations target, grid capacity, ₹800 Cr" },
    ],
    stages: [
      "Problem Framing",
      "4W Fleet Sizing",
      "Charging Operations",
      "Grid Shock",
      "CM Recommendation",
    ],
    frameworkNodes: [
      { id: "problem", label: "EV Infrastructure Sizing", framework: "Root", quality: "optimal", parentLabel: null },
      { id: "pop_fleet", label: "Population & Fleet", framework: "Demand Funnel", quality: "optimal", parentLabel: "EV Infrastructure Sizing" },
      { id: "retail_vs_comm", label: "Retail vs Commercial", framework: "Segmentation", quality: "optimal", parentLabel: "EV Infrastructure Sizing" },
      { id: "charging_turn", label: "Charging Duration", framework: "Operations", quality: "optimal", parentLabel: "EV Infrastructure Sizing" },
      { id: "unconstrained", label: "24h Flat Sizing", framework: "Pitfall", quality: "missed", parentLabel: "EV Infrastructure Sizing" },
      { id: "flat_24h_mistake", label: "Assumed 24h Queue", framework: "Flaw", quality: "missed", parentLabel: "24h Flat Sizing" },
      { id: "no_buffer_risk", label: "Zero Downtime Buffer", framework: "Risk", quality: "missed", parentLabel: "24h Flat Sizing" },
      { id: "peak_window_fix", label: "12h Peak Window", framework: "Correction", quality: "optimal", parentLabel: "Charging Duration" },
      { id: "downtime_buffer", label: "25% Downtime Buffer", framework: "Buffer Math", quality: "optimal", parentLabel: "12h Peak Window" },
      { id: "corridor_shift", label: "Dwarka Expressway Shift", framework: "Grid Agility", quality: "optimal", parentLabel: "25% Downtime Buffer" },
      { id: "target_2030", label: "2030 Target: 2,200 Stns", framework: "Synthesis", quality: "optimal", parentLabel: "Dwarka Expressway Shift" }
    ],
  },
  gurgaon_ev: null, // alias handled below
  "a0e1c2d3-0001-4000-a000-000000000001": null, // alias handled below
};
LEGACY_CASES.gurgaon_ev = LEGACY_CASES.evcharging;
LEGACY_CASES["a0e1c2d3-0001-4000-a000-000000000001"] = LEGACY_CASES.evcharging;

function buildSystemPrompt(config, difficulty) {
  const scoringSection =
    config.scoringDimensions.length > 0
      ? `SCORING DIMENSIONS (use these dimensions instead of defaults):
${config.scoringDimensions.map((d) => `- "${d.key}": ${d.label} (weight: ${d.weight})`).join("\n")}
`
      : `SCORING DIMENSIONS (default):
- "structure": Structure (weight: 20)
- "quantitative": Quantitative (weight: 20)
- "creativity": Creativity (weight: 20)
- "communication": Communication (weight: 20)
- "speed": Speed (weight: 20)
`;

  const frameworkNodesSection =
    config.frameworkNodes.length > 0
      ? `\nEXPERT FRAMEWORK TREE (the ideal solution structure — do NOT reveal directly, use to evaluate candidate):
${config.frameworkNodes.map((n) => `- ${n.label} [${n.framework}] quality: ${n.quality}${n.parentLabel ? `, child of: ${n.parentLabel}` : " (root)"}`).join("\n")}
`
      : "";

  return `You are Alex Park, Senior Partner at . & Company, London office.
You are conducting an interviewer-led case interview. You follow .'s exact format.

Your personality:
- Intellectually rigorous, warm but not lenient
- You NEVER say "Great point!" or "Excellent!" — respond analytically with Socratic pushback
- You challenge weak reasoning immediately
- You are time-aware and move the case forward efficiently
- Difficulty level: ${difficulty}

THE CASE:
Title: ${config.title}
Type: ${config.caseType}
Opening question: "${config.opening}"
Root cause (do NOT reveal directly): ${config.rootCause}
${config.wildcard ? `Wildcard (fire once between turn 4–7, only if not yet fired): ${JSON.stringify(config.wildcard)}` : "No wildcard for this case."}
Framework pillars: ${JSON.stringify(config.frameworkPillars)}
${frameworkNodesSection}
CASE PHASES (total case time: 5 minutes max, ~6 turns total):
1. STRUCTURE (turns 1–2): Evaluate the candidate's framework
2. DEEP DIVE (turns 3–4): Probe specific branches, reveal exhibits
3. SYNTHESIS (turns 5–6): Push for recommendation and action plan
4. After turn 6 or when synthesis is complete, set phase_transition to "complete"

PROGRESSIVE REVEAL SYSTEM:
The UI starts with a blank canvas. You control what appears by returning canvas_updates.
Each canvas_update has a "type" and "data". Available types:

1. "unlock_framework" — Unlock the framework pillars when candidate proposes a structure
   data: { pillar_names: ["Pillar A", "Pillar B", "Pillar C"], sub_branches: ["Branch 1", "Branch 2"] }

2. "activate_pillar" — Mark a pillar as active when diving into it
   data: { pillar_index: 0, sub_branches: ["Sub-topic A", "Sub-topic B", "Sub-topic C"] }

3. "complete_pillar" — Mark a pillar as completed
   data: { pillar_index: 0 }

4. "add_context" — Add a confirmed or hypothesis context card
   data: { label: "TIMELINE", value: "18-24 months", state: "confirmed" }  // state: "confirmed" | "hypothesis"

5. "add_exhibit" — Reveal an exhibit/artifact in the right panel
   data: { exhibit_id: "A", title: "EU Fashion Retail Market", type: "bar_chart"|"data_table"|"trend_line"|"insight_card"|"market_funnel", chart_data: {...} }

6. "set_focus" — Set the current focus question for the candidate
   data: { question: "The question text", tips: ["Tip 1", "Tip 2", "Tip 3"] }

7. "advance_stage" — Move the stage progress indicator forward
   data: { stage_index: 1 }

8. "award_badge" — Give a live badge for good performance
   data: { label: "On track for", name: "MECE Machine (3/5)" }

Return canvas_updates as an array. Include ALL relevant updates per turn. Start with few, progressively add more.

EXHIBITS available to reveal (reveal one per turn when relevant):
- bar_chart: "chart_data": { "bars": [{"label": "...", "value": 14, "color": "green"|"red"|"blue"|"purple"|"amber"}] }
- data_table: "chart_data": { "headers": [...], "rows": [{"cells": [...], "highlight": false}] }
- trend_line: "chart_data": { "lines": [{"key": "...", "name": "...", "color": "#hex"}], "points": [...], "todayMarker": "2024" }
- insight_card: "chart_data": { "insight": "...", "implication": "..." }
- market_funnel: "chart_data": { "layers": [{"label": "...", "value": "...", "count": 100}] }

${scoringSection}
SCORING RULES:
- Return scores after EVERY turn
- Score each dimension 1–10 based on that turn's response
- null = dimension not tested yet this turn
- Be harsh but fair. A 10 is near-perfect .-level. 7 is competent.

CRITICAL: Every response MUST be valid JSON in this EXACT format:
{
  "message": "Your spoken response as Alex Park (2–4 sentences, conversational but rigorous)",
  "canvas_updates": [
    { "type": "unlock_framework", "data": {...} },
    { "type": "add_context", "data": {...} }
  ],
  "phase_transition": null,
  "wildcard": null,
  "scores": {
    "dimension_key": 1-10 or null
  },
  "score_rationale": "One sentence explaining overall score",
  "nodes_explored": [
    {
      "id": "pop_fleet",
      "label": "Population & Fleet",
      "framework": "Demand Funnel",
      "quality": "strong",
      "parent_id": "problem",
      "feedback": "Grounded from population to vehicle base"
    }
  ]
}

MIND-MAP NODES EXPLORED GUIDELINES:
- Every turn, include 1 to 3 objects in "nodes_explored" mapping the candidate's current statements.
- Root node id is ALWAYS "problem".
- Set "parent_id" to the branch it connects to (e.g. "problem", "pop_fleet", "retail_vs_comm", "charging_turn", or "unconstrained"). DO NOT leave parent_id null for child branches!
- Set "quality" accurately:
  * "strong" when reasoning is rigorous and substantiated.
  * "partial" when an assumption is simplistic or missing nuance.
  * "missed" when candidate made a flawed assumption or overlooked a critical constraint (e.g. zero downtime buffer, or flat 24h queue).

IMPORTANT RULES:
- Return ONLY the JSON object, no markdown, no extra text
- Keep message to 2–4 sentences max
- Only fire wildcard once (set wildcard field to the wildcard object, null all other times)
- phase_transition options: null, "deep_dive", "synthesis", "complete"
- Transition to deep_dive after turn 2, synthesis after turn 4
- The session is capped at 5 minutes. Move efficiently.
- On the first turn (candidate's framework proposal), unlock_framework and add initial context cards
- Build the canvas progressively: don't reveal everything at once
- The blank canvas IS the product. Start empty, reveal one thing at a time.`;
}

app.post("/api/interview/sendMessage", async (req, res) => {
  const { caseId, difficulty, conversationHistory, userMessage } = req.body;

  if (!caseId || !difficulty || !userMessage) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    let config;
    const isLegacyId = caseId in LEGACY_CASES;

    if (isLegacyId) {
      const legacy = LEGACY_CASES[caseId];
      config = {
        title: legacy.title,
        caseType: legacy.caseType,
        opening: legacy.opening,
        rootCause: legacy.rootCause,
        wildcard: legacy.wildcard,
        frameworkPillars: legacy.frameworkPillars,
        stages: legacy.stages,
        scoringDimensions: [],
        frameworkNodes: legacy.frameworkNodes || [],
      };
    } else {
      // Fetch case details from Supabase
      const { data: caseData, error: caseError } = await supabase
        .from("cases")
        .select("*")
        .eq("id", caseId)
        .single();

      if (caseError || !caseData) {
        return res.status(404).json({ error: "Case not found" });
      }

      // Fetch case turns
      const { data: turnsData } = await supabase
        .from("case_turns")
        .select("*")
        .eq("case_id", caseId)
        .order("turn_number", { ascending: true });

      // Fetch framework nodes
      const { data: nodesData } = await supabase
        .from("framework_nodes")
        .select("*")
        .eq("case_id", caseId);

      const turnsList = turnsData || [];
      const nodesList = nodesData || [];

      // Build framework pillars from interviewer turns
      const interviewerTurns = turnsList.filter(
        (t) => t.role === "interviewer",
      );
      const frameworkPillars =
        interviewerTurns.length >= 3
          ? interviewerTurns.slice(0, 3).map((t, i) => ({
            name: `Phase ${i + 1}`,
            desc: (t.dialogue_text || "").substring(0, 50),
          }))
          : [
            { name: "Problem Framing", desc: "Define scope and hypothesis" },
            { name: "Analysis", desc: "Dive deep into key areas" },
            { name: "Recommendation", desc: "Synthesize and recommend" },
          ];

      // Build scoring dimensions from candidate turns
      const candidateTurns = turnsList.filter(
        (t) => t.role === "candidate" && t.scoring_dimension,
      );
      const scoringDims =
        candidateTurns.length > 0
          ? [
            ...new Map(
              candidateTurns.map((t) => [
                t.scoring_dimension,
                {
                  key: t.scoring_dimension.toLowerCase().replace(/\s+/g, "_"),
                  label: t.scoring_dimension,
                  weight: t.scoring_weight ? Number(t.scoring_weight) : 20,
                },
              ]),
            ).values(),
          ]
          : [];

      // Build framework node descriptions
      const fwNodes = nodesList.map((n) => ({
        label: n.label,
        framework: n.framework,
        quality: n.quality,
        parentLabel: n.parent_node_id
          ? (nodesList.find((p) => p.id === n.parent_node_id)?.label ?? null)
          : null,
      }));

      config = {
        title: caseData.name,
        caseType: caseData.case_type,
        opening: caseData.problem_statement,
        rootCause:
          caseData.keep_in_mind ??
          caseData.brownie_points ??
          "Not specified — evaluate based on candidate's reasoning quality.",
        wildcard: null,
        frameworkPillars,
        stages: [
          "Problem Framing",
          "Framework",
          "Analysis",
          "Synthesis",
          "Recommendation",
        ],
        scoringDimensions: scoringDims,
        frameworkNodes: fwNodes,
      };
    }

    const systemPrompt = buildSystemPrompt(config, difficulty);
    const messages = [
      ...conversationHistory,
      { role: "user", content: userMessage },
    ];

    if (!anthropicApiKey) {
      throw new Error("Anthropic API key is not configured");
    }

    // Call Anthropic Messages API directly
    const anthropicResponse = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "x-api-key": anthropicApiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: claudeModel,
          max_tokens: 4000,
          system: systemPrompt,
          messages: messages.map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          })),
        }),
      },
    );

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      throw new Error(
        `Anthropic API returned status ${anthropicResponse.status}: ${errText}`,
      );
    }

    const result = await anthropicResponse.json();
    const rawText = result.content[0]?.text || "";

    // Parse JSON from response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.json({
        message: rawText,
        canvas_updates: [],
        artifact: null,
        phase_transition: null,
        wildcard: null,
        scores: {
          structure: null,
          quantitative: null,
          creativity: null,
          communication: null,
          speed: null,
        },
        score_rationale: null,
        nodes_explored: [],
        rawText,
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Extract exhibit from canvas_updates for backward compatibility
    let exhibitArtifact = parsed.artifact ?? null;
    const canvasUpdates = parsed.canvas_updates ?? [];
    for (const update of canvasUpdates) {
      if (update.type === "add_exhibit" && update.data) {
        const d = update.data;
        if (d.chart_data && d.type) {
          exhibitArtifact = {
            type: d.type,
            title: d.title ?? "Exhibit",
            data: d.chart_data,
          };
        }
      }
    }

    const distinctId =
      req.headers["x-posthog-distinct-id"] || `anonymous_${caseId}`;
    posthog.capture({
      distinctId,
      event: "interview message sent",
      properties: {
        case_id: caseId,
        difficulty,
        turn_number: (conversationHistory?.length ?? 0) + 1,
        phase_transition: parsed.phase_transition ?? null,
      },
    });

    if (parsed.phase_transition === "complete") {
      posthog.capture({
        distinctId,
        event: "interview completed",
        properties: {
          case_id: caseId,
          difficulty,
          total_turns: (conversationHistory?.length ?? 0) + 1,
        },
      });
    }

    res.json({
      ...parsed,
      canvas_updates: canvasUpdates,
      artifact: exhibitArtifact,
      nodes_explored: parsed.nodes_explored ?? [],
      rawText,
    });
  } catch (error) {
    console.error("API Error in sendMessage:", error);
    posthog.captureException(
      error,
      req.headers["x-posthog-distinct-id"] || undefined,
    );
    res
      .status(500)
      .json({ error: error.message || "Failed to process chat message" });
  }
});

// ── Email diagnostics ──────────────────────────────────────────────────────
// GET /api/test-email?to=you@example.com
// Sends a test email so you can verify Resend + sender domain are working.
app.get("/api/test-email", async (req, res) => {
  const to = req.query.to;
  if (!to) return res.status(400).json({ error: "Pass ?to=email@example.com" });
  const result = await sendEmail({
    to: String(to),
    subject: "CaseJourney — email test",
    html: `<p style="font-family:monospace">Test email from CaseJourney server.<br/>Sender: <strong>${resendFrom}</strong></p>`,
  });
  res.json({ from: resendFrom, to, ...result });
});

setupExpressErrorHandler(posthog, app);

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`CaseJourney API server running on port ${PORT}`);
  });
}

process.on("SIGTERM", async () => {
  await posthog.shutdown();
});

export default app;
