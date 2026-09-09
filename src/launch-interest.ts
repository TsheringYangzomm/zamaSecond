import emailjs from "@emailjs/browser";
import { getSupabaseClient } from "./supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

export type LaunchInterestSource = "hero-waitlist" | "launch-basket" | "membership";

export type LaunchInterestItem = {
  sku: string;
  quantity: number;
};

export type LaunchInterestPayload = {
  email: string;
  source: LaunchInterestSource;
  area?: string;
  items?: LaunchInterestItem[];
};

export type LaunchInterestResult =
  | { mode: "remote"; submissionId?: string }
  | { mode: "preview" }
  | { mode: "duplicate" };

export type MembershipInterestPayload = {
  fullName: string;
  email: string;
  interests: string[];
};

export type MembershipInterestResult =
  | { mode: "remote"; submissionId?: string; emailWasSent?: boolean }
  | { mode: "preview"; emailWasSent?: boolean }
  | { mode: "duplicate"; emailWasSent?: boolean };

const previewStorageKey = "zama-launch-interest-preview";
const membershipPreviewStorageKey = "zama-membership-interest-preview";
const requestTimeoutMs = 10_000;

type LaunchInterestResponse = {
  submissionId?: unknown;
};

type CreateLaunchInterestResponse =
  | { status: "ok"; submissionId?: unknown }
  | { status: "duplicate" }
  | { status: "invalid_email" }
  | { status: "invalid_name" };

type EmailJsConfig = {
  serviceId: string;
  templateId: string;
  autoReplyTemplateId: string;
  publicKey: string;
};

function getEmailJsConfig(): EmailJsConfig | null {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID?.trim();
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID?.trim();
  const autoReplyTemplateId = import.meta.env.VITE_EMAILJS_AUTOREPLY_TEMPLATE_ID?.trim();
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY?.trim();

  if (!serviceId || !templateId || !autoReplyTemplateId || !publicKey) return null;

  return { serviceId, templateId, autoReplyTemplateId, publicKey };
}

function savePreviewSubmission(payload: LaunchInterestPayload) {
  sessionStorage.setItem(
    previewStorageKey,
    JSON.stringify({
      ...payload,
      submittedAt: new Date().toISOString(),
    }),
  );
}

function saveMembershipPreviewSubmission(payload: MembershipInterestPayload) {
  sessionStorage.setItem(
    membershipPreviewStorageKey,
    JSON.stringify({
      ...payload,
      submittedAt: new Date().toISOString(),
    }),
  );
}

function toMembershipEmailPayload(payload: MembershipInterestPayload) {
  const interestList = payload.interests.filter(Boolean);
  const interests = interestList.length > 0 ? interestList.join(", ") : "general membership interest";
  const name = payload.fullName.trim() || "there";

  return {
    to_email: payload.email,
    to_name: name,
    reply_to: payload.email,
    subject: "You're on the Zama+ update list",
    name,
    email: payload.email,
    interests,
    message: `Hi ${name},\n\nThanks for your interest in Zama+.\n\nMembership isn't open yet, but we'll let you know when enrollment is ready.\n\nThere is no payment today. We'll publish the membership benefits, pricing, renewal, pause, and cancellation terms before enrollment opens.\n\nThanks for being interested in Zama.\n\n— Team Zama`,
  };
}

async function submitViaSupabase(supabase: SupabaseClient, payload: LaunchInterestPayload): Promise<LaunchInterestResult> {
  const { data, error } = await supabase.rpc("create_launch_interest", {
    p_email: payload.email,
    p_source: payload.source,
    p_area: payload.area ?? null,
    p_items: payload.items ?? null,
  });

  if (error) {
    throw new Error("We could not save your launch request. Please try again or email hello@zama.bt.");
  }

  const result = data as CreateLaunchInterestResponse | null;

  if (result?.status === "duplicate") {
    return { mode: "duplicate" };
  }

  if (result?.status !== "ok") {
    throw new Error("We could not save your launch request. Please try again or email hello@zama.bt.");
  }

  return { mode: "remote", submissionId: typeof result.submissionId === "string" ? result.submissionId : undefined };
}

