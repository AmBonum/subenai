import { tFor } from "@/i18n/quiz";

interface Props {
  site: string; // Bazoš, Bazár.sk
  title: string;
  price: string;
  location?: string;
  description: string;
  imageEmoji?: string;
}

/** Bazos-style classifieds listing screenshot */
export function AdListing({ site, title, price, location, description, imageEmoji = "📷" }: Props) {
  const t = tFor("screenshots");
  const resolvedLocation = location ?? t("ad_listing_city");
  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-xl border border-border/60 bg-white text-zinc-900 shadow-card">
      <div className="flex items-center justify-between border-b border-zinc-200 bg-[oklch(0.95_0.05_140)] px-3 py-2 text-[11px] font-bold text-zinc-700">
        <span>{site}.sk</span>
        <span className="text-zinc-500">{t("ad_listing_tag")}</span>
      </div>
      <div className="flex aspect-[4/3] items-center justify-center bg-zinc-100 text-7xl">
        {imageEmoji}
      </div>
      <div className="px-4 py-3">
        <div className="text-[15px] font-bold leading-tight">{title}</div>
        <div className="mt-1 text-[18px] font-black text-emerald-600">{price}</div>
        <div className="mt-1 text-[11px] text-zinc-500">📍 {resolvedLocation}</div>
        <div className="mt-3 whitespace-pre-line text-[12px] leading-relaxed text-zinc-700">
          {description}
        </div>
      </div>
    </div>
  );
}
