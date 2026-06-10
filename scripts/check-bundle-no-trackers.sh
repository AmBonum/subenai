#!/usr/bin/env bash
# E6.1 — Defense-in-depth audit. The social share grid is a deliberate "no
# 3rd-party SDK" implementation: every button calls window.open() against the
# platform's own share URL. Nothing should ever pull a tracking pixel into
# our bundle. This script enforces that invariant by grepping the built
# output for known tracker domains. Fail (exit 1) on any hit so CI catches
# accidental imports of e.g. `facebook-sdk`, `react-twitter-widgets`, etc.

set -euo pipefail

DIST_DIR="${1:-dist}"

if [[ ! -d "$DIST_DIR" ]]; then
  echo "✗ dist directory not found at: $DIST_DIR" >&2
  echo "  Run \`npm run build\` first." >&2
  exit 2
fi

# Domains that, if present in the bundle, mean a tracker SDK has been pulled
# in. Pure share-intent URLs (e.g. `facebook.com/sharer/sharer.php`) are OK
# because they are *strings used by window.open*, not script sources — they
# match the domain `facebook.com` but NOT any of the suffixes below.
# NOTE: googletagmanager.com / google-analytics.com are deliberately absent —
# GA4 ships via index.html with Consent Mode v2 defaults=denied and a consent
# manager (documented in /cookies + /privacy). That is a product decision,
# not an accidental SDK import.
PATTERNS=(
  "connect\.facebook\.net"
  "facebook\.net/en_US"
  "platform\.twitter\.com"
  "static\.ads-twitter\.com"
  "analytics\.tiktok\.com"
  "static\.hotjar\.com"
  "cdn\.mixpanel\.com"
  "cdn\.segment\.com"
)

found=0
for pattern in "${PATTERNS[@]}"; do
  if grep -rE "$pattern" "$DIST_DIR" >/dev/null 2>&1; then
    echo "✗ Tracker pattern found in $DIST_DIR: $pattern" >&2
    grep -rE "$pattern" "$DIST_DIR" | head -3 >&2
    found=1
  fi
done

if [[ $found -ne 0 ]]; then
  echo "" >&2
  echo "✗ Bundle contains tracker SDK code. Reject merge." >&2
  exit 1
fi

# E10.4 — secret leak guard. The Stripe SECRET key, Stripe webhook secret,
# Supabase service-role key and Resend API key MUST NEVER appear in the
# client bundle. They live exclusively in Cloudflare Pages env vars and
# are read by `functions/api/*` (server-only). This grep catches accidental
# `import` of a server module from a client component.
SECRET_PATTERNS=(
  "sk_live_"               # Stripe live secret
  "sk_test_[A-Za-z0-9]{8,}" # Stripe test secret (10+ chars to avoid string false-positives)
  "whsec_"                  # Stripe webhook signing secret
  "service_role"            # Supabase service role JWT prefix word
  "RESEND_API_KEY"          # If the literal env name leaks, the value is one ref away
  "SUPABASE_SERVICE_ROLE"   # Same idea
)

CLIENT_DIR="$DIST_DIR/client"
[[ -d "$CLIENT_DIR" ]] || CLIENT_DIR="$DIST_DIR"

secret_found=0
for pattern in "${SECRET_PATTERNS[@]}"; do
  if grep -rE "$pattern" "$CLIENT_DIR" >/dev/null 2>&1; then
    echo "✗ Secret pattern found in client bundle: $pattern" >&2
    grep -rE "$pattern" "$CLIENT_DIR" | head -3 >&2
    secret_found=1
  fi
done

if [[ $secret_found -ne 0 ]]; then
  echo "" >&2
  echo "✗ Server-only secret reference detected in client bundle. Reject merge." >&2
  exit 1
fi

echo "✓ No tracker SDKs in $DIST_DIR — share grid is GDPR-clean."
echo "✓ No server-only secrets leaked into client bundle."
