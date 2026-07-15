# Little Sprouts Nursery CRM

A full-stack CRM for a private nursery: Express + PostgreSQL backend, single-page
HTML/JS frontend. Data is shared live across every device/staff member who uses it.

## What's inside
- `server.js` — Express API, auth (login/session), and static file serving
- `schema.sql` — Postgres table definitions (users, parents, children, fees, attendance, comms, incidents, prospects)
- `public/index.html` — the CRM UI (login screen, dashboard, directory, prospects, fees, marketing, my class)
- `public/enroll.html` — the **public** enrollment lead form (no login required) at `/enroll`

## Public enrollment link
Share `https://your-deployed-url/enroll` on Facebook, WhatsApp status, or your website.
Anyone who fills it in shows up in the **Prospects** tab (Admin only) automatically —
no login needed to submit, so this is safe to share publicly. From there you can
WhatsApp them directly, mark them contacted/lost, or hit **Convert** to turn them into
a real enrolled child + parent record (pre-fills the Add Child form for you).

## Login
On first run, two accounts are seeded automatically:
- **Admin**: `admin` / `admin123`
- **Teacher** (assigned to the Sprouts class): `teacher1` / `teacher123`

**Change these passwords before using real data.** The quickest way for now is directly
in the database:
```sql
UPDATE users SET password_hash = '<new bcrypt hash>' WHERE username = 'admin';
```
(Generate a hash with `node -e "console.log(require('bcryptjs').hashSync('yournewpassword', 10))"`.)
There's no in-app user management UI yet — adding more teacher accounts or changing
passwords currently means running SQL directly against the database (Railway's
dashboard has a built-in query tab for this). Let me know if you'd like a proper
admin-facing "manage staff accounts" screen added next.

## Local setup
1. Install dependencies:
   ```
   npm install
   ```
2. Make sure Postgres is running locally, and create a database.
3. Copy `.env.example` to `.env`, set `DATABASE_URL` to your local Postgres connection
   string, and set `JWT_SECRET` to any long random string.
4. Start the app:
   ```
   npm start
   ```
5. Visit `http://localhost:3000`, sign in with one of the seeded accounts above.
   On first run, the database schema is created and sample demo data (5 families) is
   seeded automatically.

## Deploying to Railway
1. Push this folder to a GitHub repo.
2. On railway.com: **New Project → Deploy from GitHub repo** → select your repo.
   Railway detects the Node app automatically (via `package.json`'s `start` script).
3. In the same project, click **+ New → Database → Add PostgreSQL**.
   Railway automatically injects a `DATABASE_URL` environment variable into your
   app service once the two are linked — no manual config needed.
4. In your app service's **Variables** tab, add `JWT_SECRET` (any long random string —
   generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   and `NODE_ENV=production` (this makes login cookies secure/HTTPS-only, which Railway supports by default).
5. Go to **Settings → Networking/Domains → Generate Domain** to get a public URL.
6. On first request, the app creates its tables, seeds demo data, and seeds the two
   default accounts automatically. Log in and change those passwords as described above.

## Notes
- All staff (admin + teachers) hitting the same deployed URL now share the exact
  same live data — this is the real multi-user version, not the localStorage demo.
- **Real authentication is now in place**: passwords are hashed (bcrypt), sessions use
  signed JWTs in httpOnly cookies, and the server — not just the UI — enforces that
  teachers only see/edit their own class and that fee/marketing/admin actions require
  the admin role. A teacher account cannot access another class's data even by
  calling the API directly.
- Receipts are numbered sequentially (`R-0001`, `R-0002`, ...) based on existing
  paid fees in the database.
- Not yet included: password reset flow, an in-app screen for adding/removing staff
  accounts, and rate-limiting on the login endpoint. Worth adding before wider rollout.
