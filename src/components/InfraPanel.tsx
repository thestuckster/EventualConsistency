import React from "react";
import { Box, Text } from "ink";
import { INFRASTRUCTURE, infraCost } from "../game/infrastructure.ts";
import type { GameState } from "../game/state.ts";

function formatCost(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${Math.floor(n)}`;
}

export function InfraPanel({ state, focused }: { state: GameState; focused: boolean }) {
  return (
    <Box flexDirection="column" borderStyle="single" borderColor={focused ? "cyan" : "gray"} paddingX={1} width={30}>
      <Text bold color={focused ? "cyan" : "white"}>INFRASTRUCTURE{focused ? " <" : ""}</Text>
      <Text dimColor>^v navigate  [b] buy</Text>
      <Box flexDirection="column" marginTop={0}>
        {INFRASTRUCTURE.map((def, i) => {
          const owned = state.ownedInfra[i];
          const count = owned?.count ?? 0;
          const prevOwned = i > 0 ? state.ownedInfra[i - 1] : null;
          const locked = prevOwned !== null && prevOwned !== undefined && prevOwned.count === 0;
          const cost = infraCost(def, count);
          const canAfford = state.credits >= cost;
          const isSelected = focused && state.selectedInfraIndex === i;

          if (locked && i > 1) return null;

          return (
            <Box key={def.id} flexDirection="column" marginTop={0}>
              <Box>
                <Text
                  color={isSelected ? "cyan" : locked ? "gray" : canAfford ? "white" : "gray"}
                  bold={isSelected}
                >
                  {isSelected ? "> " : "  "}
                  {locked ? "[?] " : ""}
                  {def.name}
                  {count > 0 ? ` x${count}` : ""}
                </Text>
              </Box>
              {isSelected && (
                <Box flexDirection="column" marginLeft={3}>
                  <Text dimColor italic>{def.description}</Text>
                  <Text color={canAfford ? "green" : "red"}>
                    {locked ? "  (buy previous first)" : `  ${formatCost(cost)}  +${def.basePerSec}/sec`}
                  </Text>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