function parseLaunchInterestResult(data: unknown): CreateLaunchInterestResponse | null {
  const result = data as CreateLaunchInterestResponse | null;
  if (!result || typeof result !== "object") return null;
  return result;
}

async function submitMembershipViaSupabase(supabase: SupabaseClient, payload: MembershipInterestPayload): Promise<MembershipInterestResult> {
  const fullName = payload.fullName.trim();
  const interestItems = payload.interests.filter(Boolean).map((interest) => ({ interest }));

  const { data, error } = await supabase.rpc("create_launch_interest", {
    p_email: payload.email,
    p_source: "membership",
    p_area: null,
    p_full_name: fullName,
    p_items: interestItems.length > 0 ? interestItems : null,
  });

  if (error) {
    throw new Error(error.message || "Supabase rejected the membership request.");
  }

  const result = parseLaunchInterestResult(data);

  if (result?.status === "duplicate") {
    return { mode: "duplicate" };
  }

  if (result?.status === "invalid_email") {
    throw new Error("Enter a complete email address, such as name@example.com.");
  }

  if (result?.status === "invalid_name") {
    throw new Error("Please enter your full name.");
  }

  if (result?.status !== "ok") {
    throw new Error("We could not save your membership interest. Please try again or email hello@zama.bt.");
  }

  return {
    mode: "remote",
    submissionId: typeof result.submissionId === "string" ? result.submissionId : undefined,
  };
}

export async function submitLaunchInterest(payload: LaunchInterestPayload): Promise<LaunchInterestResult> {
  const supabase = getSupabaseClient();

  if (supabase) {
    return submitViaSupabase(supabase, payload);
  }

  const endpoint = import.meta.env.VITE_LAUNCH_INTEREST_ENDPOINT?.trim();

  if (!endpoint) {
    if (import.meta.env.DEV) {
      savePreviewSubmission(payload);
      await Promise.resolve();
      return { mode: "preview" };
    }

    throw new Error("Launch registration is temporarily unavailable. Email hello@zama.bt and we will help you register.");
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), requestTimeoutMs);
  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      credentials: "omit",
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("The request took too long. Check your connection and try again.");
    }

    throw new Error("We could not reach Zama. Check your connection and try again, or email hello@zama.bt.");
  } finally {
    window.clearTimeout(timeout);
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Too many requests were sent. Wait a moment, then try again.");
    }

    throw new Error("We could not save your launch request. Please try again or email hello@zama.bt.");
  }

  const responseBody = (await response.json().catch(() => null)) as LaunchInterestResponse | null;
  const submissionId = typeof responseBody?.submissionId === "string" ? responseBody.submissionId : undefined;

  return { mode: "remote", submissionId };
}

export async function submitMembershipInterest(payload: MembershipInterestPayload): Promise<MembershipInterestResult> {
  const fullName = payload.fullName.trim();
  const email = payload.email.trim();

  if (!fullName) {
    throw new Error("Please enter your full name.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a complete email address, such as name@example.com.");
  }

  const supabase = getSupabaseClient();

  if (supabase) {
    const result = await submitMembershipViaSupabase(supabase, { ...payload, fullName, email });

    if (result.mode === "duplicate") {
      return { mode: "duplicate" };
    }

    const config = getEmailJsConfig();

    if (!config) {
      return { ...result, emailWasSent: false };
    }

    try {
      await emailjs.send(
        config.serviceId,
        config.autoReplyTemplateId,
        toMembershipEmailPayload({ ...payload, fullName, email }),
        { publicKey: config.publicKey },
      );
      return { ...result, emailWasSent: true };
    } catch (err) {
      console.error("EmailJS auto-reply failed:", err);
      return { ...result, emailWasSent: false };
    }
  }

  if (import.meta.env.DEV) {
    saveMembershipPreviewSubmission({ ...payload, fullName, email });
    return { mode: "preview", emailWasSent: false };
  }

  throw new Error("Membership registration is temporarily unavailable. Email hello@zama.bt and we will help you register.");
}
