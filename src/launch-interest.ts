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

export type LaunchInterestResult = {
  mode: "remote" | "preview";
  submissionId?: string;
};

const previewStorageKey = "zama-launch-interest-preview";
const requestTimeoutMs = 10_000;

type LaunchInterestResponse = {
  submissionId?: unknown;
};

function savePreviewSubmission(payload: LaunchInterestPayload) {
  sessionStorage.setItem(
    previewStorageKey,
    JSON.stringify({
      ...payload,
      submittedAt: new Date().toISOString(),
    }),
  );
}

export async function submitLaunchInterest(payload: LaunchInterestPayload): Promise<LaunchInterestResult> {
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
