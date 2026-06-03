export interface PrestigeTier {
  id: string;
  name: string;
  tagline: string;
  retrospective: string;
  requiredCredits: number;
  warStoryReward: string;
}

export interface WarStoryEffects {
  globalPerSecMultiplier: number;
  internEfficiencyMultiplier: number;
  incidentFrequencyMultiplier: number;
  clickIncomeMultiplier: number;
  secretTierUnlocked: boolean;
}

export const PRESTIGE_TIERS: PrestigeTier[] = [
  {
    id: "gcp",
    name: "Migrate to GCP",
    tagline: "The grass is greener (it isn't)",
    retrospective: "You migrated to GCP. The bills are the same. The console is worse. You feel different.",
    requiredCredits: 1000000,
    warStoryReward: "+50% global $/sec",
  },
  {
    id: "multicloud",
    name: "Go Multi-Cloud",
    tagline: "Best of both worlds (worst of both worlds)",
    retrospective: "You are now on two clouds. Your architecture diagram requires a scroll bar.",
    requiredCredits: 100000000,
    warStoryReward: "Intern efficiency x2",
  },
  {
    id: "serverless",
    name: "Go Serverless-First",
    tagline: "No servers! (still servers)",
    retrospective: "Serverless-first. You have 4,000 Lambda functions. Nobody knows what half of them do.",
    requiredCredits: 10000000000,
    warStoryReward: "Incidents -30% frequency",
  },
  {
    id: "edge",
    name: "Edge Computing",
    tagline: "Put the compute... everywhere?",
    retrospective: "Your compute is on the edge. Literally. It fell off a shelf in Singapore.",
    requiredCredits: 1000000000000,
    warStoryReward: "Click income x5",
  },
  {
    id: "onprem",
    name: "On-Prem Again",
    tagline: "We've come full circle",
    retrospective: "You bought servers. Real ones. You can hear them. It's oddly comforting.",
    requiredCredits: 100000000000000,
    warStoryReward: "Unlock secret infrastructure tier",
  },
];

export function computeWarStoryEffects(completedPrestigeIds: string[]): WarStoryEffects {
  const effects: WarStoryEffects = {
    globalPerSecMultiplier: 1,
    internEfficiencyMultiplier: 1,
    incidentFrequencyMultiplier: 1,
    clickIncomeMultiplier: 1,
    secretTierUnlocked: false,
  };

  if (completedPrestigeIds.includes("gcp")) {
    effects.globalPerSecMultiplier *= 1.5;
  }
  if (completedPrestigeIds.includes("multicloud")) {
    effects.internEfficiencyMultiplier *= 2;
  }
  if (completedPrestigeIds.includes("serverless")) {
    effects.incidentFrequencyMultiplier *= 0.7;
  }
  if (completedPrestigeIds.includes("edge")) {
    effects.clickIncomeMultiplier *= 5;
  }
  if (completedPrestigeIds.includes("onprem")) {
    effects.secretTierUnlocked = true;
  }

  return effects;
}
