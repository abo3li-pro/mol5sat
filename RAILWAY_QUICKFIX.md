# Railway Quickfix — "Host not in allowlist" / App not loading

## The problem
The app crashes or returns "Host not in allowlist" because:
1. The Railway service does not have the required environment variables set, OR
2. You uploaded an older version of the code

## Fix in 3 steps

### Step 1 — Set environment variables in Railway

Go to your Railway service → **Variables** tab → add these one by one:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | *(generate your own — see below)* |
| `WALLET_ENCRYPTION_KEY` | *(generate your own — see below)* |
| `DOMAIN` | `https://mol5sat-production.up.railway.app` |
| `DB_PATH` | `/data/mol5sat.db` |

> **Generate your own values — never reuse values that have ever appeared
> in a git repository, even a private one.** Run these on any computer
> with Node installed, or use Railway's own shell:
> ```
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```
> for `JWT_SECRET`, and
> ```
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```
> for `WALLET_ENCRYPTION_KEY`. Paste each result directly into Railway's
> Variables panel — never into a file that gets committed to the repo.
>
> If your live site's current Variables panel still has the old values
> that used to be written here, treat them as already exposed and rotate
> them: generate new values with the commands above, update them in
> Railway, then redeploy. Changing `JWT_SECRET` signs out everyone
> currently logged in (everyone just logs back in normally — no data is
> lost). Changing `WALLET_ENCRYPTION_KEY` will make any wallet data
> already encrypted under the old key unreadable, so if your database
> already has real wallet records, that migration needs care — ask
> before just swapping the value if that applies to you.

### Step 2 — Add a persistent Volume (required for the database)

Railway's filesystem resets on every deploy. Without a Volume, all data is lost on redeploy.

1. In your Railway project, click your service
2. Go to **Volumes** → **Add Volume**
3. Mount path: `/data`
4. Size: 1 GB (more than enough to start)
5. Click **Create**

The `DB_PATH=/data/mol5sat.db` variable (set in Step 1) tells the app to store its database on this volume.

### Step 3 — Redeploy

After setting variables and adding the Volume, click **Deploy** (or push to GitHub if auto-deploy is on).

Wait ~60 seconds, then visit:
```
https://mol5sat-production.up.railway.app/api/health
```
Should return: `{"status":"ok","time":"...","version":"1.0.0"}`

Then visit:
```
https://mol5sat-production.up.railway.app/
```
Should show the Mol5sat landing page.

## If it still doesn't work

Check Railway logs: go to your service → **Deployments** → click the latest deploy → **View Logs**

Common log messages and fixes:

| Log message | Fix |
|---|---|
| `ENOENT: no such file or directory '/data/mol5sat.db'` | Volume not mounted — redo Step 2 |
| `Cannot find module 'better-sqlite3'` | `npm install` failed — check build logs |
| `JWT_SECRET is missing` | Variable not set — redo Step 1 |
| Port binding error | Set `PORT` variable or let Railway set it automatically |
