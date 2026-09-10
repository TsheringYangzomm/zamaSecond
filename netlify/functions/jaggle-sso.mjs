import { createClient } from "@supabase/supabase-js";
import { randomBytes, timingSafeEqual } from "node:crypto";

const JAGGLE_VALIDATE_URL = "https://accounts.jaggle.ai/api/v1/auth/token/validate";
const JAGGLE_AUTHORIZE_URL = "https://accounts.jaggle.ai/api/v1/sso/authorize";
const allowedAudiences = new Set(["customer", "admin"]);

function value(name) {
  return String(process.env[name] ?? "").trim();
}

function config(audience) {
  const supabaseUrl = value("SUPABASE_URL") || value("VITE_SUPABASE_URL");
  const serviceRoleKey = value("SUPABASE_SERVICE_ROLE_KEY");
  const jaggleClientId = value("JAGGLE_CLIENT_ID");
  const jaggleClientSecret = value("JAGGLE_CLIENT_SECRET");
  const appOrigin = (value("APP_ORIGIN") || "https://zamaecom.vercel.app").replace(/\/$/, "");
  const callbackUrl = value(audience === "admin" ? "JAGGLE_ADMIN_CALLBACK_URL" : "JAGGLE_CUSTOMER_CALLBACK_URL");

  if (!supabaseUrl || !serviceRoleKey || !jaggleClientId || !jaggleClientSecret || !callbackUrl) {
    throw new Error("missing_server_configuration");
  }

  return {
    appOrigin,
    callbackUrl,
    jaggleClientId,
    supabase: createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    }),
  };
}

function jsonResponse(body, status = 200) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    body: JSON.stringify(body),
  };
}

function redirectResponse(location, headers = {}) {
  return {
    statusCode: 302,
    headers: { Location: location, "Cache-Control": "no-store", ...headers },
    body: "",
  };
}

function stateCookieName(audience) {
  return `zama_jaggle_state_${audience}`;
}

