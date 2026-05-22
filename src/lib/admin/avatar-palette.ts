// E48-v3 PR-QUEUE-EXTEND — deterministic avatar colour assignment.
//
// We avoid persistent storage and per-user colour config: the same
// `user_id` always maps to the same swatch via FNV-1a hash → modulo
// over a fixed 6-entry palette. The palette is tuned so every swatch
// passes WCAG AA against white initials at the 20px size used in the
// queue's stacked avatars; dark-mode variants share the same swatch
// index so the row keeps a consistent identity across themes.

export interface AvatarSwatch {
  /** Background colour class (light + dark). */
  bg: string;
  /** Foreground (initials) colour class. */
  fg: string;
  /** Ring colour used by the +N overflow chip's outline accent. */
  ring: string;
}

export const AVATAR_PALETTE: readonly AvatarSwatch[] = [
  {
    bg: "bg-sky-500 dark:bg-sky-600",
    fg: "text-sky-50",
    ring: "ring-sky-300/60",
  },
  {
    bg: "bg-emerald-500 dark:bg-emerald-600",
    fg: "text-emerald-50",
    ring: "ring-emerald-300/60",
  },
  {
    bg: "bg-amber-500 dark:bg-amber-600",
    fg: "text-amber-50",
    ring: "ring-amber-300/60",
  },
  {
    bg: "bg-rose-500 dark:bg-rose-600",
    fg: "text-rose-50",
    ring: "ring-rose-300/60",
  },
  {
    bg: "bg-violet-500 dark:bg-violet-600",
    fg: "text-violet-50",
    ring: "ring-violet-300/60",
  },
  {
    bg: "bg-teal-500 dark:bg-teal-600",
    fg: "text-teal-50",
    ring: "ring-teal-300/60",
  },
];

// FNV-1a 32-bit — small, fast, no allocations, well-distributed across
// short input strings like UUIDs. Same input → same hash, every time.
function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

export function paletteIndexFor(userId: string): number {
  return fnv1a(userId) % AVATAR_PALETTE.length;
}

export function avatarSwatch(userId: string): AvatarSwatch {
  return AVATAR_PALETTE[paletteIndexFor(userId)];
}

// Two-character initials from a display name (or, as a fallback, the
// part of the email before `@`). Strips leading whitespace, skips
// punctuation, and uppercases to match the visual rhythm of the queue.
export function initialsOf(displayName: string | null | undefined, email?: string): string {
  const source = (displayName ?? "").trim() || (email ?? "").split("@")[0] || "?";
  const words = source.split(/[\s.\-_]+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ""}${words[words.length - 1][0] ?? ""}`.toUpperCase();
}
