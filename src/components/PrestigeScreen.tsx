import React from "react";
import { Box, Text } from "ink";
import { PRESTIGE_TIERS } from "../game/prestige.ts";
import type { GameState } from "../game/state.ts";

function formatCredits(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${Math.floor(n)}`;
}

export function PrestigeScreen({
  state,
  onConfirm,
  onCancel,
}: {
  state: GameState;
  onConfirm: (prestigeId: string) => void;
  onCancel: () => void;
}) {
  const completedCount = state.completedPrestigeIds.length;
  const nextTier = PRESTIGE_TIERS[completedCount];

  if (!nextTier) {
    return (
      <Box borderStyle="double" borderColor="magenta" flexDirection="column" paddingX={2} paddingY={1}>
        <Text bold color="magenta">ALL MIGRATIONS COMPLETE</Text>
        <Text>You've migrated everywhere. You've come back on-prem.</Text>
        <Text>The journey is over. The bills remain.</Text>
        <Text dimColor>[Esc] to close</Text>
      </Box>
    );
  }

  const canPrestige = state.credits >= nextTier.requiredCredits;

  return (
    <Box borderStyle="double" borderColor="magenta" flexDirection="column" paddingX={2} paddingY={1} width={60}>
      <Text bold color="magenta">☁️  CLOUD MIGRATION</Text>
      <Box marginTop={1} flexDirection="column">
        <Text bold color="cyan">{nextTier.name}</Text>
        <Text dimColor italic>{nextTier.tagline}</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text>Requires: <Text color={canPrestige ? "green" : "red"}>{formatCredits(nextTier.requiredCredits)}</Text></Text>
        <Text>You have: <Text color="yellow">{formatCredits(state.credits)}</Text></Text>
        <Text>Reward: <Text color="magenta">{nextTier.warStoryReward}</Text></Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text color="yellow" bold>⚠️  This resets all credits and infrastructure.</Text>
        <Text color="yellow">War Stories and their bonuses persist.</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text bold>Past Migrations:</Text>
        {state.completedPrestigeIds.length === 0 ? (
          <Text dimColor>None yet. You're young. Naive. Optimistic.</Text>
        ) : (
          state.completedPrestigeIds.map((id) => {
            const tier = PRESTIGE_TIERS.find((t) => t.id === id);
            return <Text key={id} color="green">✓ {tier?.name}</Text>;
          })
        )}
      </Box>
      {canPrestige ? (
        state.prestigeConfirming ? (
          <Box marginTop={1} flexDirection="column">
            <Text bold color="red">Are you sure? Everything resets.</Text>
            <Text><Text color="green" bold>[y]</Text> Confirm Migration  <Text color="red" bold>[n]</Text> Abort</Text>
          </Box>
        ) : (
          <Box marginTop={1}>
            <Text><Text color="green" bold>[Enter]</Text> Begin Migration  <Text color="red" bold>[Esc]</Text> Cancel</Text>
          </Box>
        )
      ) : (
        <Box marginTop={1}>
          <Text color="red">Not enough credits to migrate.  <Text color="gray" bold>[Esc]</Text> Close</Text>
        </Box>
      )}
    </Box>
  );
}
