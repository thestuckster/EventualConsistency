export type IncidentEffect =
  | { type: "drain_per_sec"; multiplier: number }
  | { type: "click_multiplier"; multiplier: number }
  | { type: "one_time_drain"; amount: number }
  | { type: "disable_infra"; infraId: string }
  | { type: "halt_all" };

export type IncidentSpecialty =
  | "ec2"
  | "s3"
  | "lambda"
  | "database"
  | "iam"
  | "general";

export interface IncidentDef {
  id: string;
  name: string;
  flavor: string;
  effect: IncidentEffect;
  specialty: IncidentSpecialty;
  minInfraCount: number;
}

export interface ActiveIncident {
  id: string;
  defId: string;
  startedAt: number;
  resolvingInternId: string | null;
  resolveTick: number | null;
}

export const INCIDENTS: IncidentDef[] = [
  {
    id: "s3_public",
    name: "S3 Bucket Made Public",
    flavor: "Congrats, your database is now a website.",
    effect: { type: "drain_per_sec", multiplier: 0.8 },
    specialty: "s3",
    minInfraCount: 1,
  },
  {
    id: "ec2_bill",
    name: "EC2 Bill Shock",
    flavor: "AWS emailed. It wasn't friendly.",
    effect: { type: "one_time_drain", amount: 0 }, // filled dynamically
    specialty: "ec2",
    minInfraCount: 1,
  },
  {
    id: "lambda_cold",
    name: "Lambda Cold Start Storm",
    flavor: "Every function is asleep. Good morning.",
    effect: { type: "click_multiplier", multiplier: 0.5 },
    specialty: "lambda",
    minInfraCount: 2,
  },
  {
    id: "db_down",
    name: "The Database Is Down",
    flavor: "It's always the database.",
    effect: { type: "drain_per_sec", multiplier: 0.5 },
    specialty: "database",
    minInfraCount: 3,
  },
  {
    id: "push_to_main",
    name: "Someone Pushed to Main",
    flavor: "No branch protection. Bold strategy.",
    effect: { type: "drain_per_sec", multiplier: 0.9 },
    specialty: "general",
    minInfraCount: 2,
  },
  {
    id: "iam_permissive",
    name: "IAM Role Too Permissive",
    flavor: "Someone is mining crypto on your dime.",
    effect: { type: "drain_per_sec", multiplier: 0.7 },
    specialty: "iam",
    minInfraCount: 4,
  },
  {
    id: "region_outage",
    name: "Region Outage (us-east-1)",
    flavor: "Not again.",
    effect: { type: "halt_all" },
    specialty: "ec2",
    minInfraCount: 6,
  },
  {
    id: "feedback_loop",
    name: "Infinite Feedback Loop",
    flavor: "The logs are logging the logs.",
    effect: { type: "drain_per_sec", multiplier: 0.6 },
    specialty: "general",
    minInfraCount: 5,
  },
  {
    id: "kevin_kubernetes",
    name: "Kevin Learned Kubernetes",
    flavor: "He deployed something. We don't know what.",
    effect: { type: "drain_per_sec", multiplier: 0.85 },
    specialty: "general",
    minInfraCount: 3,
  },
];
