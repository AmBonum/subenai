# Sponsorship e2e tests — local run instructions

These tests run against real Stripe test mode and require three terminals.

## Before you start

1. Ensure `.dev.vars` in the project root contains:

   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   SUPABASE_URL=https://...supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```

   The `STRIPE_WEBHOOK_SECRET` value is printed by `stripe listen` at startup (step 1 below). You must paste it into `.dev.vars` **before** starting wrangler (step 2), because wrangler reads `.dev.vars` at boot only.

## Three-terminal sequence

**Terminal 1 — Stripe CLI webhook forwarding:**

```bash
stripe listen --forward-to http://localhost:8788/api/stripe-webhook
```

Copy the `whsec_...` secret it prints and paste it as `STRIPE_WEBHOOK_SECRET` in `.dev.vars`.

**Terminal 2 — Wrangler pages dev (app + API functions):**

```bash
npm run dev:api
```

Wrangler builds the app and serves it at `http://localhost:8788`. Both the React SPA and `/api/*` Cloudflare Functions run here.

**Terminal 3 — Run the suite:**

```bash
npm run e2e:stripe
```

The `e2e:stripe` script (in `package.json`) sets `STRIPE_E2E_BASE_URL=http://localhost:8788` and runs both `e2e/integration/webhooks` and `e2e/specs/sponsorship/`.

## Notes

- Stripe Checkout is a live third-party hosted page. The `StripeCheckoutPage` POM (`e2e/poms/external/StripeCheckoutPage.ts`) uses a locator fallback chain so it adapts when Stripe's DOM changes.
- TC-15 and TC-13 use a temporary `page.route` mock for `/api/donation-status` to make timing deterministic. All other TCs use the real backend.
- TC-03 (monthly subscription) budgets 45 seconds for the `invoice.paid` webhook to arrive.
- TC-19 (concurrent contexts) budgets 180 seconds total for both contexts to complete.
