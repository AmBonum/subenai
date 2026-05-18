# subenai

> Test your scam-detection skills and see how internet-smart you really are.

subenai is an interactive web app that teaches people how to recognize online scams — and lets them test their real-world awareness in a fast, fun, and shareable way.

---

## 🚀 What is subenai?

Every day, people fall for:
- phishing emails and fake URLs
- scam SMS messages
- fraudulent e-shops
- social engineering attacks

subenai helps you:
- learn how these scams work
- recognize warning signs
- test your ability to detect them

All in just a few minutes.

---

## 🧠 How it works

### 🎓 Learn
Short, practical lessons with real-world examples:
- phishing URLs
- scam messages
- fake websites
- manipulation techniques

---

### 🧪 Test
Take a quick interactive quiz:
- real-life scenarios
- simple decisions (safe vs scam)
- no technical knowledge required

---

### 📊 Results
Get a personalized breakdown:
- your score
- what you got right/wrong
- explanations for each answer

Plus a fun rating like:
- 🟢 Internet Ninja  
- 🟡 Careful User  
- 🔴 Scam Magnet 😄  

---

### 🔗 Share
Challenge your friends:

> “I scored 82 on subenai — can you beat me?”

---

## 🎯 Who is this for?

- everyday internet users
- students
- parents and families
- non-technical users
- anyone who wants to avoid scams

---

## 💡 Why this matters

Online scams are increasing — and most people are not prepared.

subenai focuses on:
- practical awareness (not theory)
- real-world scenarios
- fast learning through interaction

The goal is simple:

> Help people avoid getting scammed.

---

## 🧑‍💻 Local development

The app is split into a Vite SPA (`src/`) and Cloudflare Pages Functions (`functions/`). Vite alone cannot serve `/api/*` — those run inside the CF runtime.

**Two-terminal workflow:**

```bash
# Terminal 1 — start the API server (rebuilds + wrangler on :8788)
npm run dev:api

# Terminal 2 — start Vite (HMR + UI on :8080, proxies /api/* to :8788)
npm run dev
```

Then open **http://localhost:8080**.

`/api/*` calls from the browser are auto-proxied to wrangler — you get hot-reload for the UI and a real CF runtime for functions, with secrets read from `.dev.vars` (gitignored). When you change a function file, restart Terminal 1 (no HMR for functions).

If you only need the UI (no edu / Stripe / portal flows), `npm run dev` alone works fine — `/api/*` calls will return 504 from the proxy.

**Quick start (UI-only):**

```bash
npm install
cp .env.example .env  # fill in SUPABASE_URL + anon key
npm run dev
```

## ✅ Verification

Every change must keep these green before it ships:

```bash
npm run lint               # 0 errors / 0 warnings
npm test                   # Vitest + RTL — full suite
npm run build              # Cloudflare Pages SSR bundle
npm run check:bundle-no-mocks  # asserts no admin-hub mock-store leaked into prod bundle
```

Current test count: **749** (must not regress).

## 🚢 Production deployment

- Hosted on **Cloudflare Pages**, auto-deployed on every push to `main`
  (production domain: `subenai.sk`). Feature branches get preview deploys.
- Supabase backend (free tier). Bootstrap a fresh project with
  [`DEPLOY_SETUP.sql`](./DEPLOY_SETUP.sql) — see the file header for
  step-by-step instructions and post-apply tasks (enable TOTP, wire
  `SUPABASE_SERVICE_ROLE_KEY` in CF Pages env, promote first admin).
- **2FA is enforced for the `admin` role** (see AH-12). Bootstrap admin
  must enroll TOTP on first login before write actions unlock.
- End-to-end production checks live in
  [`tasks/AH-11-production-runbook.md`](./tasks/AH-11-production-runbook.md).

## 🛠️ Project status

🚧 Early-stage project — actively being developed

Planned:
- more scam scenarios
- smarter evaluation
- improved explanations
- localization (multiple languages)
- mobile-friendly experience

---

## 🤝 Contributing

You can help improve subenai by:

- suggesting new scam scenarios
- improving explanations
- reporting issues
- sharing feedback and ideas

For collaborations or partnerships, please contact the author.

---

## ❤️ Support this project

If you find this project useful, consider sponsoring its development.

Your support helps:
- keep the app free and accessible
- add new learning content
- improve scam detection scenarios
- reach more people

👉 https://github.com/sponsors/YOUR_USERNAME

---

## 🌍 Vision

subenai aims to make basic digital safety knowledge accessible to everyone — not just technical users.

Because avoiding scams shouldn’t require expert knowledge.

---

## 📄 License

MIT