function stateCookie(audience, state, maxAge = 600) {
  return `${stateCookieName(audience)}=${encodeURIComponent(state)}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

function cookieValue(headers, name) {
  const raw = String(headers?.cookie ?? headers?.Cookie ?? "");
  for (const entry of raw.split(";")) {
    const [key, ...parts] = entry.trim().split("=");
    if (key === name) return decodeURIComponent(parts.join("="));
  }
  return "";
}

function sameState(expected, actual) {
  if (!expected || !actual || expected.length !== actual.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

function callbackResultUrl(origin, audience, params) {
  const target = new URL(`${origin}/`);
  const query = new URLSearchParams({ audience, ...params });
  target.hash = `/auth/jaggle?${query.toString()}`;
  return target.toString();
}

function errorRedirect(origin, audience, error, clearState = false) {
  const headers = clearState ? { "Set-Cookie": stateCookie(audience, "", 0) } : {};
  return redirectResponse(callbackResultUrl(origin, audience, { error }), headers);
}

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

function isEmail(valueToCheck) {
  return valueToCheck.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(valueToCheck);
}

function claimText(subject, ...keys) {
  for (const key of keys) {
    const candidate = subject?.[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return "";
}

async function validateJaggleToken(token) {
  if (token.length > 20_000) throw new Error("invalid_token");
  const response = await fetch(JAGGLE_VALIDATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ token }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.valid === false) throw new Error("invalid_token");

  const claims = payload?.claims ?? payload;
  const subject = claims?.sub;
  const id = claimText(subject, "ID", "id");
  const email = normalizeEmail(claimText(subject, "EmailAddress", "email", "Email"));
  const firstName = claimText(subject, "FirstName", "first_name", "firstName");
  const lastName = claimText(subject, "LastName", "last_name", "lastName");
  const expiry = Number(claims?.exp ?? payload?.exp ?? 0);

  if (!id || !isEmail(email) || (expiry > 0 && expiry <= Math.floor(Date.now() / 1000))) {
    throw new Error("invalid_claims");
  }
  return { id, email, firstName, lastName };
}

async function findAdmin(supabase, email) {
  const { data, error } = await supabase.from("admin_users").select("email").ilike("email", email).limit(1);
  if (error) throw new Error("admin_lookup_failed");
  return Array.isArray(data) && data.length > 0;
}

async function findOrCreateCustomer(supabase, claims) {
  const { data: existing, error: lookupError } = await supabase.from("customers").select("id").ilike("email", claims.email).limit(1);
  if (lookupError) throw new Error("customer_lookup_failed");
  if (existing?.[0]?.id) return existing[0].id;

  const name = `${claims.firstName} ${claims.lastName}`.trim();
  const { data, error } = await supabase.rpc("upsert_customer", {
    p_email: claims.email,
    p_name: name,
    p_phone: "",
    p_area: "",
    p_dzongkhag: "",
    p_address: "",
  });
  const customerId = data?.customerId;
  if (error || data?.status !== "ok" || typeof customerId !== "string") throw new Error("customer_provision_failed");
  return customerId;
}

async function assertIdentityMapping(supabase, claims) {
  const { data: byId, error: idLookupError } = await supabase
    .from("jaggle_identities")
    .select("jaggle_user_id,email")
    .eq("jaggle_user_id", claims.id)
    .maybeSingle();
  if (idLookupError) throw new Error("identity_lookup_failed");
  if (byId && normalizeEmail(byId.email) !== claims.email) throw new Error("identity_email_mismatch");

  const { data: byEmail, error: emailLookupError } = await supabase
    .from("jaggle_identities")
    .select("jaggle_user_id,email")
    .eq("email", claims.email)
    .maybeSingle();
  if (emailLookupError) throw new Error("identity_lookup_failed");
  if (byEmail && byEmail.jaggle_user_id !== claims.id) throw new Error("identity_email_mismatch");
}

async function createHandoff(supabase, claims, audience) {
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: claims.email,
  });
  const tokenHash = linkData?.properties?.hashed_token;
  if (linkError || typeof tokenHash !== "string" || !tokenHash) throw new Error("supabase_link_failed");

  const expiresAt = new Date(Date.now() + 60_000).toISOString();
  const { data: handoff, error: handoffError } = await supabase
    .from("jaggle_sso_handoffs")
    .insert({ audience, email: claims.email, supabase_token_hash: tokenHash, expires_at: expiresAt })
    .select("id")
    .single();
  if (handoffError || !handoff?.id) throw new Error("handoff_create_failed");

  return handoff.id;
}

async function storeIdentity(supabase, claims, audience, customerId) {
  const identity = {
    jaggle_user_id: claims.id,
    email: claims.email,
    first_name: claims.firstName,
    last_name: claims.lastName,
    last_seen_at: new Date().toISOString(),
  };
  // An identity can be used for both surfaces. An admin sign-in must not
  // erase the customer link created by a prior customer sign-in.
  if (audience === "customer") identity.customer_id = customerId;
  const { error } = await supabase.from("jaggle_identities").upsert(identity, { onConflict: "jaggle_user_id" });
  if (error) throw new Error("identity_store_failed");
}

export async function handleJaggleCallback(event, audience) {
  const origin = (value("APP_ORIGIN") || "https://zamaecom.vercel.app").replace(/\/$/, "");
  try {
    if (!allowedAudiences.has(audience)) return errorRedirect(origin, "customer", "invalid_audience");
    const settings = config(audience);
    const query = event.queryStringParameters ?? {};
    const token = String(query.token ?? "").trim();
    const session = String(query.session ?? "").trim();
    const state = String(query.state ?? "").trim();
    const expectedState = cookieValue(event.headers, stateCookieName(audience));
    if (!token || !session) return errorRedirect(settings.appOrigin, audience, "missing_callback_data", true);
    if (!sameState(expectedState, state)) return errorRedirect(settings.appOrigin, audience, "invalid_state", true);

    const claims = await validateJaggleToken(token);
    if (audience === "admin" && !(await findAdmin(settings.supabase, claims.email))) {
      return errorRedirect(settings.appOrigin, audience, "admin_not_allowed");
    }

    const customerId = audience === "customer" ? await findOrCreateCustomer(settings.supabase, claims) : null;
    await assertIdentityMapping(settings.supabase, claims);
    const handoffId = await createHandoff(settings.supabase, claims, audience);
    await storeIdentity(settings.supabase, claims, audience, customerId);
    return redirectResponse(callbackResultUrl(settings.appOrigin, audience, { ticket: handoffId }), {
      "Set-Cookie": stateCookie(audience, "", 0),
    });
  } catch (error) {
    const code = error instanceof Error && [
      "admin_not_allowed",
      "identity_email_mismatch",
    ].includes(error.message) ? error.message : "sign_in_failed";
    return errorRedirect(origin, audience, code, true);
  }
}

export async function handleJaggleStart(event) {
  const audience = String(event.queryStringParameters?.audience ?? "").trim();
  const origin = (value("APP_ORIGIN") || "https://zamaecom.vercel.app").replace(/\/$/, "");
  if (event.httpMethod && event.httpMethod !== "GET") return jsonResponse({ ok: false, error: "Method not allowed." }, 405);
  if (!allowedAudiences.has(audience)) return errorRedirect(origin, "customer", "invalid_audience");

  try {
    const settings = config(audience);
    const state = randomBytes(32).toString("base64url");
    const authorizeUrl = new URL(JAGGLE_AUTHORIZE_URL);
    authorizeUrl.searchParams.set("redirect", settings.callbackUrl);
    authorizeUrl.searchParams.set("client_id", settings.jaggleClientId);
    authorizeUrl.searchParams.set("state", state);
    return redirectResponse(authorizeUrl.toString(), { "Set-Cookie": stateCookie(audience, state) });
  } catch {
    return errorRedirect(origin, audience, "sign_in_failed");
  }
}

export async function handleJaggleHandoff(event) {
  if (event.httpMethod && event.httpMethod !== "GET") return jsonResponse({ ok: false, error: "Method not allowed." }, 405);

  const ticket = String(event.queryStringParameters?.ticket ?? "").trim();
  const audience = String(event.queryStringParameters?.audience ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(ticket) || !allowedAudiences.has(audience)) {
    return jsonResponse({ ok: false, error: "This Jaggle sign-in handoff is invalid or expired." }, 400);
  }

  try {
    const settings = config(audience);
    const { data, error } = await settings.supabase.rpc("consume_jaggle_sso_handoff", {
      p_handoff_id: ticket,
      p_audience: audience,
    });
    if (error || data?.status !== "ok" || typeof data?.tokenHash !== "string") {
      return jsonResponse({ ok: false, error: "This Jaggle sign-in handoff is invalid or expired." }, 400);
    }
    return jsonResponse({ ok: true, email: data.email, tokenHash: data.tokenHash });
  } catch {
    return jsonResponse({ ok: false, error: "The Jaggle sign-in bridge is not configured yet." }, 503);
  }
}
