// E66 — copy for the B2B plans, billing, training-evidence and verification
// screens. Slovak only: the paid offer targets Slovak organisations; other
// locales fall back to sk through the resolver.
import sk from "./locales/sk/billing.json";
import { createResolver } from "./_create-resolver";

export const tFor = createResolver({ sk, loaders: {} });
