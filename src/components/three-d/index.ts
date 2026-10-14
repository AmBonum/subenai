import type { ComponentType } from "react";

import type { Scene3DName } from "@/lib/docs/doc-body";
import { CampaignFlow3D } from "./CampaignFlow3D";
import { EvidenceReport3D } from "./EvidenceReport3D";
import { ScamPhone3D } from "./ScamPhone3D";
import type { SceneProps } from "./Scene3D";
import { ShieldStack3D } from "./ShieldStack3D";

export { Layer3D, Scene3D, Shadow3D, type Scene3DProps, type SceneProps } from "./Scene3D";
export { CampaignFlow3D, EvidenceReport3D, ScamPhone3D, ShieldStack3D };

export const SCENES_3D: Record<Scene3DName, ComponentType<SceneProps>> = {
  "scam-phone": ScamPhone3D,
  "evidence-report": EvidenceReport3D,
  "campaign-flow": CampaignFlow3D,
  "shield-stack": ShieldStack3D,
};
