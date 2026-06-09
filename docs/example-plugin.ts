/**
 * Example Plugin: Quantum Cloud
 *
 * Drop this file into ~/.eventual-consistency/plugins/ and restart the game.
 * It demonstrates all major plugin capabilities:
 *  - New infrastructure
 *  - New incidents
 *  - Event hooks (onPrestige, onIncidentSpawned, onSave/onLoad)
 *  - Custom tick phase
 *  - Custom key handler
 *  - Custom reducer extension + PLUGIN_ACTION dispatch
 *
 * This file uses only types from the game source for IDE support.
 * Running it requires no compilation step — Bun handles TypeScript natively.
 */

import type { Plugin } from "../src/game/plugins.ts";

// Module-level state persisted via onSave/onLoad
let bonusesCollected = 0;

export default {
  id: "quantum-cloud",
  name: "Quantum Cloud",
  version: "1.0.0",

  // ── Content ─────────────────────────────────────────────────────────────

  content: {
    infrastructure: [
      {
        id: "quantum_vpc",
        name: "Quantum VPC",
        description: "Exists in superposition until observed by billing.",
        baseCost: 1e12,
        basePerSec: 8000,
      },
    ],

    incidents: [
      {
        id: "schrodingers_deploy",
        name: "Schrodinger's Deploy",
        flavor: "It deployed. Or did it? Observing will collapse the waveform.",
        effect: { type: "drain_per_sec", multiplier: 0.75 },
        specialty: "general",
        minInfraCount: 10,
      },
    ],
  },

  // ── Hooks ────────────────────────────────────────────────────────────────

  hooks: {
    onPrestige(prestigeId) {
      return [
        {
          type: "LOG",
          message: `Quantum entanglement recalibrated after ${prestigeId} migration.`,
          emoji: "[Q]",
        },
      ];
    },

    onIncidentSpawned(incident) {
      if (incident.defId === "schrodingers_deploy") {
        return [
          {
            type: "LOG",
            message: "A quantum anomaly is unfolding in your VPC.",
            emoji: "??",
          },
        ];
      }
      return [];
    },

    onSave() {
      return { bonusesCollected };
    },

    onLoad(saved) {
      bonusesCollected = (saved.bonusesCollected as number) ?? 0;
    },
  },

  // ── Mechanics ────────────────────────────────────────────────────────────

  mechanics: {
    // Custom reducer: add a bonus credit burst
    reducerExtensions: {
      "quantum-cloud/QUANTUM_BURST": (state, payload) => {
        const { amount } = payload as { amount: number };
        return {
          ...state,
          credits: state.credits + amount,
          totalCreditsEarned: state.totalCreditsEarned + amount,
        };
      },
    },

    // Tick phase: every 5 minutes (3000 ticks), award a small quantum bonus
    tickPhases: [
      {
        interval: 3000,
        run(state, _tick, dispatch) {
          const bonus = Math.floor(state.totalCreditsEarned * 0.001);
          if (bonus > 0) {
            bonusesCollected++;
            dispatch({
              type: "PLUGIN_ACTION",
              pluginAction: "quantum-cloud/QUANTUM_BURST",
              payload: { amount: bonus },
            });
            dispatch({
              type: "LOG",
              message: `Quantum bonus #${bonusesCollected}: +$${bonus.toFixed(0)} from quantum fluctuations.`,
              emoji: "[Q]",
            });
          }
        },
      },
    ],

    // Key handler: press X to trigger an immediate small quantum burst
    keyHandlers: [
      {
        key: "x",
        run(state, dispatch) {
          const burst = Math.max(1, Math.floor(state.credits * 0.005));
          bonusesCollected++;
          dispatch({
            type: "PLUGIN_ACTION",
            pluginAction: "quantum-cloud/QUANTUM_BURST",
            payload: { amount: burst },
          });
          dispatch({
            type: "LOG",
            message: `Manual quantum burst: +$${burst.toFixed(0)}. (Total bursts: ${bonusesCollected})`,
            emoji: "[Q]",
          });
        },
      },
    ],
  },
} satisfies Plugin;
