import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

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

function text(input, max) {
  const result = String(input ?? "").trim();
  return result.length <= max ? result : "";
}

function validEmail(email) {
  return email.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
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

export async function handleGuestCheckout(event) {
  if (event.httpMethod !== "POST") return response({ ok: false, error: "Method not allowed." }, 405);
  if (String(event.body ?? "").length > 50_000) return response({ ok: false, error: "Order payload is too large." }, 413);

  const supabaseUrl = value("SUPABASE_URL") || value("VITE_SUPABASE_URL");
  const serviceRoleKey = value("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return response({ ok: false, error: "Checkout is temporarily unavailable." }, 503);

  let input;
  try {
    input = JSON.parse(event.body || "{}");
  } catch {
    return response({ ok: false, error: "The order details are invalid." }, 400);
  }

  const profile = input?.profile ?? {};
  const email = text(profile.email, 254).toLowerCase();
  const name = text(profile.name, 120);
  const phone = text(profile.phone, 40);
  const area = text(profile.area, 120);
  const dzongkhag = text(profile.dzongkhag, 120);
  const address = text(profile.address, 500);
  const notes = text(input.notes, 1000);
  const paymentMethod = text(input.paymentMethod, 80);
  const deliveryDate = input.deliveryDate == null ? null : text(input.deliveryDate, 40);
  const lines = Array.isArray(input.lines) ? input.lines : [];
  const validLines = lines.length >= 1 && lines.length <= 30 && lines.every((line) =>
    text(line?.productId, 120) && Number.isInteger(line?.quantity) && line.quantity >= 1 && line.quantity <= 99,
  );
  if (!validEmail(email) || !name || !area || !paymentMethod || !validLines || (input.deliveryDate != null && !deliveryDate)) {
    return response({ ok: false, error: "Please review the order details and try again." }, 400);
  }

  const ip = text(event.clientIp || event.headers?.["x-forwarded-for"]?.split(",")[0], 80);
  if (!(await verifyTurnstile(text(input.turnstileToken, 2048), ip))) {
    return response({ ok: false, error: "Please complete the security check and try again." }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const rateKey = createHmac("sha256", serviceRoleKey).update(`${ip}|${email}`).digest("hex");
  const { data: allowed, error: rateError } = await supabase.rpc("check_api_rate_limit", {
    p_bucket: "guest_checkout",
    p_key_hash: rateKey,
    p_limit: 5,
    p_window_seconds: 3600,
  });
  if (rateError) return response({ ok: false, error: "Checkout is temporarily unavailable." }, 503);
  if (!allowed) return response({ ok: false, error: "Too many checkout attempts. Please try again later." }, 429);

  const { data: customer, error: customerError } = await supabase.rpc("upsert_customer", {
    p_email: email,
    p_name: name,
    p_phone: phone,
    p_area: area,
    p_dzongkhag: dzongkhag,
    p_address: address,
  });
  if (customerError || customer?.status !== "ok" || !customer?.customerId) {
    return response({ ok: false, error: "We could not save the delivery details." }, 400);
  }

  const { data: order, error: orderError } = await supabase.rpc("place_order", {
    p_customer_id: customer.customerId,
    p_items: lines.map((line) => ({ product_id: text(line.productId, 120), quantity: line.quantity })),
    p_total: 0,
    p_delivery_area: area,
    p_payment_method: paymentMethod,
    p_delivery_date: deliveryDate,
    p_notes: notes,
    p_coupon_code: null,
    p_points_to_redeem: 0,
  });
  if (orderError || order?.status !== "ok" || !order?.orderId) {
    return response({ ok: false, error: "The order could not be placed. Please try again." }, 400);
  }
  return response({ ok: true, orderId: order.orderId });
}
