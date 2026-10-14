import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import {
  Scene3DMotionContext,
  hasFinePointer,
  useReducedMotion,
  useScene3DAnimate,
} from "./use-scene3d-motion";

/** Public props shared by every ready-made scene. */
export interface SceneProps {
  caption?: string;
  className?: string;
}

export interface Scene3DProps {
  children: ReactNode;
  /** Visually hidden description; omit for purely decorative scenes. */
  caption?: string;
  /** Sizing classes; the scene box keeps its aspect ratio so it never shifts layout. */
  className?: string;
  /** Resting rotation of the rig in degrees. */
  pose?: { x: number; y: number };
  /** Max pointer-tilt in degrees added on top of the pose. */
  maxTilt?: number;
  "data-testid"?: string;
}

export function Scene3D({
  children,
  caption,
  className,
  pose = { x: 12, y: -18 },
  maxTilt = 8,
  "data-testid": testId = "scene3d-root",
}: Scene3DProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const animate = !reduced;

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduced || !hasFinePointer()) return;
    let frame = 0;
    const setTilt = (x: number, y: number) => {
      root.style.setProperty("--s3d-tilt-x", `${x}deg`);
      root.style.setProperty("--s3d-tilt-y", `${y}deg`);
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = root.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;
        setTilt(-py * maxTilt * 2, px * maxTilt * 2);
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(frame);
      setTilt(0, 0);
    };
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced, maxTilt]);

  const style = {
    "--s3d-pose-x": `${pose.x}deg`,
    "--s3d-pose-y": `${pose.y}deg`,
  } as CSSProperties;

  return (
    <div
      ref={rootRef}
      data-testid={testId}
      data-motion={animate ? "on" : "off"}
      className={cn("s3d-root relative w-full select-none @container", className)}
      style={style}
    >
      <div aria-hidden="true" className="s3d-stage absolute inset-0">
        <div className={cn("s3d-rig absolute inset-0", animate && "s3d-rig-animated")}>
          <Scene3DMotionContext.Provider value={{ animate }}>
            {children}
          </Scene3DMotionContext.Provider>
        </div>
      </div>
      {caption ? (
        <p data-testid={`${testId}-caption`} className="sr-only">
          {caption}
        </p>
      ) : null}
    </div>
  );
}

/** Soft contact shadow under the scene's objects. */
export function Shadow3D({ className }: { className?: string }) {
  return (
    <Layer3D
      depth={-30}
      className={cn(
        "rounded-[50%] bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--foreground)_22%,transparent),transparent)]",
        className,
      )}
    />
  );
}

export interface Layer3DProps {
  children?: ReactNode;
  className?: string;
  /** translateZ in px — distance towards the viewer. */
  depth?: number;
  /** Extra transform appended after the depth (e.g. "rotateZ(-6deg)"). */
  transform?: string;
  /** Idle float; ignored when motion is reduced. */
  float?: boolean;
  /** Float phase offset in seconds so layers don't bob in sync. */
  delay?: number;
  style?: CSSProperties;
}

export function Layer3D({
  children,
  className,
  depth = 0,
  transform,
  float = false,
  delay = 0,
  style,
}: Layer3DProps) {
  const animate = useScene3DAnimate();
  const floating = float && animate;
  return (
    <div
      data-s3d-layer=""
      className={cn("s3d-layer absolute", floating && "s3d-float", className)}
      style={{
        transform: `translateZ(${depth}px)${transform ? ` ${transform}` : ""}`,
        ...(floating ? { animationDelay: `${-delay}s` } : null),
        ...style,
      }}
    >
      {children}
    </div>
  );
}
