import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { Layer3D, Scene3D, Shadow3D, type SceneProps } from "./Scene3D";

const SHEET =
  "aspect-[210/297] rounded-[1.2cqw] border border-border bg-card p-[3cqw] text-card-foreground shadow-[0_24px_50px_-24px_color-mix(in_oklab,var(--foreground)_50%,transparent)]";

function Lines({ widths }: { widths: string[] }) {
  return (
    <div className="space-y-[1.4cqw]">
      {widths.map((w, i) => (
        <div
          key={i}
          className="h-[1.2cqw] rounded-full bg-muted-foreground/20"
          style={{ width: w }}
        />
      ))}
    </div>
  );
}

export function EvidenceReport3D({ caption, className }: SceneProps) {
  return (
    <Scene3D
      caption={caption}
      pose={{ x: 14, y: -16 }}
      className={cn("aspect-[5/4] max-w-[34rem]", className)}
      data-testid="scene3d-evidence-report"
    >
      <Shadow3D className="bottom-[3%] left-[14%] h-[14%] w-[70%]" />
      <Layer3D className={cn(SHEET, "left-[12%] top-[10%] w-[36%]")} transform="rotateZ(-11deg)">
        <Lines widths={["60%", "85%", "70%", "80%", "50%"]} />
      </Layer3D>
      <Layer3D
        depth={40}
        className={cn(SHEET, "left-[24%] top-[4%] w-[38%]")}
        transform="rotateZ(-3deg)"
      >
        <div className="h-[1.6cqw] w-[40%] rounded-full bg-primary" />
        <p className="mt-[2cqw] text-[2.6cqw] font-bold leading-tight">Doklad o preškolení</p>
        <div className="mt-[2.5cqw] space-y-[1.6cqw]">
          {[78, 64, 90, 71].map((w) => (
            <div key={w} className="flex items-center gap-[1.2cqw]">
              <span className="grid size-[2.4cqw] place-items-center rounded-full bg-success/20 text-success">
                <Check className="size-[1.8cqw]" strokeWidth={3} />
              </span>
              <span
                className="h-[1.2cqw] rounded-full bg-muted-foreground/25"
                style={{ width: `${w}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-[3cqw]">
          <Lines widths={["90%", "65%"]} />
        </div>
      </Layer3D>
      <Layer3D
        depth={95}
        float
        className={cn(
          SHEET,
          "left-[50%] top-[14%] w-[36%] border-[0.6cqw] border-double border-primary",
        )}
        transform="rotateZ(7deg)"
      >
        <p className="text-center text-[2.4cqw] font-bold uppercase tracking-widest text-muted-foreground">
          Certifikát
        </p>
        <div className="mx-auto mt-[2.5cqw] h-[1.4cqw] w-[70%] rounded-full bg-foreground/70" />
        <div className="mt-[2.5cqw]">
          <Lines widths={["100%", "80%", "90%"]} />
        </div>
        <div
          data-testid="scene3d-evidence-report-seal"
          className="mx-auto mt-[4cqw] grid size-[11cqw] place-items-center rounded-full bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[0_0_0_1cqw_color-mix(in_oklab,var(--primary)_25%,transparent)]"
        >
          <Check className="size-[6cqw]" strokeWidth={3} />
        </div>
      </Layer3D>
    </Scene3D>
  );
}
