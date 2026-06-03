import type { IncidentSpecialty } from "./incidents.ts";

export type InternLevel = "Junior" | "Mid" | "Staff";

export interface InternDef {
  id: string;
  name: string;
  role: string;
  specialty: IncidentSpecialty[];
  hireCost: number;
  sideEffectChance: number; // base, reduced per level
  resolutionTicks: number;  // base ticks to resolve, reduced per level
}

export interface HiredIntern {
  defId: string;
  level: InternLevel;
  busy: boolean;
}

export const INTERN_LEVEL_UPGRADE_COST: Record<InternLevel, number> = {
  Junior: 0,
  Mid: 5000,
  Staff: 50000,
};

export const INTERN_LEVEL_MULTIPLIERS: Record<InternLevel, { speed: number; sideEffect: number }> = {
  Junior: { speed: 1.0, sideEffect: 1.0 },
  Mid:    { speed: 0.7, sideEffect: 0.6 },
  Staff:  { speed: 0.4, sideEffect: 0.25 },
};

export const INTERNS: InternDef[] = [
  {
    id: "chad",
    name: "Chad",
    role: "Cloud Ops",
    specialty: ["ec2"],
    hireCost: 500,
    sideEffectChance: 0.1,
    resolutionTicks: 80,
  },
  {
    id: "priya",
    name: "Priya",
    role: "Security",
    specialty: ["s3", "iam"],
    hireCost: 750,
    sideEffectChance: 0.15,
    resolutionTicks: 70,
  },
  {
    id: "kevin",
    name: "Kevin",
    role: "Backend",
    specialty: ["database"],
    hireCost: 600,
    sideEffectChance: 0.25,
    resolutionTicks: 100,
  },
  {
    id: "mackenzie",
    name: "Mackenzie",
    role: "DevOps",
    specialty: ["lambda"],
    hireCost: 800,
    sideEffectChance: 0.2,
    resolutionTicks: 90,
  },
  {
    id: "senior",
    name: "The Senior Intern",
    role: "General",
    specialty: ["ec2", "s3", "lambda", "database", "iam", "general"],
    hireCost: 5000,
    sideEffectChance: 0.05,
    resolutionTicks: 50,
  },
];

export const INTERN_QUIPS: Record<string, string[]> = {
  chad: [
    "Rebooted it. Didn't check why it crashed.",
    "It was a memory leak. I added more memory.",
    "Scheduled it to reboot at 3am. Problem solved.",
  ],
  priya: [
    "Added a policy. Also broke staging.",
    "Rotated the keys. Forgot to update the app.",
    "Made it more secure. Definition of 'working' is flexible now.",
  ],
  kevin: [
    "Turned it off and on. It's fine now probably.",
    "Dropped and recreated the table. The data wasn't important.",
    "Added an index. It's slower now. I'll look into it.",
  ],
  mackenzie: [
    "Rewrote it in Rust. Deployed without telling anyone.",
    "Increased the timeout to 15 minutes. Problem solved.",
    "The cold starts are warm now. I think. The metrics are confusing.",
  ],
  senior: [
    "I've seen this before. (They haven't.)",
    "Escalated to myself and resolved.",
    "Applied the standard fix. You don't need to know what that means.",
  ],
};

export const INTERN_SIDE_EFFECT_QUIPS: Record<string, string[]> = {
  chad:      ["Chad's fix introduced a new incident. Classic Chad."],
  priya:     ["Priya broke staging in the process. Acceptable losses."],
  kevin:     ["Kevin caused a new problem. He seems proud of it."],
  mackenzie: ["Mackenzie deployed something else while fixing this. TBD."],
  senior:    ["The Senior Intern's fix has... side effects. Minimal. Probably."],
};
