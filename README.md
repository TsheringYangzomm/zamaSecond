# Zama Launch Website

React, TypeScript, Vite, and Tailwind CSS v4 landing experience for Zama’s Thimphu launch preview.

## Local Development

```bash
npm install
npm run dev
```

Without a launch-interest endpoint, development submissions are stored only in the current browser session. No order or payment is created.

## Production Configuration

Copy `.env.example` into the deployment environment and set:

```text
VITE_LAUNCH_INTEREST_ENDPOINT=https://api.zama.bt/v1/launch-interests
VITE_EMAILJS_PUBLIC_KEY=your_public_key
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
```

For local testing of real submissions, copy `.env.example` to `.env.local` (already gitignored) with your EmailJS IDs and run `npm run dev`.

### Launch-interest endpoint

The endpoint must accept `POST` requests with JSON containing:

- `email`
- `source`: `hero-waitlist` or `launch-basket`
- optional `area`
- optional `items`: `{ sku, quantity }[]`

A successful request should return HTTP `202` or another `2xx` response. It may return `{ "submissionId": "..." }`.

### Contact form (EmailJS)

The contact page at `#/contact` collects name (optional), email, topic, and message, and sends it through EmailJS directly to the Zama inbox.

1. Create an account at emailjs.com and add an email service with the address you want submissions to arrive at.
2. Create an email template that renders the submission and can reply to the sender.
3. Set the environment variables listed above from the EmailJS dashboard.

The template receives these variables:

- `from_name` — the submitter's name (falls back to their email)
- `reply_to` — the submitter's email, so you can reply back to them
- `topic` — `Question`, `Feedback`, or `Support`
- `message` — their message

Enable the **Auto-Reply** template on the EmailJS template if you want an instant confirmation sent to the submitter. Without configuration, development submissions are stored only in the current browser session.

Submissions are sent from the browser using the public key, which EmailJS allows to be public. The service must be rate-limited and the published privacy-retention policy applies.

## Quality Checks

```bash
npm run lint
npm run test
npm run build
npm run test:e2e
VITE_LAUNCH_INTEREST_ENDPOINT=https://api.zama.bt/v1/launch-interests npm run check:production-env
```

Do not publish membership pricing, delivery benefits, nutrition services, farmer identities, or sourcing claims until the corresponding operational and legal review is complete.
