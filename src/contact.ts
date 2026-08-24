import emailjs from "@emailjs/browser";
import { getSupabaseClient } from "./supabase";

export type ContactTopic = "question" | "feedback" | "support";

export type ContactPayload = {
  name: string;
  email: string;
  topic: ContactTopic;
  message: string;
};

export type ContactResult = {
  mode: "remote" | "preview";
};

const previewStorageKey = "zama-contact-message-preview";

const topicLabels: Record<ContactTopic, string> = {
  question: "Question",
  feedback: "Feedback",
  support: "Support",
};

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

function toTemplateParams(payload: ContactPayload) {
  return {
    subject: `New Zama message — ${topicLabels[payload.topic]}`,
    name: payload.name || payload.email,
    time: new Date().toISOString(),
    topic: topicLabels[payload.topic],
    message: payload.message,
    email: payload.email,
  };
}

function toAutoReplyParams(payload: ContactPayload) {
  return {
    to_email: payload.email,
    to_name: payload.name || "there",
    reply_to: payload.email,
    subject: "Thanks for writing to Zama",
    name: payload.name || "there",
    time: new Date().toISOString(),
    topic: topicLabels[payload.topic],
    message: payload.message,
    email: payload.email,
  };
}

function toErrorMessage(error: unknown): string {
  const detail =
    typeof error === "object" && error !== null && "text" in error && typeof error.text === "string"
      ? error.text
      : error instanceof Error
        ? error.message
        : null;
  return detail
    ? `We could not send your message (${detail}). Please try again or email hello@zama.bt.`
    : "We could not send your message. Please try again or email hello@zama.bt.";
}

export async function submitContactMessage(payload: ContactPayload): Promise<ContactResult> {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { error: dbError } = await supabase
      .from("contact_messages")
      .insert({ name: payload.name, email: payload.email, topic: payload.topic, message: payload.message });

    if (dbError) {
      console.error("Failed to save contact message to Supabase:", dbError.message);
    }
  }

  const config = getEmailJsConfig();

  if (!config) {
    if (import.meta.env.DEV) {
      sessionStorage.setItem(
        previewStorageKey,
        JSON.stringify({
          ...payload,
          submittedAt: new Date().toISOString(),
        }),
      );
      await Promise.resolve();
      return { mode: "preview" };
    }

    return { mode: "remote" };
  }

  const [notificationResult] = await Promise.allSettled([
    emailjs.send(config.serviceId, config.templateId, toTemplateParams(payload), {
      publicKey: config.publicKey,
    }),
    emailjs.send(config.serviceId, config.autoReplyTemplateId, toAutoReplyParams(payload), {
      publicKey: config.publicKey,
    }),
  ]);

  if (notificationResult.status === "rejected") {
    console.error("EmailJS contact notification failed:", notificationResult.reason);
  }

  return { mode: "remote" };
}
