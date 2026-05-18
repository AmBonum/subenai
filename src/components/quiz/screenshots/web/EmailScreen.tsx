import { tFor } from "@/i18n/quiz";

interface Props {
  from: string;
  fromEmail: string;
  subject: string;
  body: string;
  cta?: string;
}

/** Gmail-style email screenshot */
export function EmailScreen({ from, fromEmail, subject, body, cta }: Props) {
  const t = tFor("screenshots");
  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-xl border border-border/60 bg-white text-zinc-900 shadow-card">
      {/* toolbar */}
      <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] text-zinc-500">
        <span className="font-semibold text-red-500">M</span>
        <span>{t("email_inbox")}</span>
      </div>
      <div className="px-4 py-4">
        <div className="text-[15px] font-semibold leading-tight">{subject}</div>
        <div className="mt-3 flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-300 text-xs font-bold text-zinc-700">
            {from[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 text-[12px]">
              <span className="font-semibold text-zinc-900">{from}</span>
              <span className="truncate text-zinc-500">&lt;{fromEmail}&gt;</span>
            </div>
            <div className="text-[11px] text-zinc-500">{t("email_to_me")}</div>
          </div>
        </div>
        <div className="mt-4 whitespace-pre-line text-[13px] leading-relaxed text-zinc-800">
          {body}
        </div>
        {cta && (
          <button
            disabled
            className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white"
          >
            {cta}
          </button>
        )}
      </div>
    </div>
  );
}
