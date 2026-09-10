import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const topics = new Set(["question", "feedback", "support"]);
const launchSources = new Set(["hero-waitlist", "launch-basket", "membership"]);

function value(name) {
  return String(process.env[name] ?? "").trim();
}

function response(body, status = 200) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    body: JSON.stringify(body),
  };
}

function failure(code, message, status = 400) {
  return response({ ok: false, code, error: message }, status);
}

function cleanText(input, max) {
  const result = String(input ?? "").trim();
  return result.length <= max ? result : "";
}

function validEmail(email) {
  return email.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

function clientIp(event) {
  return cleanText(event.clientIp || event.headers?.["x-forwarded-for"]?.split(",")[0], 80);
}

async function verifyTurnstile(token, ip) {
  const secret = value("TURNSTILE_SECRET_KEY");
  if (!secret) return true;
  if (!token || token.length > 2048) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);
  const result = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  }).then((item) => item.json()).catch(() => null);
  return result?.success === true;
}

function serviceClient() {
  const supabaseUrl = value("SUPABASE_URL") || value("VITE_SUPABASE_URL");
  const serviceRoleKey = value("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return null;
  return {
    serviceRoleKey,
    supabase: createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    }),
  };
}

async function rateAllowed(supabase, serviceRoleKey, type, ip, email) {
  const keyHash = createHmac("sha256", serviceRoleKey).update(`${ip}|${email}`).digest("hex");
  const { data, error } = await supabase.rpc("check_api_rate_limit", {
    p_bucket: `public_${type}`,
    p_key_hash: keyHash,
    p_limit: type === "contact" ? 5 : 8,
    p_window_seconds: 3600,
  });
  if (error) throw new Error("rate_limit_unavailable");
  return data === true;
}

function emailJsConfig() {
  const serviceId = value("EMAILJS_SERVICE_ID") || value("VITE_EMAILJS_SERVICE_ID");
  const templateId = value("EMAILJS_TEMPLATE_ID") || value("VITE_EMAILJS_TEMPLATE_ID");
  const autoReplyTemplateId = value("EMAILJS_AUTOREPLY_TEMPLATE_ID") || value("VITE_EMAILJS_AUTOREPLY_TEMPLATE_ID");
  const publicKey = value("EMAILJS_PUBLIC_KEY") || value("VITE_EMAILJS_PUBLIC_KEY");
  return serviceId && templateId && autoReplyTemplateId && publicKey
    ? { serviceId, templateId, autoReplyTemplateId, publicKey }
    : null;
}

async function sendEmail(config, templateId, templateParams) {
  const result = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: config.serviceId,
      template_id: templateId,
      user_id: config.publicKey,
      template_params: templateParams,
    }),
  });
  if (!result.ok) throw new Error(`email_delivery_${result.status}`);
}

async function submitContact(supabase, input) {
  const name = cleanText(input.name, 120);
  const email = cleanText(input.email, 254).toLowerCase();
  const topic = cleanText(input.topic, 40);
  const message = cleanText(input.message, 4000);
  if (!validEmail(email) || !topics.has(topic) || !message) return failure("invalid_contact", "Please review your message and try again.");

  const { error } = await supabase.from("contact_messages").insert({ name, email, topic, message });
  if (error) throw new Error("contact_store_failed");

  const emailConfig = emailJsConfig();
  if (!emailConfig) throw new Error("email_not_configured");
  const labels = { question: "Question", feedback: "Feedback", support: "Support" };
  const params = { name: name || email, email, reply_to: email, topic: labels[topic], message, time: new Date().toISOString() };
  await sendEmail(emailConfig, emailConfig.templateId, { ...params, subject: `New Zama message — ${labels[topic]}` });
  await sendEmail(emailConfig, emailConfig.autoReplyTemplateId, {
    ...params,
    to_email: email,
    to_name: name || "there",
    subject: "Thanks for writing to Zama",
  }).catch((errorToLog) => console.warn("contact_autoreply_failed", errorToLog instanceof Error ? errorToLog.message : "unknown"));
  return response({ ok: true });
}

