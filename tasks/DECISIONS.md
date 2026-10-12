# Decisions log

One line per product / pricing / UX / legal-approach decision: date — decision — reason.

- 2026-10-12 — Retention anonymisation runs in pg_cron, not GitHub Actions — the Actions job never had its secrets and the RPCs had never run; pg_cron keeps the service-role key inside Supabase.
