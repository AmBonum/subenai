import { tFor } from "@/i18n/quiz";

interface Props {
  sender: string;
  time?: string;
  body: string;
  link?: string;
}

/** iOS-style SMS bubble screenshot */
export function SmsScreen({ sender, time, body, link }: Props) {
  const t = tFor("screenshots");
  const resolvedTime = time ?? t("sms_default_time");
  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-[2rem] border border-border/40 bg-[oklch(0.08_0.01_265)] shadow-card">
      {/* status bar */}
      <div className="flex items-center justify-between bg-[oklch(0.12_0.01_265)] px-5 py-2 text-[11px] font-semibold text-white/80">
        <span>9:41</span>
        <span>•••• 5G</span>
      </div>
      {/* header */}
      <div className="flex flex-col items-center border-b border-white/5 bg-[oklch(0.12_0.01_265)] px-4 pb-3 pt-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-zinc-500 to-zinc-700 text-base font-bold text-white">
          {sender[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="mt-1 text-[13px] font-semibold text-white">{sender}</div>
        <div className="text-[10px] text-white/50">{t("sms_label")}</div>
      </div>
      {/* bubble */}
      <div className="space-y-2 bg-[oklch(0.08_0.01_265)] px-4 py-5 min-h-[140px]">
        <div className="text-center text-[10px] uppercase tracking-wider text-white/40">
          {resolvedTime}
        </div>
        <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-[oklch(0.28_0.01_265)] px-4 py-2.5 text-[14px] leading-snug text-white">
          {body}
          {link && <div className="mt-1 break-all text-[13px] text-blue-400 underline">{link}</div>}
        </div>
      </div>
    </div>
  );
}
