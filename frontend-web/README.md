# Mol5sat — Website Version (MPA)

This is the **multi-page website** version of Mol5sat.
It shares the **same backend** and **same data** as the original app — zero duplication.

## How it differs from the app version

| Feature | App (`/app`) | Website (`/`) |
|---|---|---|
| URLs | Hash-based (`/#home`, `/#viewer`) | Clean (`/home`, `/summary/abc123`) |
| Pages | Single `index.html` | One HTML file per page |
| Tab-in-browser | Can't link to specific page | Every page is directly shareable |
| SEO | Search engines can't crawl hash routes | Every summary has its own indexable URL |
| Canonical tags | Static | Updated dynamically per-page |
| Sitemap | `/summary/:id` links (already clean) | Same sitemap, now actually navigable |
| Data | Same `MOCK_USERS`, `MOCK_SUMMARIES` in `data.js` | Identical — shared JS files |
| Backend API | Same `/api/*` routes | Identical |

## Folder structure

```
mol5sat/
├── backend/           ← unchanged — serves both versions
│   └── server.js      ← patched to route website URLs
├── frontend/          ← original SPA app (accessible at /app)
│   ├── index.html
│   ├── app.js
│   ├── pages.js
│   ├── ui.js
│   └── data.js
└── frontend-web/      ← NEW: website version
    ├── index.html     →  /              (landing / home)
    ├── home.html      →  /home
    ├── search.html    →  /search?q=...
    ├── summary.html   →  /summary/:id   (each summary)
    ├── user.html      →  /user/:id      (creator profiles)
    ├── trending.html  →  /trending
    ├── subjects.html  →  /subjects
    ├── saved.html     →  /saved
    ├── following.html →  /following
    ├── notifications.html → /notifications
    ├── settings.html  →  /settings
    ├── earnings.html  →  /earnings
    ├── wallet.html    →  /wallet
    ├── profile.html   →  /profile
    ├── admin.html     →  /admin
    ├── supervisor.html → /supervisor
    ├── membership.html → /membership
    ├── styles.css     ← shared CSS (extracted from SPA)
    ├── data.js        ← shared (copy of frontend/data.js)
    ├── app.js         ← shared (copy of frontend/app.js)
    ├── pages.js       ← shared (copy of frontend/pages.js)
    ├── ui.js          ← shared (copy of frontend/ui.js)
    ├── shared.js      ← helpers originally inline in index.html
    └── router.js      ← NEW: reads URL → sets STATE.route
```

## How the router works

`router.js` runs at DOMContentLoaded and:
1. Reads `window.location.pathname`
2. Maps it to the correct `STATE.route` + `STATE.routeData`
3. Patches `navigate()` so all in-app links do `history.pushState` with real paths
4. Handles browser back/forward correctly
5. Redirects guests away from auth-required pages

## Running

```bash
npm install
npm start
# Website:  http://localhost:3000/
# App:      http://localhost:3000/app
```

## Keeping data in sync

Both versions use the same `data.js` file (symlinked or copied).
When you update the real backend to use SQLite (replacing the mock API stub),
both versions will automatically use the real data since they share all JS files.

## To connect to real backend data (when ready)

In `app.js`, replace the `async function api(...)` stub with:

```js
async function api(method, endpoint, body, isFormData) {
  const token = localStorage.getItem('mol5sat_token');
  const opts = {
    method,
    headers: {
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    },
    body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
  };
  const res = await fetch('/api' + endpoint, opts);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
```

This single change connects both the app and the website to the real database simultaneously.
