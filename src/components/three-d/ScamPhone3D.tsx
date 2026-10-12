import { AlertTriangle, CalendarDays, MessageSquare } from "lucide-react";

import { cn } from "@/lib/utils";
import { Layer3D, Scene3D, Shadow3D, type SceneProps } from "./Scene3D";

const CARD =
  "rounded-[2.5cqw] border border-border bg-card/95 p-[2.4cqw] text-[3cqw] leading-tight text-card-foreground shadow-[0_18px_40px_-18px_color-mix(in_oklab,var(--foreground)_45%,transparent)]";

export function ScamPhone3D({ caption, className }: SceneProps) {
  return (
    <Scene3D
      caption={caption}
      pose={{ x: 10, y: -22 }}
      className={cn("aspect-[4/5] max-w-[26rem]", className)}
      data-testid="scene3d-scam-phone"
    >
      <Shadow3D className="bottom-[2%] left-[16%] h-[12%] w-[62%]" />
      <Layer3D className="left-[20%] top-[5%] h-[88%] w-[46%] rounded-[7cqw] border-[0.9cqw] border-foreground/80 bg-background p-[2cqw] shadow-[0_30px_60px_-30px_color-mix(in_oklab,var(--foreground)_55%,transparent)]">
        <div className="mx-auto h-[2.4cqw] w-[30%] rounded-full bg-foreground/80" />
        <div className="mt-[6cqw] space-y-[2.5cqw] px-[1.5cqw]">
          <div className="h-[2.2cqw] w-[70%] rounded-full bg-muted-foreground/30" />
          <div className="h-[2.2cqw] w-[90%] rounded-full bg-muted-foreground/20" />
          <div className="h-[2.2cqw] w-[55%] rounded-full bg-muted-foreground/20" />
          <div className="mt-[6cqw] h-[16cqw] rounded-[3cqw] bg-primary/15" />
          <div className="h-[2.2cqw] w-[80%] rounded-full bg-muted-foreground/20" />
        </div>
      </Layer3D>
      <Layer3D depth={40} float delay={1.5} className={cn(CARD, "left-[42%] top-[12%] w-[50%]")}>
        <p className="flex items-center gap-[1.5cqw] font-semibold">
          <MessageSquare className="size-[3.4cqw] text-muted-foreground" />
          Mama
        </p>
        <p className="mt-[1cqw] text-muted-foreground">Budem doma o šiestej.</p>
      </Layer3D>
      <Layer3D
        depth={110}
        float
        className={cn(
          CARD,
          "left-[30%] top-[36%] w-[62%] border-destructive bg-card ring-[0.6cqw] ring-destructive/25",
        )}
      >
        <div data-testid="scene3d-scam-phone-flagged">
          <p className="flex items-center justify-between gap-[1.5cqw] font-semibold">
            <span>Kuriér SK</span>
            <span className="inline-flex items-center gap-[1cqw] rounded-full bg-destructive px-[1.8cqw] py-[0.6cqw] text-[2.6cqw] font-bold uppercase text-destructive-foreground">
              <AlertTriangle className="size-[2.8cqw]" />
              Podvod
            </span>
          </p>
          <p className="mt-[1cqw]">Balík čaká na doplatok 1,49 €:</p>
          <p className="mt-[0.5cqw] font-mono text-destructive">kurier-sk.info/platba</p>
        </div>
      </Layer3D>
      <Layer3D depth={70} float delay={3} className={cn(CARD, "left-[8%] top-[66%] w-[50%]")}>
        <p className="flex items-center gap-[1.5cqw] font-semibold">
          <CalendarDays className="size-[3.4cqw] text-muted-foreground" />
          Kalendár
        </p>
        <p className="mt-[1cqw] text-muted-foreground">Porada o 10:00</p>
      </Layer3D>
    </Scene3D>
  );
}
