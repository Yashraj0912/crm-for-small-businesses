# Clientbook: a small-business CRM

React + TypeScript + Vite + Tailwind on the front, FastAPI + SQLAlchemy on the back, Neon PostgreSQL for data.
Customers, leads, a Kanban pipeline, tasks, team roles and an activity timeline. Every record belongs to an organization, and the backend enforces that.

You do **not** need Python or Node on your computer. GitHub stores the code, Vercel builds and hosts it, Neon holds the data.

## Deploy in 5 steps

1. **Neon**: create a project at neon.com. Open **SQL Editor**, paste all of `database/schema.sql`, run it.
   Then click **Connect** and copy the connection string with **Connection pooling** turned on (host contains `-pooler`).
2. **GitHub**: create a new repository and upload the contents of this folder (drag the files in on the web page, or use GitHub Desktop).
3. **Vercel**: *Add New → Project*, import the repository, leave the framework as **Other**, and add environment variables:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | the pooled Neon string from step 1 |
   | `JWT_SECRET` | 32+ random characters (see below) |
   | `ALLOW_REGISTRATION` | `true` for now |

   Click **Deploy**.
4. Open your Vercel URL, choose **Create a workspace**. You become the administrator. Add teammates under **Team**.
5. Set `ALLOW_REGISTRATION` to `false` in Vercel and redeploy, so strangers cannot create workspaces. Leave it `true` only if you want self-service sign-ups (SaaS mode).

Optional demo data: after step 4, paste `database/seed.sql` into the Neon SQL Editor and run it. It fills your first workspace with sample customers, leads, deals, tasks and activity. Delete the rows when you go live.

**Generate `JWT_SECRET` on Windows PowerShell:**
`$b=New-Object byte[] 48; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)`

## Roles

| Action | Administrator | Team member |
|---|---|---|
| View and edit customers, leads, deals, tasks, activities | yes | yes |
| Delete customers, leads, deals | yes | no |
| Delete tasks and activities | yes | yes |
| Add, edit, deactivate team members | yes | no |

Everyone in an organization sees that organization's records, and nobody sees another organization's.

## Security notes

- Passwords: bcrypt. Sessions: signed JWT (HS256) sent as a Bearer header, 12 hour lifetime (`TOKEN_TTL_MINUTES`). The token is kept in `localStorage`, which is simple but readable by any script on the page; the app ships no third-party scripts besides Google Fonts. Moving to httpOnly cookies plus a refresh token is the next hardening step.
- Tenant isolation: every query filters by the caller's `org_id`, and every foreign id in a request (customer, owner, deal, assignee) is checked to belong to the same organization. `backend/tests/test_api.py` covers this.
- There is no login rate limiting in the app. Turn on Vercel's Firewall rate limiting for `/api/auth/*` before a public launch.

## Neon free tier

- Compute scales to zero after a few minutes idle, so the first request after a pause is slower (about a second).
- Storage, compute hours and project counts are capped. Plans change, so check neon.com/pricing for current numbers.
- The app is built for this: pooled connections with no app-side pool (`NullPool`), indexes on every `org_id` filter, pagination everywhere (max 100 rows, 300 for the Kanban board), one aggregated dashboard query set, no polling and no background jobs.
- Dropdowns load up to 1,000 customers or deals; beyond that, add search-as-you-type selects.

## Run the tests (no local setup)

1. In Neon, create a **branch** of your database for testing and copy its connection string.
2. In GitHub: *Settings → Secrets and variables → Actions → New secret* named `TEST_DATABASE_URL`.
3. Push any change. The **CI** workflow runs the API tests (tenant isolation, roles, validation, CRUD) and the frontend build.

## Run locally (optional)

Python 3.12+ and Node 20+: `pip install -r requirements.txt -r requirements-dev.txt`, set the variables from `.env.example`, run `uvicorn crm.main:app --reload --port 8000` inside `backend/`, then `npm install && npm run dev` inside `frontend/`. The dev server proxies `/api` to port 8000.

## API documentation

Interactive docs are served at `/api/docs` on your deployment. Summary in `docs/API.md`.

## Project layout

```
api/index.py            Vercel entrypoint
backend/crm/            FastAPI app: models, schemas, crud factory, routers, security
database/schema.sql     Tables, constraints, indexes (the migration)
database/seed.sql       Demo data
frontend/src/           pages, components, lib (api client, hooks, forms)
vercel.json             Build + routing
```

## Schema changes

Add a new numbered SQL file under `database/` and run it in the Neon SQL Editor. `schema.sql` is idempotent (`if not exists`).
