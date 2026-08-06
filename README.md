# Zama Launch Website

React, TypeScript, Vite, and Tailwind CSS v4 landing experience for Zama’s Thimphu launch preview.

## Local Development

```bash
npm install
npm run dev
```

Without Supabase (or a launch-interest endpoint) configured, development submissions are stored only in the current browser session. No order or payment is created.

## Production Configuration

Copy `.env.example` into the deployment environment and set:

```text
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_public_key
VITE_EMAILJS_PUBLIC_KEY=your_public_key
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
```

For local testing of real submissions, copy `.env.example` to `.env.local` (already gitignored) with your Supabase and EmailJS values and run `npm run dev`.

### Launch-interest storage (Supabase)

Launch-interest (waitlist) emails are stored in a Supabase Postgres database.

1. Create a free project at supabase.com.
2. Run `supabase/schema.sql` in the Supabase SQL editor. It creates the `launch_interests` table (unique email, row-level security enabled) and a `create_launch_interest()` function that validates the email format and returns `ok`, `duplicate`, or `invalid_email`.
3. Copy the **Project URL** and the **anon public key** from Project Settings → API into `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The anon key is safe to expose in the browser; the schema gives anonymous users no direct table access.
4. View collected emails in the Supabase dashboard under **Table Editor → `launch_interests`**.

Duplicates are blocked: submitting an email that is already registered returns a friendly "you're already on the list" message instead of inserting again.

The optional `VITE_LAUNCH_INTEREST_ENDPOINT` remains supported as a fallback when Supabase is not configured. It must accept `POST` requests with JSON containing `email`, `source` (`hero-waitlist` or `launch-basket`), and optional `area` and `items` (`{ sku, quantity }[]`). A successful request should return HTTP `202` or another `2xx` response, optionally `{ "submissionId": "..." }`.

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

### Content admin (`#/admin`)

The admin portal at `#/admin` manages the waitlist, products, farmers, reviews, and landing-copy content. It uses Supabase Auth and only lets allowlisted emails sign in.

1. Enable the **Email** provider under Supabase → Authentication → Providers.
2. Run `supabase/cms-schema.sql` in the SQL editor **after** `supabase/schema.sql`. It creates the `products`, `farmers`, `reviews`, `content_blocks`, and `admin_users` tables, the `is_admin()` helper, row-level-security policies, and the public `catalog` storage bucket for product/farmer images.
3. Create your auth user (Authentication → Users → Add user), then grant access with:

   ```bash
   npm run db:add-admin -- you@example.com
   ```

4. Optionally pre-fill content from the built-in site data:

   ```bash
   npm run db:seed
   ```

5. Open `https://<site>/#/admin` and sign in.

Notes:

- `npm run db:seed` and `npm run db:add-admin` run server-side and need `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (see `.env.example`). Never put the service role key in a `VITE_*` variable.
- Only `published` rows are shown on the public site; drafts are editable in the admin only.
- Products and farmers use a `sort_order` column — reorder them with the arrow buttons, or set the number directly.
- Product and farmer images upload to the `catalog` bucket; the schema makes those files public-read.
- The public site merges `content_blocks` over its built-in copy, so deleting a block just restores the built-in text. The landing site does not send confirmation emails to waitlist signups.

## Quality Checks

```bash
npm run lint
npm run test
npm run build
npm run test:e2e
npm run check:production-env
```

Do not publish membership pricing, delivery benefits, nutrition services, farmer identities, or sourcing claims until the corresponding operational and legal review is complete.
