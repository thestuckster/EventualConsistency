export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  clickBonus: number; // flat credits added per click
}

export const CLICK_UPGRADES: UpgradeDef[] = [
  {
    id: "keyboard",
    name: "Mechanical Keyboard",
    description: "The clicky kind. Coworkers hate it. You don't care.",
    cost: 10,
    clickBonus: 1,   // +1/click (base: 1 → 2)
  },
  {
    id: "standing_desk",
    name: "Standing Desk",
    description: "You will sit on it within a week.",
    cost: 75,
    clickBonus: 1,   // → 3
  },
  {
    id: "dual_monitors",
    name: "Dual Monitors",
    description: "One for Slack. One for pretending to work.",
    cost: 350,
    clickBonus: 2,   // → 5
  },
  {
    id: "coffee",
    name: "Artisanal Coffee Machine",
    description: "$8 a cup. You will die on this hill.",
    cost: 1500,
    clickBonus: 5,   // → 10
  },
  {
    id: "stackoverflow",
    name: "Stack Overflow Teams",
    description: "You could've just Googled it.",
    cost: 6000,
    clickBonus: 10,  // → 20
  },
  {
    id: "ai_copilot",
    name: "AI Copilot",
    description: "Ships code automatically. Sometimes the right code.",
    cost: 30000,
    clickBonus: 20,  // → 40
  },
  {
    id: "offshore_team",
    name: "Offshore Dev Team",
    description: "Communication overhead: astronomical. Output: surprisingly ok.",
    cost: 200000,
    clickBonus: 50,  // → 90
  },
];

// Returns the total flat bonus from all purchased upgrades
export function computeUpgradeClickBonus(purchasedIds: string[]): number {
  return CLICK_UPGRADES.filter((u) => purchasedIds.includes(u.id)).reduce(
    (sum, u) => sum + u.clickBonus,
    0
  );
}
