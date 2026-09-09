import { useCallback, useRef, useState, type FormEvent } from "react";
import { submitContactMessage, type ContactTopic } from "../contact";
import { PrimaryButton } from "../components/ui/action-link";
import { OutlineTag } from "../components/ui/tag";
import { sectionShell, sectionTitle } from "../components/ui/styles";


const topicOptions = [
  { value: "question", label: "I have a question" },
  { value: "feedback", label: "I want to share feedback" },
  { value: "support", label: "I need support" },
] as const;

const fieldClasses =
  "min-h-11.5 w-full min-w-0 rounded-[20px_28px_16px_24px/24px_16px_28px_20px] border-3 border-brand-forest bg-brand-white px-4 py-[0.65rem] text-brand-black shadow-brand-soft outline-none placeholder:text-brand-black/46 focus-visible:border-brand-green-ink focus-visible:ring-4 focus-visible:ring-brand-leaf/20";

const labelClasses = "text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink";

function ContactForm() {
  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const emailInput = form.elements.namedItem("email");
    const messageInput = form.elements.namedItem("message");

    if (!(emailInput instanceof HTMLInputElement) || !emailInput.validity.valid) {
      setStatus(emailInput instanceof HTMLInputElement && emailInput.validity.typeMismatch ? "Enter a complete email address, such as name@example.com." : "Enter your email address so we can reply.");
      setHasError(true);
      emailRef.current?.focus();
      return;
    }

    if (!(messageInput instanceof HTMLTextAreaElement) || !messageInput.value.trim()) {
      setStatus("Write your question or feedback before sending.");
      setHasError(true);
      messageRef.current?.focus();
      return;
    }

    const data = new FormData(form);
    const name = typeof data.get("name") === "string" ? String(data.get("name")).trim() : "";
    const email = emailInput.value.trim();
    const topic = (data.get("topic") as ContactTopic) ?? "question";
    const message = messageInput.value.trim();

    setIsSubmitting(true);
    setHasError(false);
    setStatus("");

    try {
      const result = await submitContactMessage({ name, email, topic, message });
      setStatus(result.mode === "preview" ? "Preview saved for this browser session. Connect the contact endpoint before publishing." : "Thanks — your message is on its way to the Zama inbox.");
      form.reset();
    } catch (error) {
      setHasError(true);
      setStatus(error instanceof Error ? error.message : "We could not send your message. Please try again or email hello@zama.bt.");
      messageRef.current?.focus();
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const clearFeedback = useCallback(() => {
    if (hasError) setHasError(false);
    if (status) setStatus("");
  }, [hasError, status]);

  return (
    <form className="grid content-start gap-4" noValidate aria-label="Contact form" onSubmit={handleSubmit}>
      <div className="grid gap-2">
        <label className={labelClasses} htmlFor="contact-name">
          Name <span className="normal-case text-brand-black/46">(optional)</span>
        </label>
        <input id="contact-name" name="name" type="text" autoComplete="name" className={fieldClasses} placeholder="Your name" />
      </div>

      <div className="grid gap-2">
        <label className={labelClasses} htmlFor="contact-email">
          Email address
        </label>
        <input
          id="contact-email"
          ref={emailRef}
          name="email"
          type="email"
          autoComplete="email"
          spellCheck={false}
          required
          aria-invalid={hasError}
          aria-describedby="contact-status"
          className={fieldClasses}
          placeholder="you@example.com"
          onChange={clearFeedback}
        />
      </div>

      <div className="grid gap-2">
        <label className={labelClasses} htmlFor="contact-topic">
          Topic
        </label>
        <select id="contact-topic" name="topic" className={fieldClasses} defaultValue="question">
          {topicOptions.map((option) => (
            <option value={option.value} key={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <label className={labelClasses} htmlFor="contact-message">
          Message
        </label>
        <textarea
          id="contact-message"
          ref={messageRef}
          name="message"
          rows={6}
          required
          aria-invalid={hasError}
          aria-describedby="contact-status"
          className={`${fieldClasses} resize-y`}
          placeholder="Your question or feedback for the Zama team…"
          onChange={clearFeedback}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <PrimaryButton disabled={isSubmitting}>{isSubmitting ? "Sending…" : "Send message"}</PrimaryButton>
        <p
          id="contact-status"
          className={`min-h-[1.4em] flex-1 text-sm ${hasError ? "font-bold text-brand-black" : "font-medium text-brand-green-ink"}`}
          role="status"
          aria-live="polite"
        >
          {status}
        </p>
      </div>
    </form>
  );
}

export function ContactPage() {
  return (
    <section className={`grid gap-6 py-[clamp(3rem,6vw,5rem)] ${sectionShell}`} aria-labelledby="contact-title">
      <div className="section-heading grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(280px,0.62fr)] sm:items-end sm:gap-10">
        <div className="grid gap-2">
          <OutlineTag>Contact Zama</OutlineTag>
          <h1 id="contact-title" className={`${sectionTitle} max-w-190 text-brand-green-ink`}>
            Ask a question or share feedback.
          </h1>
        </div>
        <p className="text-[1.05rem] text-brand-black/72">Write directly to the Zama team. Your message goes straight to our inbox — no separate email app needed.</p>
      </div>

      <div className="relative overflow-hidden rounded-[38px_24px_44px_28px/28px_44px_24px_38px] border-4 border-brand-forest bg-brand-warm-white shadow-brand-big">
        <div className="relative z-[1] grid gap-5 p-5 sm:p-7 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-8">
          <div className="grid content-start gap-4">
            <div className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-brand-orange-ink">Straight to the inbox</span>
              <h2 className="font-primary text-[clamp(1.6rem,3vw,2.2rem)] font-bold leading-[1.05] text-brand-black">What would you like to tell us?</h2>
            </div>
            <div className="grid gap-1 border-l-4 border-brand-yellow pl-4">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-brand-green-ink">Prefer email?</span>
              <a className="w-fit font-bold text-brand-green-ink underline decoration-dashed underline-offset-4" href="mailto:hello@zama.bt">
                hello@zama.bt
              </a>
            </div>
            <p className="text-sm leading-[1.5] text-brand-black/68">Launch questions, product feedback, and support all go to the same place. We usually reply within one business day.</p>
          </div>

          <ContactForm />
        </div>
      </div>
    </section>
  );
}
