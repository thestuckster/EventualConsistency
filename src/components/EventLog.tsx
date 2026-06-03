import React from "react";
import { Box, Text } from "ink";
import type { GameState, LogEntry } from "../game/state.ts";
import { INCIDENTS } from "../game/incidents.ts";

function entryColor(emoji: string): string {
  if (emoji === "[!]" || emoji === "!!") return "red";
  if (emoji === "ok") return "green";
  if (emoji === "[*]") return "yellow";
  return "white";
}

export function EventLog({ state }: { state: GameState }) {
  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1} flexGrow={1}>
      <Text bold color="white">EVENT LOG</Text>
      <Box flexDirection="column" marginTop={0}>
        {state.log.slice(0, 14).map((entry) => {
          const color = entryColor(entry.emoji);
          return (
            <Text key={entry.id} wrap="truncate" color={color}>
              <Text dimColor>{entry.emoji} </Text>
              {entry.message}
            </Text>
          );
        })}
      </Box>
      {state.activeIncidents.length > 0 && (
        <Box flexDirection="column" marginTop={1} borderStyle="single" borderColor="red" paddingX={1}>
          <Text bold color="red">ACTIVE INCIDENTS - press [r] to resolve</Text>
          {state.activeIncidents.map((incident, i) => {
            const def = INCIDENTS.find((d) => d.id === incident.defId);
            return (
              <Text key={incident.id} color="red">
                [{i + 1}] {def?.name ?? "Unknown Incident"}
                {incident.resolvingInternId ? " (intern on it...)" : ""}
              </Text>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
