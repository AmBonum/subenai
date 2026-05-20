import { useEffect } from "react";
import { toast } from "sonner";

import { consumeSignedOutFlash } from "@/lib/auth/signout-flash";
import { tFor } from "@/i18n/marketing";

export function SignedOutFlash() {
  const t = tFor("header");
  useEffect(() => {
    if (consumeSignedOutFlash()) {
      toast.success(t("user_menu.signed_out_toast"));
    }
  }, [t]);
  return null;
}
