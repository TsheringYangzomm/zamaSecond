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
};

const previewStorageKey = "zama-launch-interest-preview";

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

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("We could not save your launch request. Please try again or email hello@zama.bt.");
  }

  return { mode: "remote" };
}
