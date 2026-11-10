# Pint Log

Tap-to-log drink tracker. Each person signs in with their email and a password and sees only their own drinks, units, spend and reports.

- **Frontend:** Vite + vanilla JS, hosted on Vercel
- **Sign-in and database:** Supabase (email + password, Postgres with Row Level Security)

## 1. Supabase

Already done: the **pint-log** project (London, `dpxrzxyvisfxomauhlxp`) exists with the `drinks` table and privacy rules from `supabase/schema.sql`. The project URL and anon key are in `.env`.

Sign-in needs no emails. A person's first sign-in calls the `pl_register` database function, which creates their account with the password they picked; after that it's a normal Supabase password sign-in. Nothing needs setting in the Supabase dashboard.

**Forgotten password:** there's no reset email. Clear it in Supabase (**SQL Editor**):

```sql
update auth.users set encrypted_password = '' where email = 'their@email.com';
```

Their next sign-in then sets a new password. Their drinks are kept.

## 2. Deploy to Vercel

1. Push this folder to a new GitHub repo.
2. In Vercel: **Add New → Project → Import** the repo. Framework preset is detected as Vite.
3. Click **Deploy**. No environment variables are needed: the Supabase project URL and public key are built into `src/main.js`. (Setting `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` overrides them if you ever switch projects.)

Or from a terminal with the Vercel CLI:

```bash
npm i -g vercel
vercel                       # link and create the project
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel --prod
```

## 3. Share it

Send people the link. They enter their email, pick a password, and start logging. On iPhone, Safari → Share → **Add to Home Screen** makes it open like an app.

## Run locally

```bash
cp .env.example .env    # fill in the two values
npm install
npm run dev             # http://localhost:5173
```

## How the numbers work

- **Units** = ml × ABV% ÷ 1000 (the UK standard), to one decimal place.
- A **night** runs 5am to 5am, so a 1am pint counts towards the evening before.
- **Weeks** start on Monday. The weekly chart shows the UK 14-unit guideline.
- **Price** for a quick-tap drink defaults to what you last paid for the same drink.

## Who can see what

Row Level Security on the `drinks` table means each signed-in person can only read, add, edit and delete their own rows, even though everyone shares one database. The anon key is safe to ship in the browser because of these rules. Anyone with the link can create an account; to restrict sign-ups, turn off **Allow new users to sign up** in Supabase and invite people from **Authentication → Users → Invite user**.

## Default prices (London, November 2026)

A quick-tap drink uses the price you last paid for that drink. Until you've logged one with a price, it uses a typical London pub price, rounded to the nearest 5p:

| Drink | Price | Based on |
|---|---|---|
| Lager (pint) | £6.40 | Median of 1,022 London pub prices |
| Ale / bitter (pint) | £5.70 | Median of 68 |
| IPA (pint) | £7.40 | Median of 185 (mostly Neck Oil and hazy IPAs) |
| Guinness (pint) | £6.40 | Median of 241 |
| Cider (pint) | £6.65 | Median of 82 |
| Alcohol-free (pint) | £6.60 | Median of 12 (small sample) |
| Half | £3.40 | Estimate: halves cost about 53% of the pint price on London menus |
| Bottle / can 330ml | £5.95 | Median of 2026 London pub menus |
| Wine 175ml (house) | £9.05 | Median of 2026 London pub menus |
| Wine 250ml (house) | £10.85 | Median of 2026 London pub menus |
| Prosecco 125ml | £9.70 | Median of 2026 London pub menus |
| Spirit single 25ml | £5.75 | 2026 London pub menus, mixer not included |
| Spirit double 50ml | £11.50 | Estimate: twice the single |
| Cocktail | £11.95 | Median of 2026 London pub menus |

Pint prices come from the crowdsourced listings on pint-prices.com (inner London boroughs, deduplicated). The others come from a handful of 2026 London pub and bar menus, so treat them as rough.
