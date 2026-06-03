import React, { useEffect, useRef, useState } from "react";
import { Box, Text, useInput, useApp } from "ink";
import { useGameState, INITIAL_STATE, type Panel, type GameState } from "../game/state.ts";
import { Header, computePerSec, computeClickIncome } from "./Header.tsx";
import { InfraPanel } from "./InfraPanel.tsx";
import { InternPanel } from "./InternPanel.tsx";
import { UpgradePanel } from "./UpgradePanel.tsx";
import { EventLog } from "./EventLog.tsx";
import { StatusBar } from "./StatusBar.tsx";
import { PrestigeScreen } from "./PrestigeScreen.tsx";
import { QuitScreen } from "./QuitScreen.tsx";
import { INTERNS, INTERN_LEVEL_MULTIPLIERS } from "../game/interns.ts";
import { CLICK_UPGRADES } from "../game/upgrades.ts";
import { INCIDENTS, type ActiveIncident } from "../game/incidents.ts";
import { PRESTIGE_TIERS } from "../game/prestige.ts";
import { SHIP_IT_ACTIONS, MILESTONE_MESSAGES } from "../data/flavor.ts";
import { saveGame, deleteSave } from "../game/persistence.ts";

let incidentIdCounter = 1;

function formatNum(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

const INTRO_LINES = [
  "You've decided to found a cloud computing company.",
  "",
  "Assets: $0. One laptop. Unshakeable confidence.",
  "Business plan: a napkin.",
  "Runway: vibes.",
  "Competitive advantage: you read an AWS blog post once.",
  "",
  'The company name "Eventual Consistency" came to you at 2am.',
  "You don\'t know what it means. Neither does your pitch deck.",
  "",
  "Profitability: eventual.",
  "",
];

interface AppProps {
  initialState?: GameState;
  offlineEarnings?: number;
  offlineSeconds?: number;
  isNewGame?: boolean;
}

export function App({ initialState, offlineEarnings = 0, offlineSeconds = 0, isNewGame = false }: AppProps) {
  const { exit } = useApp();
  const [state, dispatch] = useGameState(initialState ?? INITIAL_STATE);
  const stateRef = useRef(state);
  stateRef.current = state;

  const [quitting, setQuitting] = useState(false);
  const [newGameConfirm, setNewGameConfirm] = useState(false);
  const [showOffline, setShowOffline] = useState(offlineEarnings > 0.01);
  const [showIntro, setShowIntro] = useState(isNewGame && offlineEarnings <= 0.01);

  // Single consolidated game loop — all logic gated by tick modulo
  useEffect(() => {
    const interval = setInterval(() => {
      const s = stateRef.current;
      if (s.showPrestige || quitting || newGameConfirm || showIntro) return;

      const tick = s.tick;

      // 1. Advance tick + passive income (every 100ms)
      dispatch({ type: "TICK" });
      const perSec = computePerSec(s);
      if (perSec > 0) dispatch({ type: "APPLY_INCOME", amount: perSec / 10 });

      // 2. Incident spawner (every 2s = every 20 ticks)
      if (tick % 20 === 0) {
        const totalInfra = s.ownedInfra.reduce((sum, o) => sum + o.count, 0);
        if (totalInfra > 0 && s.activeIncidents.length < 4) {
          const scaledChance = Math.min(0.8, 0.12 * s.warStoryEffects.incidentFrequencyMultiplier + totalInfra * 0.008);
          if (Math.random() < scaledChance) {
            const eligible = INCIDENTS.filter((def) => totalInfra >= def.minInfraCount);
            if (eligible.length > 0) {
              const def = eligible[Math.floor(Math.random() * eligible.length)]!;
              dispatch({
                type: "ADD_INCIDENT",
                incident: {
                  id: `inc_${incidentIdCounter++}`,
                  defId: def.id,
                  startedAt: Date.now(),
                  resolvingInternId: null,
                  resolveTick: null,
                },
              });
            }
          }
        }
      }

      // 3. Intern assignment (every 500ms = every 5 ticks)
      if (tick % 5 === 0) {
        for (const hired of s.hiredInterns) {
          if (hired.busy) continue;
          const internDef = INTERNS.find((d) => d.id === hired.defId);
          if (!internDef) continue;
          const matchingIncident = s.activeIncidents.find((i) => {
            if (i.resolvingInternId) return false;
            const def = INCIDENTS.find((d) => d.id === i.defId);
            return def && (internDef.specialty.includes(def.specialty) || internDef.specialty.includes("general"));
          });
          if (!matchingIncident) continue;
          const levelMult = INTERN_LEVEL_MULTIPLIERS[hired.level];
          const resTicks = Math.max(5, Math.floor(
            (internDef.resolutionTicks * levelMult.speed) / s.warStoryEffects.internEfficiencyMultiplier
          ));
          dispatch({ type: "ASSIGN_INTERN", incidentId: matchingIncident.id, internId: hired.defId, resolveTick: tick + resTicks });
        }
      }

      // 4. Intern resolution (every 300ms = every 3 ticks)
      if (tick % 3 === 0) {
        for (const incident of s.activeIncidents) {
          if (!incident.resolvingInternId || !incident.resolveTick) continue;
          if (tick < incident.resolveTick) continue;
          const internId = incident.resolvingInternId;
          const hired = s.hiredInterns.find((h) => h.defId === internId);
          const internDef = INTERNS.find((d) => d.id === internId);
          if (!hired || !internDef) continue;
          const levelMult = INTERN_LEVEL_MULTIPLIERS[hired.level];
          const sideEffect = Math.random() < internDef.sideEffectChance * levelMult.sideEffect;
          dispatch({ type: "RESOLVE_INCIDENT_INTERN", incidentId: incident.id, internId, sideEffect });
          if (sideEffect) {
            const totalInfra = s.ownedInfra.reduce((sum, o) => sum + o.count, 0);
            const eligible = INCIDENTS.filter((d) => d.id !== incident.defId && totalInfra >= d.minInfraCount);
            if (eligible.length > 0) {
              const picked = eligible[Math.floor(Math.random() * eligible.length)]!;
              dispatch({
                type: "ADD_INCIDENT",
                incident: { id: `inc_${incidentIdCounter++}`, defId: picked.id, startedAt: Date.now(), resolvingInternId: null, resolveTick: null },
              });
            }
          }
        }
      }

      // 5. Milestone check (every 1s = every 10 ticks)
      if (tick % 10 === 0) {
        for (const milestone of MILESTONE_MESSAGES) {
          if (s.totalCreditsEarned >= milestone.credits && !s.milestonesSeen.includes(milestone.credits)) {
            dispatch({ type: "MARK_MILESTONE", credits: milestone.credits });
            dispatch({ type: "LOG", message: milestone.message, emoji: "🏆" });
          }
        }
      }

      // 6. Auto-save (every 30s = every 300 ticks)
      if (tick > 0 && tick % 300 === 0) {
        saveGame(s).catch(() => {});
      }
    }, 100);
    return () => clearInterval(interval);
  }, [quitting, newGameConfirm, showIntro]);

  useInput((input, key) => {
    const s = stateRef.current;

    // Intro dismiss
    if (showIntro) { setShowIntro(false); return; }

    // Offline earnings dismiss
    if (showOffline) { setShowOffline(false); return; }

    // New game confirm
    if (newGameConfirm) {
      if (input === "y") {
        deleteSave().catch(() => {});
        dispatch({ type: "LOAD_SAVE", state: INITIAL_STATE });
        setNewGameConfirm(false);
        setShowIntro(true);
      } else {
        setNewGameConfirm(false);
      }
      return;
    }

    // Quit confirm
    if (quitting) {
      if (input === "q") {
        saveGame(stateRef.current).then(() => exit()).catch(() => exit());
      } else {
        setQuitting(false);
      }
      return;
    }

    // Prestige screen
    if (s.showPrestige) {
      if (s.prestigeConfirming) {
        if (input === "y") {
          const nextTier = PRESTIGE_TIERS[s.completedPrestigeIds.length];
          if (nextTier) { dispatch({ type: "PRESTIGE", prestigeId: nextTier.id }); dispatch({ type: "CANCEL_PRESTIGE" }); }
        } else if (input === "n" || key.escape) {
          dispatch({ type: "CANCEL_PRESTIGE" });
        }
      } else {
        if (key.return) dispatch({ type: "CONFIRM_PRESTIGE" });
        else if (key.escape || input === "p") dispatch({ type: "CANCEL_PRESTIGE" });
      }
      return;
    }

    if (input === " ") {
      const idx = s.shipItIndex % SHIP_IT_ACTIONS.length;
      const actionText = SHIP_IT_ACTIONS[idx] ?? "Shipped it";
      const earn = computeClickIncome(s);
      dispatch({ type: "SHIP_IT", actionText, earn });
      return;
    }

    if (key.tab) {
      const panels: Panel[] = ["upgrades", "infra", "interns"];
      const idx = panels.indexOf(s.focusedPanel);
      dispatch({ type: "FOCUS_PANEL", panel: panels[(idx + 1) % panels.length] ?? "upgrades" });
      return;
    }

    if (key.upArrow) { dispatch({ type: "NAV_UP" }); return; }
    if (key.downArrow) { dispatch({ type: "NAV_DOWN" }); return; }

    if (input === "b") {
      if (s.focusedPanel === "infra") dispatch({ type: "BUY_INFRA", index: s.selectedInfraIndex });
      if (s.focusedPanel === "upgrades") {
        const def = CLICK_UPGRADES[s.selectedUpgradeIndex];
        if (def) dispatch({ type: "BUY_UPGRADE", id: def.id });
      }
      return;
    }

    if (input === "h" && s.focusedPanel === "interns") {
      const internDef = INTERNS[s.selectedInternIndex];
      if (internDef) dispatch({ type: "HIRE_INTERN", defId: internDef.id });
      return;
    }

    if (input === "u" && s.focusedPanel === "interns") {
      const internDef = INTERNS[s.selectedInternIndex];
      if (internDef) dispatch({ type: "LEVEL_UP_INTERN", defId: internDef.id });
      return;
    }

    if (input === "r") {
      const first = s.activeIncidents.find((i) => !i.resolvingInternId);
      if (first) dispatch({ type: "RESOLVE_INCIDENT_MANUAL", incidentId: first.id });
      return;
    }

    if (input === "p") { dispatch({ type: "TOGGLE_PRESTIGE" }); return; }
    if (input === "n") { setNewGameConfirm(true); return; }
    if (input === "q") { setQuitting(true); return; }
  });

  // --- Overlay screens ---

  if (showIntro) {
    return (
      <Box flexDirection="column" alignItems="center" justifyContent="center" padding={3}>
        <Box flexDirection="column" borderStyle="double" borderColor="cyan" paddingX={3} paddingY={1} width={60}>
          <Text bold color="cyan">☁️  EVENTUAL CONSISTENCY</Text>
          <Text dimColor>A Cloud Computing Story</Text>
          <Box flexDirection="column" marginTop={1}>
            {INTRO_LINES.map((line, i) => (
              <Text key={i} color={line === "" ? undefined : "white"}>{line || " "}</Text>
            ))}
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Press any key to begin shipping.</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  if (showOffline) {
    const hours = Math.floor(offlineSeconds / 3600);
    const mins = Math.floor((offlineSeconds % 3600) / 60);
    const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    return (
      <Box flexDirection="column" alignItems="center" justifyContent="center" padding={2}>
        <Box flexDirection="column" borderStyle="double" borderColor="green" paddingX={2} paddingY={1}>
          <Text bold color="green">💰 OFFLINE EARNINGS</Text>
          <Box marginTop={1} flexDirection="column">
            <Text>You were gone for <Text bold color="cyan">{timeStr}</Text>.</Text>
            <Text>Your infrastructure kept working.</Text>
            <Text>At 60% efficiency. The servers napped too.</Text>
          </Box>
          <Box marginTop={1}>
            <Text>Earned while away: <Text bold color="yellow">{formatNum(offlineEarnings)}</Text></Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Press any key to continue.</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  if (newGameConfirm) {
    return (
      <Box flexDirection="column" alignItems="center" justifyContent="center" padding={2}>
        <Box flexDirection="column" borderStyle="double" borderColor="red" paddingX={2} paddingY={1}>
          <Text bold color="red">⚠️  START NEW GAME</Text>
          <Box marginTop={1} flexDirection="column">
            <Text>This will permanently delete your save.</Text>
            <Text>All credits, infrastructure, and interns: gone.</Text>
            <Text>War Stories: also gone.</Text>
            <Text color="yellow">There is no undo. Kevin cannot fix this.</Text>
          </Box>
          <Box marginTop={1}>
            <Text><Text bold color="green">[y]</Text> Wipe everything  <Text bold color="gray">[any key]</Text> Cancel</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  if (quitting) {
    return (
      <Box flexDirection="column" alignItems="center" justifyContent="center" padding={2}>
        <QuitScreen state={state} />
        <Box marginTop={1}>
          <Text dimColor>Press <Text bold>[q]</Text> again to save and exit, any other key to return.</Text>
        </Box>
      </Box>
    );
  }

  if (state.showPrestige) {
    return (
      <Box flexDirection="column" alignItems="center" justifyContent="center" padding={2}>
        <PrestigeScreen
          state={state}
          onConfirm={(id) => { dispatch({ type: "PRESTIGE", prestigeId: id }); dispatch({ type: "CANCEL_PRESTIGE" }); }}
          onCancel={() => dispatch({ type: "CANCEL_PRESTIGE" })}
        />
      </Box>
    );
  }

  // Main game — all 3 panels always visible, Tab switches focus only
  return (
    <Box flexDirection="column">
      <Header state={state} />
      <Box flexDirection="row" flexGrow={1}>
        <UpgradePanel state={state} focused={state.focusedPanel === "upgrades"} />
        <InfraPanel state={state} focused={state.focusedPanel === "infra"} />
        <InternPanel state={state} focused={state.focusedPanel === "interns"} />
        <EventLog state={state} />
      </Box>
      <StatusBar state={state} />
    </Box>
  );
}
