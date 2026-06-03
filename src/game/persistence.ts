import { join } from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import { INITIAL_STATE, type GameState } from "./state.ts";
import { computePerSec } from "../components/Header.tsx";

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
  const data = { ...state, lastSavedAt: Date.now() };
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

  // Migrate missing fields from newer versions of INITIAL_STATE
  const state: GameState = {
    ...INITIAL_STATE,
    ...raw,
    tick: 0,
    showPrestige: false,
    prestigeConfirming: false,
    // ensure new fields have defaults if save is from older version
    purchasedUpgradeIds: raw.purchasedUpgradeIds ?? [],
    selectedUpgradeIndex: raw.selectedUpgradeIndex ?? 0,
    lastSavedAt: raw.lastSavedAt ?? Date.now(),
  };

  const now = Date.now();
  const deltaSec = Math.min(MAX_OFFLINE_SECONDS, (now - state.lastSavedAt) / 1000);
  const perSec = computePerSec(state);
  const offlineEarnings = deltaSec > 5 ? perSec * deltaSec * OFFLINE_RATE : 0;

  const loaded: GameState = {
    ...state,
    credits: state.credits + offlineEarnings,
    totalCreditsEarned: state.totalCreditsEarned + offlineEarnings,
    lastSavedAt: now,
  };

  return { state: loaded, offlineEarnings, offlineSeconds: deltaSec };
}

export async function deleteSave(): Promise<void> {
  if (existsSync(SAVE_PATH)) {
    await Bun.$`rm ${SAVE_PATH}`;
  }
}
