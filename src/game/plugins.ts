import type { ComponentType } from "react";
import type { GameState, Action } from "./state.ts";
import type { InfraDef } from "./infrastructure.ts";
import type { InternDef } from "./interns.ts";
import type { IncidentDef, ActiveIncident } from "./incidents.ts";
import type { UpgradeDef } from "./upgrades.ts";
import type { PrestigeTier } from "./prestige.ts";

import { INFRASTRUCTURE } from "./infrastructure.ts";
import { INTERNS } from "./interns.ts";
import { INCIDENTS } from "./incidents.ts";
import { CLICK_UPGRADES } from "./upgrades.ts";
import { PRESTIGE_TIERS } from "./prestige.ts";

export type PluginDispatch = (action: Action) => void;

export interface PluginContent {
  infrastructure?: InfraDef[];
  interns?: InternDef[];
  incidents?: IncidentDef[];
  upgrades?: UpgradeDef[];
  prestigeTiers?: PrestigeTier[];
}

export interface PluginHooks {
  /** Called every game tick (100ms). Return actions to dispatch. */
  onTick?: (state: GameState, tick: number) => Action[];
  /** Called when a new incident spawns. Return actions to dispatch. */
  onIncidentSpawned?: (incident: ActiveIncident, state: GameState) => Action[];
  /** Called when the player purchases infra, an upgrade, or an intern. Return actions to dispatch. */
  onPurchase?: (type: "infra" | "upgrade" | "intern", id: string, state: GameState) => Action[];
  /** Called when the player completes a prestige. Return actions to dispatch. */
  onPrestige?: (prestigeId: string, state: GameState) => Action[];
  /** Called on save — return any data you want persisted. */
  onSave?: (state: GameState) => Record<string, unknown>;
  /** Called on load with whatever was returned by onSave. */
  onLoad?: (saved: Record<string, unknown>) => void;
}

export interface PluginTickPhase {
  /** Run every `interval` ticks (1 tick = 100ms). */
  interval: number;
  run: (state: GameState, tick: number, dispatch: PluginDispatch) => void;
}

export interface PluginMechanics {
  /**
   * Custom reducer handlers keyed by action type string.
   * Dispatch them with: dispatch({ type: "PLUGIN_ACTION", pluginAction: "YOUR_TYPE", payload: ... })
   */
  reducerExtensions?: Record<string, (state: GameState, payload: unknown) => GameState>;
  /** Additional tick phases run inside the main game loop. */
  tickPhases?: PluginTickPhase[];
  /** Additional keyboard shortcuts. `key` is matched against the raw input character. */
  keyHandlers?: Array<{
    key: string;
    run: (state: GameState, dispatch: PluginDispatch) => void;
  }>;
  /** Additional full-width panels that appear in the Tab cycle after the built-in panels. */
  panels?: Array<{
    id: string;
    label: string;
    component: ComponentType<{ state: GameState; dispatch: PluginDispatch }>;
  }>;
}

export interface Plugin {
  /** Unique identifier — must not clash with other plugins. */
  id: string;
  name: string;
  version?: string;
  content?: PluginContent;
  hooks?: PluginHooks;
  mechanics?: PluginMechanics;
}

class PluginRegistry {
  private plugins: Plugin[] = [];

  register(plugin: Plugin): void {
    if (this.plugins.find((p) => p.id === plugin.id)) {
      console.warn(`[plugin] Duplicate plugin id "${plugin.id}" — skipping`);
      return;
    }
    this.plugins.push(plugin);

    // Inject content into global registries before createInitialState() is called
    if (plugin.content?.infrastructure) INFRASTRUCTURE.push(...plugin.content.infrastructure);
    if (plugin.content?.interns) INTERNS.push(...plugin.content.interns);
    if (plugin.content?.incidents) INCIDENTS.push(...plugin.content.incidents);
    if (plugin.content?.upgrades) CLICK_UPGRADES.push(...plugin.content.upgrades);
    if (plugin.content?.prestigeTiers) PRESTIGE_TIERS.push(...plugin.content.prestigeTiers);
  }

  getAll(): Plugin[] {
    return this.plugins;
  }

  // --- Hook runners ---

  runOnTick(state: GameState, tick: number): Action[] {
    return this.plugins.flatMap((p) => p.hooks?.onTick?.(state, tick) ?? []);
  }

  runOnIncidentSpawned(incident: ActiveIncident, state: GameState): Action[] {
    return this.plugins.flatMap((p) => p.hooks?.onIncidentSpawned?.(incident, state) ?? []);
  }

  runOnPurchase(type: "infra" | "upgrade" | "intern", id: string, state: GameState): Action[] {
    return this.plugins.flatMap((p) => p.hooks?.onPurchase?.(type, id, state) ?? []);
  }

  runOnPrestige(prestigeId: string, state: GameState): Action[] {
    return this.plugins.flatMap((p) => p.hooks?.onPrestige?.(prestigeId, state) ?? []);
  }

  runOnSave(state: GameState): Record<string, Record<string, unknown>> {
    const result: Record<string, Record<string, unknown>> = {};
    for (const p of this.plugins) {
      if (p.hooks?.onSave) result[p.id] = p.hooks.onSave(state);
    }
    return result;
  }

  runOnLoad(saved: Record<string, Record<string, unknown>>): void {
    for (const p of this.plugins) {
      if (p.hooks?.onLoad) p.hooks.onLoad(saved[p.id] ?? {});
    }
  }

  // --- Mechanics accessors ---

  getReducerExtension(type: string): ((state: GameState, payload: unknown) => GameState) | undefined {
    for (const p of this.plugins) {
      const handler = p.mechanics?.reducerExtensions?.[type];
      if (handler) return handler;
    }
    return undefined;
  }

  getTickPhases(): PluginTickPhase[] {
    return this.plugins.flatMap((p) => p.mechanics?.tickPhases ?? []);
  }

  getKeyHandlers(): Array<{ key: string; run: (state: GameState, dispatch: PluginDispatch) => void }> {
    return this.plugins.flatMap((p) => p.mechanics?.keyHandlers ?? []);
  }

  getPanels(): Array<{ id: string; label: string; component: ComponentType<{ state: GameState; dispatch: PluginDispatch }> }> {
    return this.plugins.flatMap((p) => p.mechanics?.panels ?? []);
  }
}

export const pluginRegistry = new PluginRegistry();
