import React, { useRef } from "react";
import { Box, Text } from "ink";
import type { GameState } from "../game/state.ts";

function formatCredits(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

const GUILT_TRIPS = [
  "The interns are asking where you went.",
  "us-east-1 is still down. Just so you know.",
  "Kevin deployed something right before you left.",
  "The incident is still open. It will be there when you return.",
  "You had so much infrastructure left to provision.",
];

export function QuitScreen({ state }: { state: GameState }) {
  const guilt = useRef(GUILT_TRIPS[Math.floor(Math.random() * GUILT_TRIPS.length)] ?? GUILT_TRIPS[0]).current;
  return (
    <Box flexDirection="column" borderStyle="double" borderColor="gray" paddingX={2} paddingY={1}>
      <Text bold color="cyan">EVENTUAL CONSISTENCY</Text>
      <Text dimColor>Session Summary</Text>
      <Box flexDirection="column" marginTop={1}>
        <Text>Total Earned:   <Text color="yellow">{formatCredits(state.totalCreditsEarned)}</Text></Text>
        <Text>Migrations:     <Text color="magenta">{state.completedPrestigeIds.length}</Text></Text>
        <Text>Infra Owned:    <Text color="green">{state.ownedInfra.reduce((s, o) => s + o.count, 0)}</Text></Text>
        <Text>Interns Hired:  <Text color="cyan">{state.hiredInterns.length}</Text></Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor italic>{guilt}</Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Goodbye. The cloud remains.</Text>
      </Box>
    </Box>
  );
}
