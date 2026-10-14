import { FileCheck2, LayoutTemplate, Link2, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Layer3D, Scene3D, Shadow3D, type SceneProps } from "./Scene3D";

interface Step {
  icon: LucideIcon;
  title: string;
  hint: string;
  left: string;
  top: string;
  depth: number;
}

const STEPS: Step[] = [
  {
    icon: LayoutTemplate,
    title: "Šablóna",
    hint: "Reálny prípad",
    left: "3%",
    top: "22%",
    depth: 20,
  },
  {
    icon: Link2,
    title: "Odkaz respondentom",
    hint: "Link alebo e-mail",
    left: "36%",
    top: "8%",
    depth: 60,
  },
  {
    icon: FileCheck2,
    title: "Doklad",
    hint: "Výsledky a PDF",
    left: "69%",
    top: "22%",
    depth: 100,
  },
];

export function CampaignFlow3D({ caption, className }: SceneProps) {
  return (
    <Scene3D
      caption={caption}
      pose={{ x: 16, y: -12 }}
      className={cn("aspect-[2/1] max-w-[42rem]", className)}
      data-testid="scene3d-campaign-flow"
    >
      <Shadow3D className="bottom-[6%] left-[6%] h-[18%] w-[88%]" />
      <Layer3D
        depth={10}
        className="left-[14%] top-[48%] w-[72%] border-t-[0.4cqw] border-dashed border-primary/60"
      />
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        return (
          <Layer3D
            key={step.title}
            depth={step.depth}
            float
            delay={i * 1.6}
            className="w-[28%] rounded-[2cqw] border border-border bg-card p-[2cqw] text-card-foreground shadow-[0_22px_44px_-22px_color-mix(in_oklab,var(--foreground)_50%,transparent)]"
            style={{ left: step.left, top: step.top }}
          >
            <div data-testid={`scene3d-campaign-flow-step-${i + 1}`}>
              <div className="flex items-center justify-between">
                <span className="grid size-[6cqw] place-items-center rounded-[1.6cqw] bg-primary/15 text-primary">
                  <Icon className="size-[3.4cqw]" />
                </span>
                <span className="text-[2.6cqw] font-black text-muted-foreground/60">{i + 1}</span>
              </div>
              <p className="mt-[1.6cqw] text-[2.3cqw] font-bold leading-tight">{step.title}</p>
              <p className="mt-[0.6cqw] text-[1.9cqw] leading-tight text-muted-foreground">
                {step.hint}
              </p>
            </div>
          </Layer3D>
        );
      })}
    </Scene3D>
  );
}
