# ScoreTable FB1 — Setup

Football + Badminton results site. Stack: static HTML/CSS/JS + Supabase (DB, Auth) + Vercel (hosting) + GitHub (source).

## 1. Supabase project
1. Go to supabase.com → New Project. Name it `scoretablefb1`.
2. Once created: SQL Editor → New Query → paste everything from `schema.sql` in this folder → Run.
3. Authentication → Users → Add User:
   - Email: `Markazbilalpattambi@gmail.com`
   - Password: `FB@passkey123`
   - Auto Confirm User: ON
4. Project Settings → API → copy:
   - Project URL
   - `anon` `public` key

## 2. Plug in the keys
Open `app.js`, top of the file:
```js
const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
```
Replace both with what you copied in step 1.4. Save the file.

## 3. GitHub
1. Create a new repo named `ScoretableFB1` (public or private, your call).
2. GitHub Desktop → clone it to your machine.
3. Copy every file from this folder into that cloned repo folder (`index.html`, `app.js`, `style.css`, `welcome-song.mp3`, `public/404.html`, `schema.sql`, `README.md`).
4. GitHub Desktop → commit → push.

## 4. Vercel
1. vercel.com → Add New → Project → Import the `ScoretableFB1` GitHub repo.
2. Framework Preset: **Other** (it's plain static files — no build command, no output directory needed).
3. Deploy.
4. Project Settings → Domains → your default domain will be `scoretablefb1.vercel.app` (Vercel lowercases it automatically — that's normal, URLs aren't case-sensitive anyway).

## How it works day-to-day
- **Admin login**: tap the "ScoreTable" title in the top-left **3 times quickly**. Login with the email/password from step 1.3.
- Once logged in, a **📊 Dashboard** button appears in the top bar — tap it anytime to jump back into admin.
- Switch between **⚽ Football** and **🏸 Badminton** using the pill tabs — every admin action (add team, schedule match, enter score) applies to whichever sport tab is currently selected.
- Football scores: single number per side, same as before.
- Badminton scores: enter Game 1 and Game 2; only fill Game 3 if the match is split 1–1 after two games. The app works out the winner automatically.

## What's different from the old Firebase site
- Two independent tournaments (Football, Badminton) — separate teams, tables, and match lists, same site.
- Admin login is now hidden behind a 3-tap gesture instead of a lock icon, and there's a persistent Dashboard button once logged in.
- Everything else (round structure, match scheduling, live standings) works the same way you're used to.
