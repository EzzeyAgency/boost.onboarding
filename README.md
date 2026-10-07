# BOOST Onboarding

Ezzey's BOOST onboarding app, rebuilt from the Manus version for GitHub and Vercel.

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Six-step conditional onboarding (any business type) |
| `/support` | Public | Support request form |
| `/leads` | Admin only | All leads, all time, newest first; onboarding and support tabs; date filters; CSV export |
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
