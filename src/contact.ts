import emailjs from "@emailjs/browser";
import { getSupabaseClient } from "./supabase";
import { recordDevAdminNotification } from "./admin/admin-notifications-api";

export type ContactTopic = "question" | "feedback" | "support";

export type ContactPayload = {
  name: string;
  email: string;
  topic: ContactTopic;
  message: string;
  turnstileToken?: string;
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

export type AdminReplyResult = {
  ok: boolean;
  error?: string;
};

export async function sendAdminReply(toEmail: string, toName: string, replyMessage: string): Promise<AdminReplyResult> {
  const config = getEmailJsConfig();

  if (!config) {
    return { ok: false, error: "EmailJS is not configured." };
  }

  try {
    await emailjs.send(
      config.serviceId,
      config.autoReplyTemplateId,
      {
        to_email: toEmail,
        to_name: toName,
        reply_to: "wty6897505@gmail.com",
        subject: "Reply from Zama",
        name: toName || "there",
        time: new Date().toISOString(),
        topic: "Reply",
        message: replyMessage,
        email: toEmail,
      },
      { publicKey: config.publicKey },
    );
    return { ok: true };
  } catch (error) {
    console.error("EmailJS admin reply failed:", error);
    return { ok: false, error: "We could not send this reply. Please try again." };
  }
}

export async function submitContactMessage(payload: ContactPayload): Promise<ContactResult> {
  if (!import.meta.env.DEV) {
    const prefix = window.location.port === "8888" ? "/.netlify/functions" : "/api";
    const response = await fetch(`${prefix}/contact`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "same-origin",
    });
    if (!response.ok) {
      const message = response.status === 429
        ? "Too many messages were sent. Please wait and try again."
        : "We couldn't send your message right now. Please try again or email hello@zama.bt.";
      throw new Error(message);
    }
    return { mode: "remote" };
  }

  const supabase = getSupabaseClient();

  if (supabase) {
    console.log("[Zama] Saving contact message to Supabase...");
    const { data, error: dbError } = await supabase
      .from("contact_messages")
      .insert({ name: payload.name, email: payload.email, topic: payload.topic, message: payload.message })
      .select();

    if (dbError) {
      console.error("[Zama] Failed to save contact message to Supabase:", dbError.message, dbError);
    } else {
      console.log("[Zama] Contact message saved:", data);
    }
  } else {
    console.warn("[Zama] Supabase client not available — message not saved to database.");
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
      recordDevAdminNotification({
        type: "message_received",
        title: "New customer message",
        message: payload.name + " sent a message about " + topicLabels[payload.topic] + ".",
        link: "/admin?tab=messages",
      });
      await Promise.resolve();
      return { mode: "preview" };
    }

    return { mode: "remote" };
  }

  const [notificationResult, autoReplyResult] = await Promise.allSettled([
    emailjs.send(config.serviceId, config.templateId, toTemplateParams(payload), {
      publicKey: config.publicKey,
    }),
    emailjs.send(config.serviceId, config.autoReplyTemplateId, toAutoReplyParams(payload), {
      publicKey: config.publicKey,
    }),
  ]);

  if (notificationResult.status === "rejected") {
    console.error("EmailJS contact notification failed:", notificationResult.reason);
    throw new Error("We couldn't send your message right now. Please try again or email hello@zama.bt.");
  }

  if (autoReplyResult.status === "rejected") {
    console.warn("EmailJS contact auto-reply failed:", autoReplyResult.reason);
  }

  return { mode: "remote" };
}
