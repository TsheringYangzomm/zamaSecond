# Zama Launch Website

React, TypeScript, Vite, Tailwind CSS v4, TanStack Router, and TanStack Query power Zama’s Thimphu launch preview.

## Local Development

```bash
npm install
npm run dev
```

Without Supabase (or a launch-interest endpoint) configured, development submissions are stored only in the current browser session. No order or payment is created.

## Production Configuration

Copy `.env.example` into the deployment environment and set the public browser values plus the matching server-only values:

```text
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_public_key
VITE_EMAILJS_PUBLIC_KEY=your_public_key
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_server_only_service_role_key
TURNSTILE_SECRET_KEY=your_server_only_turnstile_key
VITE_TURNSTILE_SITE_KEY=your_turnstile_site_key
```

For local testing of real submissions, copy `.env.example` to `.env.local` (already gitignored) with your Supabase and EmailJS values and run `npm run dev`.

### Launch-interest storage (Supabase)

Launch-interest (waitlist) emails are stored in a Supabase Postgres database.

1. Create a free project at supabase.com.
2. Apply the documented baseline schemas, then `supabase/migrations/20260909000100_harden_customer_checkout.sql`. The hardening migration removes direct anonymous submission access; production submissions are accepted only through the first-party function.
3. Copy the **Project URL** and the **anon public key** from Project Settings → API into `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The anon key is safe to expose in the browser; the schema gives anonymous users no direct table access.
4. View collected emails in the Supabase dashboard under **Table Editor → `launch_interests`**.

Duplicates are blocked: submitting an email that is already registered returns a friendly "you're already on the list" message instead of inserting again.

The optional `VITE_LAUNCH_INTEREST_ENDPOINT` remains supported for local development when Supabase is not configured. Production always uses the same-origin `/api/launch-interest` function.

### Contact form

The contact page at `/contact` collects name (optional), email, topic, and message. Production submissions pass through a first-party function that validates and rate-limits the request, verifies Cloudflare Turnstile, stores it in Supabase, and sends the inbox notification through EmailJS. Provider errors are logged on the server and are not exposed publicly.

1. Create an account at emailjs.com and add an email service with the address you want submissions to arrive at.
2. Create an email template that renders the submission and can reply to the sender.
3. Set the environment variables listed above from the EmailJS dashboard.

The template receives these variables:

- `from_name` — the submitter's name (falls back to their email)
- `reply_to` — the submitter's email, so you can reply back to them
- `topic` — `Question`, `Feedback`, or `Support`
- `message` — their message

Enable the **Auto-Reply** template on the EmailJS template if you want an instant confirmation sent to the submitter. Without configuration, development submissions are stored only in the current browser session.

Production email is sent by the first-party function. The browser never calls EmailJS directly in production, and public responses contain stable Zama error codes rather than provider diagnostics.

### Content admin (`/admin`)

The admin portal at `/admin` manages the waitlist, products, farmers, reviews, and landing-copy content. It uses Supabase Auth and only lets allowlisted emails sign in.

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

5. Open `https://<site>/admin` and sign in.

Notes:

- `npm run db:seed` and `npm run db:add-admin` run server-side and need `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (see `.env.example`). Never put the service role key in a `VITE_*` variable.
- Only `published` rows are shown on the public site; drafts are editable in the admin only.
- Products and farmers use a `sort_order` column — reorder them with the arrow buttons, or set the number directly.
- Product and farmer images upload to the `catalog` bucket; the schema makes those files public-read.
- The public site merges `content_blocks` over its built-in copy, so deleting a block just restores the built-in text. The landing site does not send confirmation emails to waitlist signups.

### Coupons

Coupons are managed in the admin portal under **Commerce → Coupons** and are shown publicly at `/coupons`. To enable live coupon storage and checkout validation, apply the versioned Supabase hardening migration after the documented baseline schemas.

Admins can create percentage or fixed campaigns, choose product/category targets, set dates and usage limits, and deactivate campaigns without removing redemption history. Customers can browse active coupons, sign in to collect them, and apply one coupon during checkout. The order-placement RPC recalculates the discount and total server-side.

### Customer notifications

Signed-in customers receive account-only notifications from the bell in the site header. To enable notifications for order placement/status and payment updates, newly published products, and newly usable coupons, run `supabase/customer-notifications-schema.sql` after the returns schema (and after the CMS, commerce, coupons, and account-rewards schemas). The migration updates the existing `customer_notifications` feed, adds customer-safe read-state RPCs, and enables realtime with the existing polling fallback. Notifications do not send email, SMS, or push messages.

### Jaggle SSO

Jaggle is an additional sign-in method for customers and allowlisted admins. Apply `supabase/jaggle-sso-schema.sql` after the CMS and commerce schemas, then configure the following variables in Vercel:

```text
VITE_JAGGLE_CLIENT_ID=your_jaggle_client_id
JAGGLE_CLIENT_ID=your_jaggle_client_id
JAGGLE_CLIENT_SECRET=your_server_only_jaggle_secret
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_server_only_service_role_key
APP_ORIGIN=https://zamaecom.vercel.app
JAGGLE_CUSTOMER_CALLBACK_URL=https://zamaecom.vercel.app/api/jaggle-customer-callback
JAGGLE_ADMIN_CALLBACK_URL=https://zamaecom.vercel.app/api/jaggle-admin-callback
```

Register the two callback URLs above in Jaggle exactly as written. For local Vercel development, use `http://localhost:3000/api/jaggle-customer-callback` and `http://localhost:3000/api/jaggle-admin-callback`, and set `APP_ORIGIN=http://localhost:3000`. The frontend never receives `JAGGLE_CLIENT_SECRET` or the Supabase service-role key. Jaggle SSO links verified email identities to existing customer records, while admin access still requires the existing `admin_users` allowlist.

## Quality Checks

```bash
npm run lint
npm run test
npm run build
npm run test:e2e
npm run test:e2e:release
npm run check:production-env
```

Public routes use normal paths. Legacy `/#/...` links are converted to their equivalent real path on first load for one compatibility release. The release check uses Node.js 22, and CI runs lint, unit tests, the production build, Chromium coverage, and mobile/WebKit smoke coverage.

Do not publish membership pricing, delivery benefits, nutrition services, farmer identities, or sourcing claims until the corresponding operational and legal review is complete.
