# BOOST Onboarding

Ezzey's BOOST onboarding app, rebuilt from the Manus version for GitHub and Vercel.

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Two-part onboarding (Google first, then the business), with save and resume |
| `/support` | Public | Support request form |
| `/leads` | Admin only | All leads, all time, newest first; onboarding, support and in-progress tabs; date filters; CSV export |
| `/<business-name>` | Admin only | At-a-glance client page for sales and reporting calls (e.g. `/smith-and-sons-plumbing`) |
| `/leads/drafts/[id]` | Admin only | Answers saved so far by a customer who hasn't submitted |
| `/leads/[id]` | Admin only | Call-ready business or support profile |

Stack: Next.js (App Router), Drizzle ORM, Neon Postgres, Auth.js with Google sign-in.

## How access works

- Admins sign in with Google. Only verified Google accounts listed in `ADMIN_EMAILS` can sign in; everyone else is refused.
- The allowlist is re-checked on every admin page and API request, so removing an email revokes access immediately.
- Lead APIs return a generic 404 to anyone who is not an admin, so record IDs cannot be probed.

## One-time setup

1. **Vercel project**: Vercel > Add New > Project > import `EzzeyAgency/boost-onboard`. Framework preset: Next.js. Leave build settings as default.
2. **Database**: in the Vercel project, Storage > Create Database > Neon (Postgres) > connect to this project. Vercel adds `DATABASE_URL` automatically.
3. **Create the table** (once, from a computer with Node 20+):
   ```sh
   npm install
   DATABASE_URL="<pooled Neon connection string>" npm run db:migrate
   ```
   Or paste `drizzle/0000_init.sql` into the Neon SQL editor and run it.
4. **Google sign-in**: Google Cloud Console > APIs & Services > Credentials > Create credentials > OAuth client ID > Web application.
   - Authorized redirect URI: `https://<your-domain>/api/auth/callback/google` (add the `*.vercel.app` URL too while testing).
   - If the OAuth consent screen asks, choose **Internal** for a Google Workspace org (limits sign-in to Ezzey accounts).
5. **Environment variables** (Vercel > Settings > Environment Variables). See `.env.example`.
   | Variable | Value |
   |---|---|
   | `AUTH_SECRET` | Output of `npx auth secret` or `openssl rand -base64 33` |
   | `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | From step 4 |
   | `ADMIN_EMAILS` | `analytics@ezzey.com` (comma-separate more) |
   | `NEXT_PUBLIC_LEADSIE_CONNECT_URL` | `https://app.leadsie.com/connect/ezzey/manage` |
   | `NEXT_PUBLIC_GOOGLE_BUSINESS_URL` | `https://business.google.com/` |
   | `NEXT_PUBLIC_GBP_SETUP_VIDEO_URL` | `https://www.youtube.com/watch?v=VrawbXIY3V4` |
6. **Redeploy**, then add the custom domain (e.g. `onboard.boost.ezzey.com`) under Settings > Domains.
7. **Recommended**: Vercel > Firewall > add a rate-limit rule for `POST /api/onboarding` and `POST /api/support`. The app has a per-instance limiter and a honeypot, but serverless instances do not share memory.

## Save and resume

- Answers are kept in the browser as the customer types, and saved to the `drafts` table once they enter an email (after a 2.5 second pause).
- "Save and finish later" gives the customer a private link (`/?resume=...`). Only a SHA-256 hash of the link's token is stored.
- Submitting marks the draft complete. Open drafts appear under **In progress** on `/leads`.
- Database: run `drizzle/0001_drafts.sql` once in the Neon SQL Editor (or `npm run db:migrate`).

## Client pages

- Each customer gets one page at `/<business-name>`, created when they finish the "Your details" step, save for later, or submit.
- Duplicate names get `-2`, `-3`. The address never changes once created. Reserved paths (`leads`, `support`, `api`...) get `-client`.
- The page shows the submitted answers, or the saved draft (marked "In progress") until they submit.
- Sign-in required (same `ADMIN_EMAILS` list), because the address is guessable.
- Database: run `drizzle/0002_client_pages.sql` once.

## HighLevel webhook (optional)

Set a HighLevel workflow "Inbound Webhook" trigger URL in Vercel. Every event is a JSON POST with an `event` field.

- `HIGHLEVEL_SUPPORT_WEBHOOK_URL`: support requests only
- `HIGHLEVEL_ONBOARDING_WEBHOOK_URL`: onboarding submissions and saved progress
- `HIGHLEVEL_WEBHOOK_URL`: catch-all for any event without its own URL

| Event | When | Useful fields |
|---|---|---|
| `onboarding.submitted` | Form submitted | email, name, companyName, formStatus, googleAccessStatus, needsHelp, helpNote, profileUrl, status, **Onboarding Info** |
| `onboarding.progress_saved` | Customer clicks "Save and finish later" | email, name, companyName, googleProfile, resumeUrl, adminUrl, **Onboarding Info** |
| `onboarding.page_created` | Customer's page is created | email, name, companyName, status, **Onboarding Info** |
| `support.submitted` | Support form submitted | email, phone, companyName, topic, message, alreadyTried, profileUrl |

`Onboarding Info` is the full client page URL. Map it to the contact custom field of the same name (match contacts by email).

`ZAPIER_WEBHOOK_URL` receives the same onboarding events and payloads (not support), for a Zap into Teamwork.

Branch the workflow on `event` to create or update the contact, move the pipeline stage, send the acknowledgement email, and notify the team. Failures are logged and never block a customer's submission.

## Launch checklist

- [ ] Submit each Google branch on a preview deploy and confirm the status shown on `/leads`
- [ ] Submit a support request and confirm it appears under Support requests
- [ ] Open `/leads` and `/leads/1` in a private window: sign-in page, no data
- [ ] Sign in with a non-allowlisted Google account: refused
- [ ] Export CSV and confirm values starting with `=` open as text
- [ ] Check `/`, `/support` and `/leads` on a phone

## Development

```sh
cp .env.example .env.local   # fill in values
npm install
npm run dev
npm test          # status logic, validation branches, CSV safety, API authorization
npm run typecheck
```

## Not included (future work, per handoff)

Payment intake, welcome emails, HighLevel sync, Teamwork tickets, SMS/email automations, Google or Leadsie webhooks, and owner notifications. The Manus version sent an owner notification when Google access was confirmed; that needs an email provider (e.g. Resend) and is not wired up yet.
