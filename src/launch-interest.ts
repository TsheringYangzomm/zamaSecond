import { getSupabaseClient } from "./supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

export type LaunchInterestSource = "hero-waitlist" | "launch-basket";

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

const previewStorageKey = "zama-launch-interest-preview";
const requestTimeoutMs = 10_000;

type LaunchInterestResponse = {
  submissionId?: unknown;
};

type CreateLaunchInterestResponse =
  | { status: "ok"; submissionId?: unknown }
  | { status: "duplicate" }
  | { status: "invalid_email" };

function savePreviewSubmission(payload: LaunchInterestPayload) {
  sessionStorage.setItem(
    previewStorageKey,
    JSON.stringify({
      ...payload,
      submittedAt: new Date().toISOString(),
    }),
  );
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
