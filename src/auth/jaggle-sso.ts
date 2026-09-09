import { getSupabaseClient } from "../supabase";
import { saveDevCustomer, saveDevSession, type CustomerProfile } from "../checkout/checkout-api";

export type JaggleAuthAudience = "customer" | "admin";

export type JaggleClaims = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

export type JaggleAuthStatus = "idle" | "processing" | "success" | "error";

export type JaggleHandoffResult = {
  ok: boolean;
  email?: string;
  audience?: JaggleAuthAudience;
  error?: string;
};

const devJaggleSessionKey = "zama-jaggle-dev-session";

function appOrigin(origin?: string): string {
  if (origin) return origin.replace(/\/$/, "");
  if (typeof window === "undefined") return "";

  // Netlify Dev proxies the Vite app on 8888. Keeping this callback on the
  // proxy means the local function and the SPA share the same origin.
  if ((window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") && window.location.port !== "8888") {
    return "http://127.0.0.1:8888";
  }
  return window.location.origin.replace(/\/$/, "");
}

export function getJaggleCallbackUrl(audience: JaggleAuthAudience, origin?: string): string {
  return `${appOrigin(origin)}/.netlify/functions/jaggle-${audience}-callback`;
}

export function buildJaggleAuthorizationUrl(audience: JaggleAuthAudience, clientId: string, origin?: string): string {
  const url = new URL("https://accounts.jaggle.ai/api/v1/sso/authorize");
  url.searchParams.set("redirect", getJaggleCallbackUrl(audience, origin));
  url.searchParams.set("client_id", clientId.trim());
  return url.toString();
}

function defaultDevClaims(audience: JaggleAuthAudience): JaggleClaims {
  return {
    id: `dev-${audience}-jaggle-user`,
    email: audience === "admin" ? "admin@example.com" : "jaggle.customer@example.com",
    firstName: audience === "admin" ? "Demo" : "Jaggle",
    lastName: audience === "admin" ? "Admin" : "Customer",
  };
}

export function recordDevJaggleSession(audience: JaggleAuthAudience, claims: Partial<JaggleClaims> = {}): JaggleClaims {
  const fallback = defaultDevClaims(audience);
  const next: JaggleClaims = {
    id: claims.id?.trim() || fallback.id,
    email: claims.email?.trim().toLowerCase() || fallback.email,
    firstName: claims.firstName?.trim() || fallback.firstName,
    lastName: claims.lastName?.trim() || fallback.lastName,
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(devJaggleSessionKey, JSON.stringify({ audience, ...next }));
  }

  if (audience === "customer") {
    const profile: CustomerProfile = {
      email: next.email,
      name: `${next.firstName} ${next.lastName}`.trim(),
      phone: "",
      area: "",
      dzongkhag: "",
      address: "",
    };
    saveDevCustomer(profile);
    saveDevSession(profile.email, profile.name);
  }

  return next;
}

export async function startJaggleSignIn(audience: JaggleAuthAudience): Promise<JaggleHandoffResult> {
  if (typeof window === "undefined") return { ok: false, error: "Jaggle sign-in is only available in a browser." };

  const clientId = String(import.meta.env.VITE_JAGGLE_CLIENT_ID ?? "").trim();
  if (!clientId) {
    if (import.meta.env.DEV && !getSupabaseClient()) {
      recordDevJaggleSession(audience);
      window.location.hash = audience === "admin" ? "#/admin" : "#/account";
      window.location.reload();
      return { ok: true, audience };
    }
    return { ok: false, error: "Jaggle sign-in is not configured yet. Add VITE_JAGGLE_CLIENT_ID and try again." };
  }

  window.location.assign(buildJaggleAuthorizationUrl(audience, clientId));
  return { ok: true, audience };
}

export async function completeJaggleSignIn(handoffId: string, audience: JaggleAuthAudience): Promise<JaggleHandoffResult> {
  const ticket = handoffId.trim();
  if (!ticket) return { ok: false, error: "The Jaggle sign-in handoff is missing." };

  const client = getSupabaseClient();
  if (!client) return { ok: false, error: "Supabase is not configured for Jaggle sign-in." };

  let handoff: { ok?: boolean; email?: string; tokenHash?: string; error?: string };
  try {
    const response = await fetch(`/.netlify/functions/jaggle-handoff?ticket=${encodeURIComponent(ticket)}&audience=${encodeURIComponent(audience)}`, {
      headers: { Accept: "application/json" },
    });
    handoff = await response.json() as typeof handoff;
    if (!response.ok || !handoff.ok || !handoff.tokenHash) {
      return { ok: false, error: handoff.error || "This Jaggle sign-in link is invalid or expired." };
    }
  } catch {
    return { ok: false, error: "We could not reach the Jaggle sign-in bridge. Please try again." };
  }

  // Supabase accepts the hashed email token produced by generateLink through
  // the token-hash `email` verifier; no email is sent during this handoff.
  const { error } = await client.auth.verifyOtp({ token_hash: handoff.tokenHash, type: "email" });
  if (error) return { ok: false, error: "Supabase could not finish the Jaggle sign-in. Please try again." };
  return { ok: true, email: handoff.email, audience };
}
