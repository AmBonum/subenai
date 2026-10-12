import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { Layer3D, Scene3D, Shadow3D, type SceneProps } from "./Scene3D";

const SHIELD_PATH = "M50 4 10 18v28c0 24 17 42 40 50 23-8 40-26 40-50V18Z";

const LAYERS = [
  { depth: 0, fill: "color-mix(in oklab, var(--primary) 18%, transparent)", stroke: "none" },
  { depth: 35, fill: "color-mix(in oklab, var(--primary) 38%, transparent)", stroke: "none" },
  { depth: 75, fill: "var(--card)", stroke: "var(--primary)" },
];

export function ShieldStack3D({ caption, className }: SceneProps) {
  return (
    <Scene3D
      caption={caption}
      pose={{ x: 8, y: -26 }}
      className={cn("aspect-square max-w-[20rem]", className)}
      data-testid="scene3d-shield-stack"
    >
      <Shadow3D className="bottom-[4%] left-[22%] h-[14%] w-[56%]" />
      {LAYERS.map((layer, i) => {
        const front = i === LAYERS.length - 1;
        return (
          <Layer3D
            key={layer.depth}
            depth={layer.depth}
            float={front}
            className="left-[20%] top-[8%] h-[80%] w-[60%]"
          >
            <svg viewBox="0 0 100 100" className="size-full overflow-visible">
              <path
                d={SHIELD_PATH}
                fill={layer.fill}
                stroke={layer.stroke}
                strokeWidth={front ? 4 : 0}
                strokeLinejoin="round"
              />
            </svg>
            {front ? (
              <span
                data-testid="scene3d-shield-stack-check"
                className="absolute left-1/2 top-[46%] grid size-[34%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[image:var(--gradient-primary)] text-primary-foreground"
              >
                <Check className="size-[60%]" strokeWidth={3} />
              </span>
            ) : null}
          </Layer3D>
        );
      })}
    </Scene3D>
  );
}
