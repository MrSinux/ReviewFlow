// supabase/functions/send-feedback-reply/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type Payload = {
  toEmail: string;
  subject?: string;
  message: string;
  feedbackId: string;
  businessId?: string;
  token?: string; // JWT can be sent in body to avoid CORS preflight
};

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, error: "Method Not Allowed" });

  // Use only the auto-injected Supabase env vars — never rely on custom secret fallbacks
  // that might carry a wrong value.
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail   = Deno.env.get("RESEND_FROM_EMAIL");

  if (!supabaseUrl)   return json(500, { ok: false, error: "Missing SUPABASE_URL" });
  if (!serviceKey)    return json(500, { ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" });
  if (!resendApiKey)  return json(500, { ok: false, error: "Missing RESEND_API_KEY" });
  if (!fromEmail)     return json(500, { ok: false, error: "Missing RESEND_FROM_EMAIL" });

  // Parse body first (stream can only be read once)
  let payload: Partial<Payload>;
  try {
    const raw = await req.text();
    payload = JSON.parse(raw) as Partial<Payload>;
  } catch {
    return json(400, { ok: false, error: "Invalid JSON body" });
  }

  // Accept JWT from Authorization header OR body.token (body avoids CORS preflight)
  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization") ?? "";
  const headerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const token = headerToken || (payload.token ?? "").trim();
  if (!token) return json(401, { ok: false, error: "Missing Authorization Bearer token" });

  const toEmail   = (payload.toEmail ?? "").trim();
  const subject   = (payload.subject ?? "A message from us").trim() || "A message from us";
  const message   = (payload.message ?? "").trim();
  const feedbackId = (payload.feedbackId ?? "").trim();
  const businessIdFromClient = (payload.businessId ?? "").trim() || undefined;

  if (!feedbackId)          return json(400, { ok: false, error: "Missing feedbackId" });
  if (!toEmail)             return json(400, { ok: false, error: "Missing toEmail" });
  if (!isEmail(toEmail))    return json(400, { ok: false, error: "Invalid toEmail" });
  if (!message)             return json(400, { ok: false, error: "Missing message" });

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Verify caller identity using the service-role client (can validate any user JWT)
  const { data: userRes, error: userErr } = await adminClient.auth.getUser(token);
  if (userErr || !userRes?.user) {
    console.error("getUser failed:", userErr?.message);
    return json(401, { ok: false, error: "Invalid or expired session. Please log in again." });
  }

  const callerId = userRes.user.id;

  const { data: profile, error: profileErr } = await adminClient
    .from("user_profiles")
    .select("id, role, business_id")
    .eq("id", callerId)
    .maybeSingle();

  if (profileErr || !profile) {
    console.error("Profile fetch failed:", profileErr?.message);
    return json(403, { ok: false, error: "Missing user profile" });
  }

  const role = (profile.role ?? "").toString();
  if (role !== "admin" && role !== "super") {
    return json(403, { ok: false, error: "Not authorized" });
  }

  if (role === "admin" && businessIdFromClient && profile.business_id &&
      businessIdFromClient !== profile.business_id) {
    return json(403, { ok: false, error: "Business mismatch" });
  }

  const { data: feedbackRow, error: feedbackErr } = await adminClient
    .from("feedback")
    .select("id, business_id, name, email, comment, rating")
    .eq("id", feedbackId)
    .single();

  if (feedbackErr || !feedbackRow) {
    return json(404, { ok: false, error: "Feedback not found" });
  }

  const feedbackBusinessId = feedbackRow.business_id as string;

  if (role === "admin" && profile.business_id && profile.business_id !== feedbackBusinessId) {
    return json(403, { ok: false, error: "Not authorized for this business" });
  }

  if (businessIdFromClient && businessIdFromClient !== feedbackBusinessId) {
    return json(400, { ok: false, error: "businessId does not match feedback" });
  }

  // Build email
  const safeMessageHtml = escapeHtml(message).replace(/\n/g, "<br/>");
  const safeCommentHtml = escapeHtml(String(feedbackRow.comment ?? "")).replace(/\n/g, "<br/>");

  const html = `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.5;">
    <p>${safeMessageHtml}</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;"/>
    <div style="color:#6b7280;font-size:12px">
      <div><strong>Original feedback</strong></div>
      <div>From: ${escapeHtml(String(feedbackRow.name ?? "Guest"))} (${escapeHtml(String(feedbackRow.email ?? "(no email)"))})</div>
      <div>Rating: ${escapeHtml(String(feedbackRow.rating ?? "-"))}/5</div>
      <div style="margin-top:8px">${safeCommentHtml || "-"}</div>
    </div>
  </div>`;

  const text = `${message}\n\n---\nOriginal feedback\nFrom: ${feedbackRow.name ?? "Guest"} (${feedbackRow.email ?? "(no email)"})\nRating: ${feedbackRow.rating ?? "-"}/5\n\n${feedbackRow.comment ?? "-"}`;

  // Send via Resend
  const resendResp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: fromEmail, to: toEmail, subject, html, text }),
  });

  const resendJson = await resendResp.json().catch(() => ({}));
  if (!resendResp.ok) {
    const msg = (resendJson as any)?.message ?? (resendJson as any)?.error ?? `Resend error (${resendResp.status})`;
    console.error("Resend error:", resendResp.status, msg);
    return json(502, { ok: false, error: msg });
  }

  const providerMessageId = (resendJson as any)?.id as string | undefined;

  // Log the reply
  const { error: insertErr } = await adminClient
    .from("feedback_replies")
    .insert({
      feedback_id: feedbackId,
      business_id: feedbackBusinessId,
      to_email: toEmail,
      subject,
      body: message,
      provider: "resend",
      provider_message_id: providerMessageId ?? null,
      sent_by_user_id: callerId,
    });

  if (insertErr) {
    console.error("Reply log insert failed:", insertErr.message);
    return json(200, { ok: true, providerMessageId, warn: "Email sent but reply log failed" });
  }

  await adminClient
    .from("feedback")
    .update({ last_reply_at: new Date().toISOString(), last_reply_to: toEmail })
    .eq("id", feedbackId);

  return json(200, { ok: true, providerMessageId });
});