async function submitLaunchInterest(supabase, input) {
  const email = cleanText(input.email, 254).toLowerCase();
  const source = cleanText(input.source, 40);
  const area = input.area == null ? null : cleanText(input.area, 120);
  const fullName = input.fullName == null ? null : cleanText(input.fullName, 120);
  const items = Array.isArray(input.items) ? input.items : [];
  const validItems = items.length <= 30 && items.every((item) => {
    const label = cleanText(item?.sku ?? item?.interest, 120);
    const quantity = item?.quantity ?? 1;
    return Boolean(label) && Number.isInteger(quantity) && quantity >= 1 && quantity <= 99;
  });
  if (!validEmail(email) || !launchSources.has(source) || !validItems || (source === "membership" && !fullName)) {
    return failure("invalid_interest", "Please review your details and try again.");
  }

  const normalizedItems = items.length > 0
    ? items.map((item) => item.interest ? { interest: cleanText(item.interest, 120) } : { sku: cleanText(item.sku, 120), quantity: item.quantity })
    : null;
  const { data, error } = await supabase.rpc("create_launch_interest", {
    p_email: email,
    p_source: source,
    p_area: area,
    p_full_name: fullName,
    p_items: normalizedItems,
  });
  if (error) throw new Error("interest_store_failed");
  if (data?.status === "duplicate") return response({ ok: true, status: "duplicate" });
  if (data?.status !== "ok") return failure("invalid_interest", "Please review your details and try again.");
  return response({ ok: true, status: "ok", submissionId: data.submissionId });
}

async function submitPartnership(supabase, input) {
  const payload = {
    p_contact_name: cleanText(input.contactName, 120),
    p_organisation_name: cleanText(input.organisationName, 160),
    p_email: cleanText(input.email, 254).toLowerCase(),
    p_phone: cleanText(input.phone, 60),
    p_partner_type: cleanText(input.partnerType, 80),
    p_message: cleanText(input.message, 4000),
    p_location: cleanText(input.location, 160),
    p_dzongkhag: cleanText(input.dzongkhag, 100),
  };
  if (!payload.p_contact_name || !payload.p_organisation_name || !validEmail(payload.p_email) || !payload.p_partner_type || !payload.p_message) {
    return failure("invalid_partnership", "Please review your partnership request and try again.");
  }
  const { data, error } = await supabase.rpc("create_partnership_request", payload);
  if (error || !data?.id) return failure("invalid_partnership", "Please review your partnership request and try again.");
  return response({ ok: true, request: data });
}

export async function handlePublicSubmission(event, type) {
  if (event.httpMethod !== "POST") return failure("method_not_allowed", "Method not allowed.", 405);
  if (String(event.body ?? "").length > 50_000) return failure("payload_too_large", "The submitted information is too large.", 413);
  if (!new Set(["contact", "launch-interest", "partnership"]).has(type)) return failure("not_found", "Not found.", 404);

  let input;
  try {
    input = JSON.parse(event.body || "{}");
  } catch {
    return failure("invalid_json", "The submitted information is invalid.");
  }

  const email = cleanText(input.email, 254).toLowerCase();
  const ip = clientIp(event);
  if (!(await verifyTurnstile(cleanText(input.turnstileToken, 2048), ip))) {
    return failure("bot_check_failed", "Please complete the security check and try again.");
  }

  const service = serviceClient();
  if (!service) return failure("service_unavailable", "This form is temporarily unavailable.", 503);

  try {
    if (!(await rateAllowed(service.supabase, service.serviceRoleKey, type, ip, email))) {
      return failure("rate_limited", "Too many requests were sent. Please wait and try again.", 429);
    }
    if (type === "contact") return await submitContact(service.supabase, input);
    if (type === "partnership") return await submitPartnership(service.supabase, input);
    return await submitLaunchInterest(service.supabase, input);
  } catch (error) {
    console.error("public_submission_failed", type, error instanceof Error ? error.message : "unknown");
    return failure("service_unavailable", "This form is temporarily unavailable. Please try again later.", 503);
  }
}
