import { tFor } from "@/i18n/quiz";

interface Props {
  caller: string;
  number: string;
  hint?: string;
}

/** Incoming call screen (iOS-like) */
export function CallScreen({ caller, number, hint }: Props) {
  const t = tFor("screenshots");
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center overflow-hidden rounded-[2rem] border border-border/40 bg-gradient-to-b from-[oklch(0.18_0.02_265)] to-black px-6 py-10 text-center shadow-card">
      <div className="text-[11px] uppercase tracking-wider text-white/50">{t("call_incoming")}</div>
      <div className="mt-4 text-[22px] font-semibold text-white">{caller}</div>
      <div className="mt-1 font-mono text-[13px] text-white/60">{number}</div>
      {hint && <div className="mt-2 text-[11px] text-white/40">{hint}</div>}
      <div className="mt-8 flex w-full justify-around">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-2xl">
          📵
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-2xl">
          📞
        </div>
      </div>
    </div>
  );
}
