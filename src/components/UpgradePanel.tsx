import React from "react";
import { Box, Text } from "ink";
import { CLICK_UPGRADES, type UpgradeDef } from "../game/upgrades.ts";
import type { GameState } from "../game/state.ts";

function formatCost(n: number): string {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${Math.floor(n)}`;
}

export function UpgradePanel({ state, focused }: { state: GameState; focused: boolean }) {
  const allPurchased = CLICK_UPGRADES.every((u) => state.purchasedUpgradeIds.includes(u.id));

  return (
    <Box flexDirection="column" borderStyle="single" borderColor={focused ? "cyan" : "gray"} paddingX={1} width={30}>
      <Text bold color={focused ? "cyan" : "white"}>UPGRADES{focused ? " <" : ""}</Text>
      <Text dimColor>^v navigate  [b] buy</Text>
      <Box flexDirection="column" marginTop={0}>
        {CLICK_UPGRADES.map((def, i) => {
          const purchased = state.purchasedUpgradeIds.includes(def.id);
          const canAfford = state.credits >= def.cost;
          const isSelected = focused && state.selectedUpgradeIndex === i;

          return (
            <Box key={def.id} flexDirection="column">
              <Box>
                <Text
                  color={isSelected ? "cyan" : purchased ? "green" : canAfford ? "white" : "gray"}
                  bold={isSelected}
                  dimColor={purchased}
                >
                  {isSelected ? "> " : "  "}
                  {purchased ? "+ " : ""}
                  {def.name}
                </Text>
              </Box>
              {isSelected && (
                <Box flexDirection="column" marginLeft={3}>
                  <Text dimColor italic wrap="wrap">{def.description}</Text>
                  {purchased ? (
                    <Text color="green" dimColor>[+] purchased  +{def.clickBonus}/click</Text>
                  ) : (
                    <Text color={canAfford ? "green" : "red"}>
                      {formatCost(def.cost)}  +{def.clickBonus}/click
                    </Text>
                  )}
                </Box>
              )}
            </Box>
          );
        })}
        {allPurchased && (
          <Box marginTop={1}>
            <Text color="green" dimColor>All upgrades purchased. Ship faster.</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
