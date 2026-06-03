import React from "react";
import { Box, Text } from "ink";
import { INTERNS, INTERN_LEVEL_UPGRADE_COST } from "../game/interns.ts";
import type { GameState } from "../game/state.ts";

export function InternPanel({ state, focused }: { state: GameState; focused: boolean }) {
  return (
    <Box flexDirection="column" borderStyle="single" borderColor={focused ? "cyan" : "gray"} paddingX={1} width={26}>
      <Text bold color={focused ? "cyan" : "white"}>INTERNS{focused ? " ◀" : ""}</Text>
      <Text dimColor>↑↓ navigate  [h] hire  [u] upgrade</Text>
      <Box flexDirection="column" marginTop={0}>
        {INTERNS.map((def, i) => {
          const hired = state.hiredInterns.find((h) => h.defId === def.id);
          const isSelected = focused && state.selectedInternIndex === i;
          const canAfford = state.credits >= def.hireCost;

          return (
            <Box key={def.id} flexDirection="column" marginTop={0}>
              <Box>
                <Text
                  color={isSelected ? "cyan" : hired ? "green" : canAfford ? "white" : "gray"}
                  bold={isSelected}
                >
                  {isSelected ? "▶ " : "  "}
                  {def.name}
                  {hired ? ` [${hired.level}]` : ""}
                  {hired?.busy ? " ⚙️" : ""}
                </Text>
              </Box>
              {isSelected && (
                <Box flexDirection="column" marginLeft={3}>
                  <Text dimColor italic>{def.role}</Text>
                  {!hired && (
                    <Text color={canAfford ? "green" : "red"}>
                      Hire: ${def.hireCost.toLocaleString()}
                    </Text>
                  )}
                  {hired && hired.level !== "Staff" && (
                    <Text color="yellow">
                      Upgrade to {hired.level === "Junior" ? "Mid" : "Staff"}: $
                      {INTERN_LEVEL_UPGRADE_COST[hired.level === "Junior" ? "Mid" : "Staff"].toLocaleString()}
                    </Text>
                  )}
                  {hired && hired.level === "Staff" && (
                    <Text color="magenta">MAX LEVEL (they want equity)</Text>
                  )}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
      {state.hiredInterns.length >= 5 && (
        <Box marginTop={1}>
          <Text color="yellow" dimColor>More interns than engineers.</Text>
          <Text color="yellow" dimColor>This is fine.</Text>
        </Box>
      )}
    </Box>
  );
}
