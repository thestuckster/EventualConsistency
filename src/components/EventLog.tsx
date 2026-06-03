import React from "react";
import { Box, Text } from "ink";
import type { GameState, LogEntry } from "../game/state.ts";
import { INCIDENTS } from "../game/incidents.ts";

export function EventLog({ state }: { state: GameState }) {
  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1} flexGrow={1}>
      <Text bold color="white">EVENT LOG</Text>
      <Box flexDirection="column" marginTop={0}>
        {state.log.slice(0, 14).map((entry) => (
          <Text key={entry.id} wrap="truncate">
            <Text dimColor>{entry.emoji} </Text>
            <Text color="white">{entry.message}</Text>
          </Text>
        ))}
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
