# CreaseTalk — Terminal Cheat Sheet

Commands you’ll use most. Run them from the project folder:

```bash
cd ~/Documents/coding/Crease-Talk
```

Live site: https://creasetalk.netlify.app  
GitHub: https://github.com/N3rdCollective/Crease-Talk  
Supabase project: Crease-Talk (`svtndmrrzjgsyztihyqr`)

---

## Everyday (local)

```bash
npm install          # first time / after pulling dependency changes
npm run dev          # local site → http://localhost:5173
npm run build        # production build check
npm run lint         # lint
```

Stop the dev server: `Ctrl + C`

---

## Commit → Push → Deploy (the usual loop)

**Deploy = push to `main`.** Netlify is linked to GitHub and rebuilds the live site when `main` updates.

### 1. See what changed

```bash
git status
git diff
```

### 2. Stage files

```bash
git add .
```

Or stage specific paths:

```bash
git add src/pages/ShopPage.tsx src/lib/products.ts
```

**Never commit secrets.** Keep `.env` out of git (it’s gitignored).

### 3. Commit

```bash
git commit -m "Short description of why you changed things."
```

Multi-line message (safer for longer notes):

```bash
git commit -m "$(cat <<'EOF'
Add shop product pages and cart.

EOF
)"
```

### 4. Push (this deploys the frontend)

```bash
git push origin main
```

Then wait for Netlify (usually 1–2 minutes). Check: https://app.netlify.com → **creasetalk** → Deploys.

### One-liner after you’re happy with the message

```bash
git add . && git commit -m "Your message here." && git push origin main
```

---

## Manual Netlify deploy (optional)

Only if you need a deploy **without** pushing, or GitHub auto-deploy is down:

```bash
netlify login                 # once
netlify link                  # once — pick creasetalk if asked
netlify deploy --build --prod --message "Manual deploy"
```

Preview (not live):

```bash
netlify deploy --build
```

Status:

```bash
netlify status
netlify open
```

---

## Supabase (database + edge functions)

Frontend deploy ≠ database/functions. If you change SQL migrations or `supabase/functions/*`, push those separately.

### Link (once per machine)

```bash
supabase login
supabase link --project-ref svtndmrrzjgsyztihyqr
```

### Push database migrations

```bash
supabase db push
```

### Deploy one edge function

```bash
supabase functions deploy create-checkout
supabase functions deploy promote-submission
supabase functions deploy spotify-enrich-artist
supabase functions deploy spotify-artist-profile
supabase functions deploy youtube-ingest
```

### Deploy all functions

```bash
supabase functions deploy
```

### Set a function secret (example)

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
```

List secrets (names only):

```bash
supabase secrets list
```

---

## Useful Git commands

```bash
git pull origin main          # get latest from GitHub
git log --oneline -10         # recent commits
git restore path/to/file      # discard local edits to one file
git restore --staged file     # unstage a file (keep edits)
```

Undo last **local** commit (keep files, only if you haven’t pushed):

```bash
git reset --soft HEAD~1
```

---

## Env vars reminder

| Where | What |
|--------|------|
| Local `.env` | `VITE_*` keys for `npm run dev` |
| Netlify site env | Same `VITE_*` for the live build |
| Supabase secrets | Server keys (`STRIPE_SECRET_KEY`, Spotify, Last.fm, etc.) |

After changing Netlify env vars, trigger a new deploy (push an empty commit or **Trigger deploy** in the Netlify UI).

```bash
git commit --allow-empty -m "Trigger Netlify rebuild." && git push origin main
```

---

## Quick “ship it” checklist

1. `npm run build` — build succeeds locally  
2. `git status` — no accidental `.env`  
3. `git add .` → `git commit -m "..."` → `git push origin main`  
4. If you touched SQL: `supabase db push`  
5. If you touched edge functions: `supabase functions deploy <name>`  
6. Open https://creasetalk.netlify.app and smoke-test  

---

## Ask Cursor to do it

In chat you can say:

- “Commit these changes”  
- “Commit and push”  
- “Commit, push, and deploy”  

I’ll run the git/Netlify/Supabase steps for you when you ask.
