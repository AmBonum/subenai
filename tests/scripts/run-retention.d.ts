// Ambient declaration for the untyped .mjs retention runner so
// tests/scripts/run-retention.test.ts type-checks under the main
// tsconfig (scripts/** is not part of the TS project).
declare module "*/run-retention.mjs" {
  export function main(deps?: { createClient: unknown }): Promise<number>;
}
