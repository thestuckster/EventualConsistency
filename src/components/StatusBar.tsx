import React from "react";
import { Box, Text } from "ink";
import type { GameState } from "../game/state.ts";
import { computeClickIncome } from "./Header.tsx";

function formatNum(n: number): string {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

export function StatusBar({ state }: { state: GameState }) {
  const clickIncome = computeClickIncome(state);
  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
      <Box justifyContent="space-between">
        <Text>
          <Text color="green" bold>[SPACE]</Text>
          <Text> Ship It </Text>
          <Text dimColor>({formatNum(clickIncome)}/press)  </Text>
          <Text color="cyan" bold>[Tab]</Text>
          <Text> Panel  </Text>
          <Text color="yellow" bold>[b]</Text>
          <Text> Buy  </Text>
          <Text color="magenta" bold>[p]</Text>
          <Text> Prestige  </Text>
          <Text color="red" bold>[n]</Text>
          <Text> New Game  </Text>
          <Text color="red" bold>[q]</Text>
          <Text> Quit</Text>
        </Text>
        <Text dimColor italic>{state.lastAction}</Text>
      </Box>
    </Box>
  );
}
