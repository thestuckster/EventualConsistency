import React from "react";
import { Box, Text } from "ink";
import type { GameState } from "../game/state.ts";
import { INFRASTRUCTURE } from "../game/infrastructure.ts";
import { INCIDENTS } from "../game/incidents.ts";
import { computeUpgradeClickBonus } from "../game/upgrades.ts";

function computePerSec(state: GameState): number {
  let total = 0;
  for (let i = 0; i < INFRASTRUCTURE.length; i++) {
    const def = INFRASTRUCTURE[i];
    const owned = state.ownedInfra[i];
    if (!def || !owned) continue;
    total += def.basePerSec * owned.count;
  }
  // Apply incident effects
  for (const incident of state.activeIncidents) {
    const def = INCIDENTS.find((d) => d.id === incident.defId);
    if (!def) continue;
    if (def.effect.type === "drain_per_sec") total *= def.effect.multiplier;
    if (def.effect.type === "halt_all") total = 0;
  }
  return total * state.warStoryEffects.globalPerSecMultiplier;
}

function formatCredits(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

const TAGLINES = [
  '"Profitable by Q4. Which Q4? Classified."',
  '"Scale first, profit never."',
  '"The servers are someone else\'s problem."',
  '"We\'re disrupting disruption."',
];

export function Header({ state }: { state: GameState }) {
  const perSec = computePerSec(state);
  const tagline = TAGLINES[state.completedPrestigeIds.length % TAGLINES.length] ?? TAGLINES[0];
  const incidentCount = state.activeIncidents.length;

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="cyan" paddingX={1}>
      <Box justifyContent="space-between">
        <Text bold color="cyan">EVENTUAL CONSISTENCY</Text>
        <Text dimColor>{tagline}</Text>
      </Box>
      <Box gap={4} marginTop={0}>
        <Text>
          <Text color="yellow" bold>$ {formatCredits(state.credits)}</Text>
        </Text>
        <Text>
          <Text color="green">^ {formatCredits(perSec)}/sec</Text>
        </Text>
        <Text>
          <Text color="magenta">~ War Stories: {state.completedPrestigeIds.length}</Text>
        </Text>
        {incidentCount > 0 && (
          <Text>
            <Text color="red" bold>[!] {incidentCount} incident{incidentCount !== 1 ? "s" : ""} active</Text>
          </Text>
        )}
      </Box>
    </Box>
  );
}

export function computeClickIncome(state: GameState): number {
  const upgradeBonus = computeUpgradeClickBonus(state.purchasedUpgradeIds);
  const infraBonus = state.ownedInfra.reduce((sum, o) => sum + o.count * 0.1, 0);
  return (1 + upgradeBonus + infraBonus) * state.warStoryEffects.clickIncomeMultiplier;
}

export { computePerSec };
