import { tFor } from "@/i18n/quiz";

interface Props {
  account: string;
  verified?: boolean;
  body: string;
  cta?: string;
  imageEmoji?: string;
  price?: string;
}

/** Instagram sponsored post screenshot */
export function InstagramAd({ account, verified, body, cta, imageEmoji = "📦", price }: Props) {
  const t = tFor("screenshots");
  const resolvedCta = cta ?? t("ig_cta_default");
  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-border/40 bg-black text-white shadow-card">
      {/* header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-500 via-orange-400 to-yellow-400 p-[2px]">
          <div className="h-full w-full rounded-full bg-zinc-800" />
        </div>
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1 text-[12px] font-semibold">
            {account}
            {verified && <span className="text-blue-400">✓</span>}
          </div>
          <div className="text-[10px] text-white/60">{t("ig_sponsored")}</div>
        </div>
        <div className="ml-auto text-white/60">⋯</div>
      </div>
      {/* image */}
      <div className="flex aspect-square items-center justify-center bg-gradient-to-br from-zinc-800 via-zinc-900 to-black text-7xl">
        {imageEmoji}
        {price && (
          <div className="absolute right-3 mt-3 rounded-md bg-red-600 px-2 py-1 text-[11px] font-bold">
            {price}
          </div>
        )}
      </div>
      {/* CTA strip */}
      <div className="flex items-center justify-between border-y border-white/10 bg-zinc-900 px-3 py-2 text-[12px]">
        <span className="font-semibold">{resolvedCta}</span>
        <span className="text-white/60">›</span>
      </div>
      {/* caption */}
      <div className="px-3 py-2.5 text-[12px] leading-snug">
        <span className="font-semibold">{account}</span> {body}
      </div>
    </div>
  );
}
