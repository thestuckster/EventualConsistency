import { join } from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import { createInitialState, type GameState } from "./state.ts";
import { computePerSec } from "../components/Header.tsx";
import { pluginRegistry } from "./plugins.ts";

const SAVE_DIR = join(process.env["HOME"] ?? ".", ".eventual-consistency");
const SAVE_PATH = join(SAVE_DIR, "save.json");

const MAX_OFFLINE_SECONDS = 24 * 60 * 60; // cap at 24h
const OFFLINE_RATE = 0.6;

export interface LoadResult {
  state: GameState;
  offlineEarnings: number;
  offlineSeconds: number;
}

export async function saveGame(state: GameState): Promise<void> {
  if (!existsSync(SAVE_DIR)) mkdirSync(SAVE_DIR, { recursive: true });
  const pluginState = pluginRegistry.runOnSave(state);
  const data = { ...state, lastSavedAt: Date.now(), pluginState };
  await Bun.write(SAVE_PATH, JSON.stringify(data));
}

export async function loadGame(): Promise<LoadResult | null> {
  const f = Bun.file(SAVE_PATH);
  if (!(await f.exists())) return null;

  let raw: GameState;
  try {
    raw = JSON.parse(await f.text()) as GameState;
  } catch {
    return null;
  }

  // Spread createInitialState() first so any fields added in newer versions
  // (including plugin-contributed infra slots) are present as defaults.
  const state: GameState = {
    ...createInitialState(),
    ...raw,
    tick: 0,
    showPrestige: false,
    prestigeConfirming: false,
    // ensure new fields have defaults if save is from older version
    purchasedUpgradeIds: raw.purchasedUpgradeIds ?? [],
    selectedUpgradeIndex: raw.selectedUpgradeIndex ?? 0,
    lastSavedAt: raw.lastSavedAt ?? Date.now(),
    pluginState: raw.pluginState ?? {},
    // resolveTick is an absolute tick value; reset on load so interns
    // get reassigned from tick 0 rather than waiting for a tick that
    // may never arrive in the new session.
    activeIncidents: dedupeIncidentIds(
      (raw.activeIncidents ?? []).map((i) => ({
        ...i,
        resolvingInternId: null,
        resolveTick: null,
      }))
    ),
    hiredInterns: (raw.hiredInterns ?? []).map((h) => ({ ...h, busy: false })),
  };

  // Notify plugins of their persisted state
  pluginRegistry.runOnLoad(state.pluginState);

  const now = Date.now();
  const deltaSec = Math.min(MAX_OFFLINE_SECONDS, (now - state.lastSavedAt) / 1000);
  // Offline earnings ignore active incidents — incidents are transient events
  // that shouldn't penalize players who happened to save during one.
  const perSec = computePerSec({ ...state, activeIncidents: [] });
  const offlineEarnings = deltaSec > 5 ? perSec * deltaSec * OFFLINE_RATE : 0;

  const loaded: GameState = {
    ...state,
    credits: state.credits + offlineEarnings,
    totalCreditsEarned: state.totalCreditsEarned + offlineEarnings,
    lastSavedAt: now,
  };

  return { state: loaded, offlineEarnings, offlineSeconds: deltaSec };
}

// Older saves could end up with duplicate incident ids; reassign any
// duplicates to keep ids unique (used as React keys in the UI).
function dedupeIncidentIds(incidents: GameState["activeIncidents"]): GameState["activeIncidents"] {
  const seen = new Set<string>();
  let next = 1;
  return incidents.map((incident) => {
    if (!seen.has(incident.id)) {
      seen.add(incident.id);
      return incident;
    }
    let id: string;
    do {
      id = `inc_${next++}`;
    } while (seen.has(id));
    seen.add(id);
    return { ...incident, id };
  });
}

export async function deleteSave(): Promise<void> {
  if (existsSync(SAVE_PATH)) {
    await Bun.$`rm ${SAVE_PATH}`;
  }
}
