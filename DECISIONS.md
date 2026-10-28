# Decisions

The main choices behind ReviewFlow, what they cost, and the ones made when it was retired and published.
Each entry is short on purpose: the context, the decision, and the consequence.

## Building the product

### 1. No backend of our own: the browser talks to Supabase directly
**Context.** A small agency product with a handful of tenants, built and run by one developer.
**Decision.** A static React SPA on Vercel that calls Supabase (Postgres, Auth, Realtime) directly with the public
anon key. What each visitor may read or write is decided by row level security in the database.
**Consequence.** No API server to host, scale or secure, and realtime came almost free. The price is that
authorisation lives in SQL policies, which must be right, because the anon key is public by design.

### 2. One privileged operation, isolated in an Edge Function
**Context.** Replying to a customer needs an email provider key and must check who is sending.
**Decision.** Only `send-feedback-reply` runs server-side. It verifies the caller's JWT and role with the
service-role client, sends through Resend, and logs the reply. The service-role and Resend keys never reach the browser.
**Consequence.** Secrets stay in one place. The function accepts the JWT in the request body as well as the
`Authorization` header, so the browser can send a CORS "simple request" and skip the preflight.

### 3. Route by a per-business rating threshold
**Context.** Clients wanted more of their happy customers on Google and a way to hear from unhappy ones first.
**Decision.** At or above the business's threshold (default 4 stars) the customer is redirected to the Google review
page; below it they get a private feedback form. Every tap is logged as a `rating_event`, so the dashboard shows
redirects and intercepted ratings side by side.
**Consequence.** This is the flow exactly as it ran in production, and it is kept unchanged in this repository.
Review platforms have rules about how businesses may ask for reviews. Anyone reusing this pattern should check the
current Google review policies and local consumer rules first.

### 4. Client-generated IDs for public inserts
**Context.** Anonymous visitors insert ratings and feedback, and the next page needs the new row's ID.
**Decision.** The browser generates the UUID and inserts without reading the row back.
**Consequence.** Anonymous users need an INSERT policy only, never SELECT, so they cannot read other customers' feedback.

### 5. One login page, roles in `user_profiles`
**Context.** Early versions had separate super-admin and per-business login pages.
**Decision.** A single `/login` that routes by the role in `public.user_profiles`. A `SECURITY DEFINER` helper
(`is_super`) lets policies check roles without RLS recursion.
**Consequence.** Simpler auth and fewer URLs to explain. The super admin can open any business's portal in an
explicit, bannered impersonation mode instead of sharing credentials.

### 6. Pragmatic shortcuts that were kept
- **Tailwind via the Play CDN** instead of a build step: fastest to iterate on, but not recommended for production.
- **Photos as base64** in a `text[]` column instead of Supabase Storage: simple, but it bloats rows and is capped at 3 photos.
- **Deleting a business** as a sequence of client-side deletes rather than one transaction or an RPC.

These are listed under Limitations in the README rather than fixed, so the code stays as it shipped.

## Retiring and publishing it

### 7. Runs with zero configuration on a built-in demo data layer
**Context.** The production Supabase project is being paused or deleted, and a reference project should run on a
reviewer's machine in one command.
**Decision.** Pages depend on two small interfaces, `DataService` and `AuthService`. With no Supabase variables
they are served by an in-browser implementation backed by `localStorage`, seeded with synthetic data (fictional
businesses, customers and `example.com` addresses; nothing from the real database), with one-click demo logins.
The Supabase client is not created and realtime subscriptions are skipped. A stand-in page replaces the Google
redirect so the demo never sends anyone to a real business profile, and an Outbox page shows each reply as the
customer's email would look instead of sending it.
**Consequence.** `npm install && npm run dev` is the whole setup, and CI builds the same zero-config app. The Supabase
path is unchanged and is used as soon as both variables are set.

### 8. Row level security written down and tested
**Context.** The production policies for the app tables lived only in the Supabase dashboard.
**Decision.** Policies for `businesses`, `rating_events`, `feedback` and `feedback_replies` (plus a super-admin delete
on `user_profiles`) were written from how the app uses each table, with a trigger that stops a business admin from
changing the fields the UI reserves for the super admin. They were tested on Postgres 16 as anonymous, business-admin
and super-admin users.
**Consequence.** The repository is a complete, secure-by-default setup. The policies are a faithful reconstruction,
not a copy of what ran in production.

### 9. Dependencies brought up to date within their ranges
**Context.** `npm audit` reported high-severity advisories in `react-router`, `ws` and build tooling.
**Decision.** Apply the semver-compatible fixes (`npm audit fix`, no `--force`) and nothing else.
**Consequence.** `npm audit` is clean, with no major-version upgrades and no behaviour changes.

### 10. Published as one clean commit under the MIT licence
**Context.** The private repository's history contained environment-specific details (a Supabase project ID,
a production domain, setup examples) but no credentials.
**Decision.** Publish the final tree as a single commit in a new repository, after a gitleaks scan, under the MIT licence.
**Consequence.** Nothing from the old history can leak, at the cost of losing the commit-by-commit story of how it was built.
