# Mol5sat — Plain-English Guide

---

## What to actually do right now (step by step)

### Step 1 — Deal with the security issue first

Before pushing any code, open your Railway dashboard, go to your service,
click **Variables**, and check whether `JWT_SECRET` and `WALLET_ENCRYPTION_KEY`
are set there. If they are the values that used to be written in
`RAILWAY_QUICKFIX.md` (they're now replaced with instructions instead —
that was the first thing I changed this round), generate new ones:

Open any terminal and run this twice — once for each secret:
```
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Paste the output directly into Railway's Variables panel. Never put these
in a file that's committed to GitHub.

Changing `JWT_SECRET` logs out everyone currently signed in — they just
sign back in normally, no data is lost. If your site has real wallet
records, ask before changing `WALLET_ENCRYPTION_KEY`, since that needs
a careful migration. If there's no real financial data yet, change it freely.

### Step 2 — Replace your repo with the new files

**Option A (easiest):** Download the `.tar.gz` file, extract it, and copy
everything inside the `mol5sat-main/` folder into your GitHub repo,
replacing the existing files. Commit and push to `main`. Railway picks
it up automatically within a minute.

**Option B:** Clone your repo locally, drag the extracted files in (let
it overwrite), then `git add -A && git commit -m "full audit pass" && git push`.

### Step 3 — After it deploys, check three things

1. Open a real creator's profile page directly in your browser — the URL
   should look like `mol5sat.org/user/some-id`. Check that the browser
   tab title shows their actual name, not the generic site title. This
   confirms the new server-side OG work I built last round is wired up.

2. Type a completely made-up URL like `mol5sat.org/this-does-not-exist`.
   You should now see a proper "404 — Page not found" page with "Go Home /
   Go Back / Search" buttons. Previously this just silently redirected to
   the home feed with no explanation.

3. Sign in, follow a creator, then refresh the page. The Follow button
   should still say "Following" after the refresh. Then open your
   Notifications tab, and if you have any, try deleting one and try
   "Clear all" — both should work and the list shouldn't come back after
   a refresh. This confirms the fixes from this round are actually live.

---

## What every file does (in plain English)

Think of the site as two separate machines that talk to each other:
the **server** (runs on Railway, your visitors never see it directly) and
the **browser** (what your visitors actually use). Most files belong clearly
to one side.

---

### The server side — `backend/`

**`server.js`** — The front door of the whole site.
Every time someone visits any URL on Mol5sat, this file is what receives
that request first. It decides: "Is this someone loading a page? Send
them the right HTML file. Is this the app asking for data? Pass it to the
right route handler." It also sets up all the security rules (rate limits
so no one can spam the API, CORS rules so only your own site can talk to
your server, Helmet headers that protect against common attacks). Think
of it as the building manager — it doesn't do the actual work itself, but
it decides who goes where.

**`db.js`** — The entire database in one file.
This creates every table your site needs (users, summaries, likes, saves,
follows, memberships, wallet, notifications, comments, watermarks, etc.)
and provides a single shared `db` object that every other server file
uses to talk to SQLite. It also has a `seed()` function that creates your
first admin account when the server starts for the first time.

**`routes/auth.js`** — Sign up, sign in, sign out.
Handles registration (hashes passwords before storing them, validates
email format, checks uniqueness), login (verifies password, issues a JWT
token), token refresh, password change, and account deletion. The JWT
token is what your browser stores to prove "I'm signed in" on every
request without re-entering a password.

**`routes/summaries.js`** — Everything to do with the actual summaries.
Create a summary (validates it, attaches a watermark so stolen content
can be traced back, stores the file), fetch the feed (filtered by grade,
country, subject, sort), fetch a single summary to read (now only counts
as a real "view" once per person within 12 hours, and never counts the
author viewing their own work — this number directly affects ad revenue
and the threshold to start earning, so it needed to be hard to fake),
delete your own summary, like a summary, save it to your bookmarks. Also
handles the pending-approval queue that supervisors use.

**`routes/users.js`** — Everything to do with user profiles.
Fetch a user's public profile, update your own profile (name, photo,
country, grade, school type), follow/unfollow a creator, get your
following list, get notifications (and now delete one or clear all of
them), get a list of every creator you currently have an active
membership with. Also handles the per-creator membership setup
(enabling it, setting price and perks).

**`routes/comments.js`** — Comments on summaries.
Post a comment, read comments (sorted by newest or most-liked), like a
comment, delete your own comment. Comments are tied to a specific summary
ID, so they only appear on the right page.

**`routes/earnings.js`** — Creator revenue tracking.
Records ad impressions and calculates how much each creator has earned,
broken down by summary. Tracks the platform's revenue split. Provides
the data shown on the Earnings page.

**`routes/wallet.js`** — Creator withdrawals.
Lets creators request a payout, tracks withdrawal history, stores payment
method details (encrypted so even a database breach doesn't expose them).
Admins approve or reject withdrawal requests from here.

**`routes/ads.js`** — Advertiser management.
Lists available advertising companies, lets creators choose which ones
can advertise in their summaries, records actual ad clicks/impressions
for billing purposes.

**`routes/admin.js`** — The admin control panel's data.
Approve/reject pending summaries, ban/unban users, view reports,
resolve plagiarism flags, see site-wide statistics.

**`routes/reports.js`** — User-submitted reports about summaries.
When a reader clicks "Report" on a summary (copyright violation, wrong
content, plagiarism), it goes here. Admins and supervisors can view and
resolve these.

**`routes/siteReports.js`** — General site feedback / bug reports.
For the "Report Site Issue" button in the sidebar. Separate from content
reports — these are about the platform itself.

**`middleware/auth.js`** — The bouncer at every protected door.
Every route that requires you to be signed in (like posting a summary or
accessing your wallet) uses `requireAuth` from this file. It checks your
JWT token, confirms it's valid and not expired, and attaches your user
data to the request so the route handler knows who you are. `requireAdmin`
and `requireSupervisor` do the same but also check your role.

**`middleware/ipBan.js`** — Blocks banned IP addresses.
Before any request goes anywhere, this checks the IP address against a
ban list. Used to block abusive visitors at the network level.

**`utils/watermark.js`** — The content-protection engine.
When a creator uploads a summary, this invisibly encodes their creator ID
into the text itself using a statistical pattern (it slightly adjusts word
spacing and character frequencies in a way humans don't notice). When a
copied summary is submitted, this detects the watermark and identifies the
original creator. Also has the similarity scoring function used for the
plagiarism detection system — fixed this round so it actually compares
Arabic text correctly instead of silently giving every Arabic summary an
inflated similarity score regardless of content.

**`utils/email.js`** — Sends emails.
Account verification, ban notifications, password reset links. Uses your
configured SMTP settings (the Gmail app password you set in Railway
Variables) to actually deliver these. If SMTP isn't configured, emails
are just logged to the console without sending — so the site works without
it, you just won't get email notifications.

**`utils/activity.js`** — Logs user actions for analytics, and notifies admins.
Records things like "user X viewed summary Y" and "user X followed creator
Z" to a timeline. Used by the admin dashboard for engagement analytics.
Also has the function that notifies admins about reports and plagiarism
alerts — added this round so it actually looks up whoever has the admin
role, instead of a single hardcoded account.

**`utils/earnings.js`** — New this round. The one true calculation for
how much a creator earns from a summary, and how much they can actually
withdraw. Both the Earnings page and the Wallet used to calculate this
independently and could disagree; now they both call this same file.

---

### The browser side — `frontend-web/`

**`index.html` (and `home.html`, `search.html`, `summary.html`, etc.)** —
The 17 actual pages of the site.
Each one is a near-identical HTML file — same nav, same sidebar, same
script tags, different `<title>` and Open Graph tags (so when you share
a link, the preview card shows the right title for that specific page).
The reason there are 17 separate files instead of one is exactly this:
search engines and apps like WhatsApp read these tags directly from the
server response, before any JavaScript runs, so they need to be real,
distinct pages, not one blank shell with everything injected afterward.

**`styles.css`** — Everything the site looks like.
Fonts, colors, card layouts, button styles, the sidebar, the nav bar,
the dark/light theme variables, animations, responsive breakpoints for
mobile. None of this is JavaScript — the browser just reads it once and
applies it. The gold-and-amber color scheme, the rounded cards, the
bottom nav on mobile — all controlled from here.

**`data.js`** — Country and curriculum data, plus all the practice/demo
content used when the site runs without a live database connected.
A large lookup table: for every country Mol5sat supports, what school
types exist, what grade levels are called, what language preferences
apply, and what college/university categories exist there. Used when a
user registers or updates their settings — the dropdowns that let you
pick "Egypt → Government → Grade 3 Secondary" are populated from this
file. Every one of the 95 countries now has its own real, researched
college category list — none fall back to a generic one anymore. Art,
Music, Physical Education, and Social Studies can now actually be found
by their real synonyms in search, in both English and Arabic, the same
as every other subject already could. The practice summaries' dates now
stay relative to today automatically, instead of being frozen at a fixed
point in 2025 — so the "recently added" feel of the demo data doesn't
quietly fade away the further you get from when this was written.

**`api.js`** — The messenger between browser and server.
Every time the browser needs real data (loading a feed, liking a summary,
posting a comment), it calls functions from this file. `api.js` formats
the request, attaches your login token, sends it to the server, and
returns the result. It also handles token refresh when your session is
about to expire, so you don't get randomly logged out mid-session.
Think of it as the courier — it doesn't decide *what* to ask for, it just
handles the mechanics of asking.

**`app.js`** — Shared tools used everywhere.
The functions that every page needs: formatting numbers (14,200 becomes
"14.2K"), showing toast notifications ("Liked! ❤️"), building a summary
card's HTML, the follow/unfollow toggle, the save toggle, the like toggle.
Also holds the global `STATE` object — a small in-memory record of who's
logged in, which page is showing, what the active sort is. This is the
only place that object lives.

**`pages.js`** — Every page's actual content.
The biggest file. It contains one function per page of the site —
`renderHome`, `renderSearchPage`, `renderViewer`, `renderCreator`, etc.
Each function fetches the data it needs (via `api.js`), builds the HTML
for that page, and writes it into the browser's visible area. When you
click a card and the summary loads, it's because `renderViewer` ran.
When you search and see results appear, `renderSearchPage` ran.

**`ui.js`** — Everything the UI does interactively.
The sidebar open/close toggle, the search suggestions dropdown, the user
avatar dropdown menu, the theme switcher (dark/light), the upload modal
(all four steps of uploading a summary), the sign-in and sign-up modals,
the mobile-specific search bar. These are things that respond to immediate
user actions without needing to load new data — purely about the feel and
interactivity of the interface.

**`shared.js`** — Small utilities shared between files.
Things like the "dismiss guest banner" function, the "report a site issue"
modal, the `updateMeta()` function that updates the browser tab title and
Open Graph tags when you navigate to a new page. Small but used in many
places.

**`router.js`** — The traffic cop between URLs and pages.
When you type `mol5sat.org/summary/123` directly into your browser (or
click a link someone shared), this file reads that URL and decides: "this
is a viewer page, and the summary ID is 123." It then calls
`renderViewer('123')`. When you click a card inside the site, it updates
the URL bar to match without reloading the page (that's what makes
navigation feel instant), and it handles the browser's back and forward
buttons so they work correctly. It also enforces access rules: guests
can browse public pages, but trying to access Settings or Wallet without
being signed in sends you to the welcome page.

---

## What was fixed and added in this final round

### Fixed — search was broken (serious bug)

The search results page had an entire comments section accidentally
copy-pasted into it from the summary viewer page. The comment inputs
referenced a variable (`s.id`) that only exists inside a summary viewer,
not on a search results list. This caused a JavaScript error every time
someone searched — the page would crash and show an error instead of
results. This is now removed. Comments stay on the summary viewer where
they belong.

### Fixed — unknown URLs silently sent you to the home feed

If anyone typed a URL that doesn't exist (like `mol5sat.org/typo`), the
site quietly redirected them to the home feed without any explanation.
Now there's a real 404 page — "Page not found" with your current address
shown, and three buttons to go home, go back, or search. Both the server
(which handles the initial page load) and the browser JS (which handles
in-app navigation) now handle this correctly and consistently.

### Fixed — the secrets file

`RAILWAY_QUICKFIX.md` had your actual `JWT_SECRET` and
`WALLET_ENCRYPTION_KEY` written in plain text in the file. These are now
replaced with instructions to generate your own. Your live Railway
deployment is unaffected — those variables live in Railway's Variables
panel, not in this file.

### Added — Share button on creator profiles

You can now tap Share on any creator's profile page and get the same
behavior as the Share button on a summary: the native share sheet on
mobile (WhatsApp, Telegram, etc.), clipboard copy on desktop, with a
correct link that shows a real preview card when pasted into a chat.
This was already built on the server side in the last round (the
profile page already had proper Open Graph tags and a generated preview
image), but there was no button in the UI to actually use it.

---

## This round — notifications, and three things following from it that turned out to be broken

You asked me to specifically check the notifications tab. What I found
there led to checking follow and membership too, since all three turned
out to share the same root cause.

**The actual bug:** several core actions — following someone, joining a
creator's membership, and loading your notifications — were quietly
reading and writing to fake, in-memory placeholder data instead of
talking to your real database. This is leftover from how the site was
originally built before the real backend existed. The visible result:
clicking "Follow" looked like it worked (the button changed), but it
never actually saved anywhere, so refreshing the page made it look like
it never happened. Same for joining a membership. The notifications
page was reading a one-time snapshot from when you first opened the
site, so marking something as read, or getting a new notification while
you had the tab open, never actually showed up until a full reload.

All three now genuinely talk to the real database every time:

- **Following** a creator persists for real and updates instantly across
  every part of the site.
- **Joining a membership** persists for real, and — this was a related
  gap — there was previously no way at all for the site to know which
  memberships you'd already joined except by visiting that exact
  creator's page one at a time. There's now a proper way to check all of
  them at once, the same way the site already does for who you follow.
- **Notifications refresh for real** every time you open the tab, instead
  of showing the same frozen snapshot from when you logged in.

**Specific notification bugs found and fixed:**

- Clicking a notification about a new summary never actually opened it —
  the two pieces of code involved were using slightly different names
  for the same thing, so they never matched up. Fixed.
- A notification's timestamp ("2h ago") was quietly blank on every single
  notification, because of the same kind of mismatch. Fixed.
- Notifications about someone following you or joining your membership
  had nowhere to go when clicked — there was no information saved about
  *who* the notification was about, only generic text. This needed a
  small, safe addition to the database (one new column) to actually
  remember who triggered the notification, so clicking it now correctly
  opens their profile.
- There was no way to delete a single notification, or clear all of them
  at once — both added now, with a small trash icon per notification and
  a "Clear all" button, including a confirmation prompt before wiping
  everything so it can't happen by accident.
- Each notification now shows a small icon that actually matches what
  it's about (a person icon for a new follower, a document icon for a
  new upload, and so on) instead of every notification looking identical.
- Found and fixed one more real bug while testing all this by actually
  running the code rather than just reading it: the site has a documented
  "offline demo mode" for testing without a live database, and a routing
  mix-up inside that mode meant two of these exact features (checking
  your notifications, checking your memberships) were silently getting
  intercepted by the wrong handler and returning the wrong data
  entirely. Also fixed, and confirmed by actually running it afterward
  rather than just assuming the fix worked.
- Also escaped notification text before displaying it — it's partly
  built from things like a person's display name, and without escaping,
  an unusual name could have broken the page or, worse, run unintended
  code in someone else's browser. Same protection the rest of the site
  already uses elsewhere, just missing here specifically.

---

## The round after that — went back through the backend, and the reference data, looking for anything still wrong or missing

You asked me to fetch the backend and enhance it, and do the same for
the data file. I went through every backend file I hadn't already
rebuilt, and the country/subject reference data, the same way as the
notifications pass — actually running the logic against a real database
engine where I could, not just reading it and hoping.

**The one that actually involves money:** how many times a summary gets
viewed feeds directly into two things — whether it's allowed to earn
money at all, and how much a creator can withdraw. The view counter went
up by one on every single page load, with nothing stopping the same
person from refreshing their own summary's page over and over to push it
past the threshold artificially. It now only counts once per person
within a 12-hour window, and a creator viewing their own summary never
counts at all. A genuine reader coming back the next day still counts
again normally — this isn't about undercounting real interest, only
about closing the obvious way to fake it.

**Also money-related, and arguably more serious:** the page that shows a
creator how much they've earned, and the page that calculates how much
they can actually withdraw, were doing the math two different ways. One
used a flat percentage for every creator; the other gave bigger creators
a bigger cut based on their follower count. For the exact same summary,
those two pages could tell a creator two different numbers — and the
direction of the mistake meant a creator with a large following could
genuinely be shown a lower amount in their wallet than what they were
promised on their earnings page. Both pages now share one calculation,
so they can't disagree with each other again.

**A fragile assumption that could have caused real outages:** four
different places in the backend — reporting a summary, reporting a site
issue, and two different plagiarism-detection alerts — all sent their
notification to a single, specific hardcoded user ID, on the assumption
that this ID is always the admin. The notifications table has a rule
that the recipient has to actually exist, strictly enforced. If that
exact account were ever renamed, removed, or just one of several admins,
every single one of those four actions would have failed outright with
an error — meaning someone trying to report stolen content could get a
failed request because of something that has nothing to do with their
report. This now looks up whoever actually has the admin role, every
time, and notifies all of them — so it keeps working if admins change,
and naturally covers having more than one admin later.

**A blind spot in the admin activity log:** every time someone posted,
deleted, or pinned a comment, the code tried to log it for the activity
feed using the wrong calling pattern — it looked correct at a glance but
was actually silently failing every single time, so comment activity has
never once shown up in the admin log. Found by actually running the
exact code, not just reading it. Fixed, and confirmed by running it again
afterward.

**For the country/subject reference data**, the part of the site that
asks where you're from and fills in your school or college options based
on that: 11 Arabic-speaking countries — Kuwait, Qatar, Bahrain, Oman,
Lebanon, Iraq, Syria, Palestine, Yemen, Libya, and Sudan — were falling
back to a generic, country-agnostic list instead of their own, despite
this platform's own stated focus on the Arab world. They now have their
own lists, built consistently with the ones Egypt, Saudi Arabia, and
Jordan already had, including things like Islamic Studies that the
generic list doesn't carry. I deliberately didn't try to guess specific
categories for the other ~50 countries still on the generic list — that
list is genuinely fine as a sensible default, and inventing details I
can't actually verify would be worse than leaving it as-is.

I also added a couple of realistic example notifications — someone
following you, someone joining your membership — to the practice/demo
data. That feature already existed and was tested last round, but the
example data never actually showed what it looks like. While adding it,
I found the one piece of code that was supposed to read it was looking
for the wrong spelling of the same field, so it would have silently
ignored the new examples too — fixed that in the same pass and confirmed
it actually works now.

Eleven files changed in that round, plus one brand new one
(`backend/utils/earnings.js`). `diffs.zip` has a line-by-line diff for
each changed file against what you had before, if you'd rather review
than overwrite outright.

---

## The round after that — went much deeper into the reference data specifically

You asked me to keep going on the data file specifically, as thoroughly
as I could. I went back through every part of it I hadn't already
checked, this time checking things *against each other* — does this
field actually match that other list it's supposed to match — and ran
nine different consistency checks together at the end to make sure
nothing I fixed individually broke something else.

**Search was quietly weaker for four whole subjects.** Art, Music,
Physical Education, and Social Studies are all in the subject list, but
none of them had any of the search-synonym richness every other subject
already had — searching "painting," "sports," "gym," or their Arabic
equivalents would have found nothing, even though the summary itself
might genuinely be about exactly that. Every other subject already had
this. These four now do too, built the same way as the others, in both
languages.

**Found something I'd call data going stale, not a bug exactly, but
worth fixing for the same reason:** every example summary in the
practice data has a fixed date from a specific point in 2025. That's
fine the day it's written, but the site has its own logic for
"recommended" sorting that gives slightly more weight to newer content
and gradually less to older content — and once those fixed 2025 dates
are far enough in the past, every single example summary hits the same
floor at once, and the "recency" part of recommended sorting silently
stops doing anything in the demo data, because everything looks equally
old. Fixed by making every example summary's date relative to whenever
the page actually loads instead of a fixed point in time, while keeping
the exact same order and spacing between them as before — so the
newest-looking one is always the newest one, no matter when you're
reading this.

**A few smaller, real things found by actually cross-checking the data
against itself:** one example summary listed a school type that didn't
actually match the country it was supposedly enrolled in — fixed to
match what every other similar entry already used. Five entries in the
language-preference logic were leftover and could never actually run
(they were checking for countries that get caught by an earlier, correct
rule first) — removed them so the file doesn't quietly suggest a
different answer than what actually happens. And while testing the
follower/membership notification examples I added last round, I confirmed
they render correctly with the actual fix from that same round, end to
end.

I deliberately did not touch a couple of things that looked like gaps at
first glance but turned out to be fine on closer inspection: about 45
example summaries don't have specific reading content written for them,
and they fall back to a sensible, generic placeholder that still
mentions the right subject and grade — writing real content for all 45
would be a huge undertaking for something that already degrades
gracefully. Same reasoning for a smaller set of summaries without
specific engagement numbers — they fall back to a sensible default
score instead of breaking. Neither of those is "wrong," so I left them
as they are rather than manufacture data to fill a gap that isn't
actually causing a problem.

Ran nine consistency checks together at the end — every summary's grade
and school type still matches its country's real list, every reference
between summaries/authors/companies/notifications still points to
something that actually exists, every subject still has a working icon
and real search richness, no broken dates, and the recency scoring
actually produces a healthy spread of values again instead of one
repeated number. All nine passed clean.

---

## The round after that — the notifications tab loading forever

You told me the Notifications tab spins endlessly instead of loading.
Here's what was actually happening, and what I checked before settling
on this as the cause.

The page itself shows a loading spinner the instant you navigate to any
page, then replaces it once that page's content is ready. For the
notifications page to look stuck, something has to be stopping it from
ever reaching the "replace the spinner" step.

I went through every part of this path looking for something that could
hang forever — a slow server, an unindexed database lookup, a network
request with no timeout — and ruled each one out directly: the database
query is properly indexed and capped at 50 results, so it can't be slow;
the part of the server that checks you're signed in either lets you
through or sends back an answer immediately, it can't just sit there;
and every helper function that builds the notification list onscreen
handles missing or unusual data safely.

What I found instead is a timing problem, not a hang: if your sign-in
session has expired right when the notifications page tries to load,
the app correctly tries to send you back to the sign-in screen — but it
does that from the middle of the exact same step that was loading your
notifications, while that step is still technically "in progress." The
old code then quietly swallowed the "your session expired" message and
kept going as if nothing had happened, finishing the notifications page
with stale information and painting it over the sign-in screen that had
just correctly appeared a moment earlier. Depending on timing, the
visible result could look like nothing ever finishes loading.

Fixed in two places: the notifications page now recognizes that specific
"session expired" situation and stops cleanly instead of continuing on
with stale data. And separately — because I don't want this exact shape
of bug to be able to happen on any *other* page either — every page on
the site now has a safety net: if anything goes wrong while a page is
loading, you get a real "something went wrong, go home" message instead
of a spinner that never goes away, no matter which page it happens on.

I rebuilt the exact sequence of events in isolation — an expired session,
the redirect firing while the notifications page is still mid-load, the
old code's behavior versus the new code's behavior — and confirmed
directly that the old version could leave the wrong thing on screen,
and the new version correctly shows the sign-in redirect with nothing
left behind.

If you're still seeing it spin after this, the most useful next thing to
check is whether you're actually signed in to a valid session when it
happens, versus signed out, versus it happening even right after signing
in fresh — that distinction would point at something different from what
I found here.

---

## The round after that — every country now has its own real college/university categories

You asked for the country and education data to be complete — every
country, every system, accurate, researched rather than guessed. Half
the countries in the file (50 of them) were falling back to one generic
list of college subjects instead of their own. All 95 now have a real
one, researched per region rather than copy-pasted.

Where I could find an actual official source, I used it — Nigeria's
real list comes from its National Universities Commission, Bangladesh's
from its National University's own published faculty structure. For
the rest, I confirmed the general pattern for each region (Latin
America's Licenciatura system, Sub-Saharan Africa's Commonwealth/French
university structures, Central Asia's Soviet-legacy faculties, and so
on) against multiple real university websites before writing entries in
that region's real language and real local terms — not English
translations with a costume on.

**A real bug I found and fixed along the way, not something you asked
for but worth knowing:** there were genuinely two separate entries for
Ethiopia sitting in the file — meaning anyone signing up from Ethiopia
would have seen their own country listed twice in the dropdown, with no
way to know which one was the "real" one. Merged the better of the two
and removed the duplicate.

**Something I got wrong mid-task, caught it myself, and want to be
upfront about rather than quietly fix and not mention:** I wrote
Kazakhstan's category list in a language I wasn't fully sure of, then
"corrected" it to Russian to match a different part of the file that
assumes Russian is the main language there — and only after actually
searching did I find solid evidence that's backwards: roughly 70% of
Kazakhstani students take their school-leaving exam in Kazakh, not
Russian. So I reverted it, this time checking the actual words against
real Kazakh university pages rather than my own assumption either way.
Flagging this because it means that *other* part of the file — the one
that decides what language the whole site shows a Kazakhstani visitor
in — might itself be set to the wrong default. I didn't change that,
since it's a bigger decision than what you asked for here, but it's
worth knowing it's there.

**Deliberately left alone:** Argentina's grade structure genuinely
differs by province with no single national standard, and what's
already in the file matches one of the two real systems correctly —
changing it wouldn't make it more accurate, just different. I also
didn't re-research the school-types-and-grades layer for all 50
countries from scratch, since I'd already spot-checked a representative
sample of that layer last round and found it solid; this round's actual
gap, confirmed before I started, was specifically and only the missing
college categories.

Ran a full consistency check at the end covering every country, every
cross-reference between the practice data and itself, and confirmed
zero countries are left on the generic fallback and zero broken
references anywhere.

---

## This round — went looking for anything left unread, found a real bug in how plagiarism detection treats Arabic

You asked me to keep digging. Rather than re-check things I'd already
verified, I specifically went after the parts of the backend I'd never
actually read line by line before — the admin panel's full route file,
the wallet's encryption and payout logic in full, and the
plagiarism-detection engine itself. The last one turned up something
real.

**The actual bug, and it matters:** the function that measures how
similar two pieces of writing are — the one that decides whether a new
upload might be stolen from an existing one — splits text into words
before comparing them. For Arabic text specifically, the way it was
splitting words was wrong in a way that broke it completely: it was
treating every single Arabic letter as if it were a space between
words, instead of as part of the words themselves. The practical result,
which I confirmed by actually running it: two totally unrelated Arabic
summaries — one about chemistry, one about Islamic history — scored a
real, non-trivial similarity to each other, for no reason connected to
their actual content at all. The same comparison done in English
correctly scored zero. Every Arabic-language summary uploaded to this
platform has been getting compared this way.

To be precise about the direction of the mistake, since it matters for
how to think about anything already in your database: this bug could
only ever push a similarity score *up*, never down. So it couldn't have
let real plagiarism slip through undetected — if anything, it's been
making innocent Arabic uploads look more similar to unrelated content
than they actually are, which could mean some past uploads got flagged
or held for review that shouldn't have been. It's fixed now and I
checked it against several real Arabic sentence pairs — identical text
still correctly scores a perfect match, unrelated topics now correctly
score near zero, and genuinely reworded/paraphrased text now shows real,
meaningful similarity instead of an artificial floor.

**Two smaller, real things found while reading the admin and earnings
code closely:**

- A setting called "creator share percent" was still sitting in three
  places — the database seed, the admin settings panel, and the earnings
  page's display data — left over from before the Earnings/Wallet fix
  from a few rounds ago. It had no actual effect on anything anymore;
  the real calculation only uses the tiered version. Nothing on the
  actual site was displaying it, so nobody was being shown a wrong
  number, but it was exactly the kind of dead, disconnected setting that
  becomes a real problem the moment someone builds something around it
  without checking first. Removed it everywhere.
- Five places in the admin panel's code were re-importing things that
  were already available at the top of the file. Not a bug exactly —
  Node is smart enough to not actually redo the work — but it's the
  kind of thing that makes code look like something subtle is happening
  when nothing is. Cleaned up.

I also went through the wallet's withdrawal logic specifically looking
for a way someone could submit two withdrawal requests fast enough to
get paid twice before the first one registered — confirmed that's not
possible here, the database library this uses runs everything one
statement at a time with nothing else able to interrupt it, so there's
no gap for that to happen in. And I checked the username-watermarking
system (the thing that traces a stolen summary back to who copied it)
end to end with real round-trip tests — found and fixed one inconsistency
there too: it was trimming usernames to 30 characters on the way in but
only ever accepting up to 20 characters on the way out, so anything
21-30 characters long would silently fail to ever be traced. Can't
currently happen with real usernames since this site only allows up to
20 characters at signup anyway, but it's exactly the kind of mismatch
that breaks the moment that limit ever changes in one place and not
the other — now both sides read from the same single number.

---

## Previously fixed and added (still true, not redone this round)

- All 17 page URLs are correctly wired to their HTML files on the server.
  No orphaned pages, no missing routes.
- Every script loads in the same order on every page — a fix that applies
  to one page applies to all 17 automatically.
- Scroll position is restored when you press the browser Back button.
- All summary cards and creator links are real anchor tags (`<a href>`)
  rather than just styled boxes, so right-click → "Open in new tab" and
  middle-click work everywhere throughout the feed.
- Summaries load with a real per-summary title and preview image when
  shared on WhatsApp/Telegram/Twitter.
- Creator profiles now also load with a real per-creator title and preview
  image when shared.
- The guest welcome page shows first for anyone who isn't signed in.
  "Browse as Guest" is the explicit choice to enter the feed without an
  account.
- The watermark, plagiarism detection, comments, reports, earnings, and
  wallet features are all fully built on the server and wired up correctly.
  They weren't part of the visible UI work but they're there.

---

## What I could actually test this time, and what's still a sandbox limit

Same limitation as before with the real database driver
(`better-sqlite3`) — it needs to download or compile something from the
internet that my sandbox can't reach, so I still can't run your exact
production setup end-to-end here. That's a restriction on my side, not
a sign of a problem; Railway's own build process already does this
successfully today.

This round I found a way to test much more of the real thing anyway —
Node has its own separate, built-in database engine I can use without
installing anything. I used it to actually run your real, complete,
*unmodified* `db.js` file — not a simplified copy of it, the actual file
— and confirmed all 23 tables get created correctly, the admin account
gets seeded correctly, and the exact lookup my admin-notification fix
uses finds it. I also ran a real adversarial test against the
view-counting fix: same person refreshing rapidly only counts once,
different people count separately, and a genuine return visit after the
12-hour window correctly counts again. None of this was guessed or
assumed — it was actually run and the results checked by hand.

The round before this one was all inside `data.js` itself too, which doesn't
touch a database at all — it's just data and small functions, so I could
run the actual file directly and check its real output, not a
simplified stand-in. Every claim above (the search gap, the stale dates,
the school-type mismatch, the dead language-preference entries) was
something I found by running real checks against the real file, and the
nine-point consistency sweep at the end was run against the file as it
stands now, after every fix, not before.

The all-countries education research round was the same story — pure
data and small functions, no database involved, so I could run the
actual file directly rather than a stand-in. Every specific claim above
(the Ethiopia duplicate, the Kazakhstan correction, the zero-countries-
on-fallback result) came from actually running checks against the real
file, not from reading it and assuming. Where I couldn't independently
verify something against a real source — most countries' day-to-day
university naming beyond the official sources I found — I said so
directly rather than imply a confidence I didn't have.

This latest round mixed both — the watermark and word-similarity bugs
were pure functions with no database involved, so I loaded the actual
file and ran real Arabic and English sentence pairs through it directly,
not a simplified copy. The dead-setting cleanup and the admin-panel
changes did touch the database layer, so I went back to the same real
SQLite engine I used in an earlier round, ran the actual seed function
against it, and confirmed the Earnings and Wallet numbers still agree
with each other afterward, using real INSERT statements against the
real schema rather than assumed data.

After deploying, the three checks from Step 3 above (creator profile
title in the tab, the 404 page for a bad URL, and follow/notifications
persisting after a refresh) are still the fastest way to confirm
everything is working end-to-end on the real, live site.
