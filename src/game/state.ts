import { useReducer } from "react";
import { INFRASTRUCTURE, infraCost } from "./infrastructure.ts";
import { INCIDENTS, type ActiveIncident } from "./incidents.ts";
import { INTERNS, INTERN_QUIPS, INTERN_SIDE_EFFECT_QUIPS, INTERN_LEVEL_UPGRADE_COST, type HiredIntern, type InternLevel } from "./interns.ts";
import { computeWarStoryEffects, type WarStoryEffects } from "./prestige.ts";
import { CLICK_UPGRADES } from "./upgrades.ts";
import { pluginRegistry } from "./plugins.ts";

export interface OwnedInfra {
  defId: string;
  count: number;
}

export interface LogEntry {
  id: number;
  message: string;
  emoji: string;
}

// Built-in panels plus any string id registered by plugins
export type Panel = "infra" | "interns" | "upgrades" | (string & {});

export interface GameState {
  credits: number;
  totalCreditsEarned: number;
  tick: number;

  ownedInfra: OwnedInfra[];
  hiredInterns: HiredIntern[];
  activeIncidents: ActiveIncident[];
  purchasedUpgradeIds: string[];

  completedPrestigeIds: string[];
  warStoryEffects: WarStoryEffects;

  log: LogEntry[];
  logIdCounter: number;

  lastAction: string;
  shipItIndex: number;

  focusedPanel: Panel;
  selectedInfraIndex: number;
  selectedInternIndex: number;
  selectedUpgradeIndex: number;

  milestonesSeen: number[];
  lastSavedAt: number;

  showPrestige: boolean;
  prestigeConfirming: boolean;

  /** Keyed by plugin id — persisted through save/load via plugin onSave/onLoad hooks. */
  pluginState: Record<string, Record<string, unknown>>;
}

export type Action =
  | { type: "TICK" }
  | { type: "APPLY_INCOME"; amount: number }
  | { type: "SHIP_IT"; actionText: string; earn: number }
  | { type: "BUY_INFRA"; index: number }
  | { type: "BUY_UPGRADE"; id: string }
  | { type: "HIRE_INTERN"; defId: string }
  | { type: "LEVEL_UP_INTERN"; defId: string }
  | { type: "ASSIGN_INTERN"; incidentId: string; internId: string; resolveTick: number }
  | { type: "RESOLVE_INCIDENT_MANUAL"; incidentId: string }
  | { type: "RESOLVE_INCIDENT_INTERN"; incidentId: string; internId: string; sideEffect: boolean }
  | { type: "ADD_INCIDENT"; incident: ActiveIncident }
  | { type: "FOCUS_PANEL"; panel: Panel }
  | { type: "NAV_UP" }
  | { type: "NAV_DOWN" }
  | { type: "TOGGLE_PRESTIGE" }
  | { type: "CONFIRM_PRESTIGE" }
  | { type: "CANCEL_PRESTIGE" }
  | { type: "PRESTIGE"; prestigeId: string }
  | { type: "LOAD_SAVE"; state: GameState }
  | { type: "LOG"; message: string; emoji: string }
  | { type: "MARK_MILESTONE"; credits: number }
  | { type: "SET_LAST_SAVED_AT"; ts: number }
  | { type: "PLUGIN_ACTION"; pluginAction: string; payload: unknown };

function initialInfra(): OwnedInfra[] {
  return INFRASTRUCTURE.map((def) => ({ defId: def.id, count: 0 }));
}

function addLog(
  log: LogEntry[],
  logIdCounter: number,
  message: string,
  emoji: string
): { log: LogEntry[]; logIdCounter: number } {
  const entry: LogEntry = { id: logIdCounter, message, emoji };
  return { log: [entry, ...log].slice(0, 20), logIdCounter: logIdCounter + 1 };
}

/**
 * Creates a fresh initial state. Called after plugins are loaded so that
 * plugin-contributed infrastructure, interns, etc. are included from the start.
 */
export function createInitialState(): GameState {
  return {
    credits: 0,
    totalCreditsEarned: 0,
    tick: 0,

    ownedInfra: initialInfra(),
    hiredInterns: [],
    activeIncidents: [],
    purchasedUpgradeIds: [],

    completedPrestigeIds: [],
    warStoryEffects: computeWarStoryEffects([]),

    log: [{ id: 0, message: "Welcome. You have nothing. Start shipping.", emoji: "~" }],
    logIdCounter: 1,

    lastAction: "Nothing shipped yet",
    shipItIndex: 0,

    focusedPanel: "upgrades",
    selectedInfraIndex: 0,
    selectedInternIndex: 0,
    selectedUpgradeIndex: 0,

    milestonesSeen: [],
    lastSavedAt: Date.now(),

    showPrestige: false,
    prestigeConfirming: false,

    pluginState: {},
  };
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "TICK":
      return { ...state, tick: state.tick + 1 };

    case "APPLY_INCOME": {
      const earned = action.amount;
      return {
        ...state,
        credits: state.credits + earned,
        totalCreditsEarned: state.totalCreditsEarned + earned,
      };
    }

    case "SHIP_IT": {
      const { log, logIdCounter } = addLog(state.log, state.logIdCounter, action.actionText, ">>");
      return {
        ...state,
        credits: state.credits + action.earn,
        totalCreditsEarned: state.totalCreditsEarned + action.earn,
        lastAction: action.actionText,
        shipItIndex: state.shipItIndex + 1,
        log,
        logIdCounter,
      };
    }

    case "BUY_INFRA": {
      const infra = INFRASTRUCTURE[action.index];
      const owned = state.ownedInfra[action.index];
      if (!infra || !owned) return state;
      const cost = infraCost(infra, owned.count);
      if (state.credits < cost) return state;
      const prevOwned = action.index > 0 ? state.ownedInfra[action.index - 1] : null;
      if (prevOwned !== null && prevOwned !== undefined && prevOwned.count === 0) return state;

      const newOwned = state.ownedInfra.map((o, i) =>
        i === action.index ? { ...o, count: o.count + 1 } : o
      );
      const { log, logIdCounter } = addLog(state.log, state.logIdCounter, `Provisioned ${infra.name}. The bill will be fine.`, "[+]");
      return { ...state, credits: state.credits - cost, ownedInfra: newOwned, log, logIdCounter };
    }

    case "HIRE_INTERN": {
      const def = INTERNS.find((i) => i.id === action.defId);
      if (!def) return state;
      if (state.credits < def.hireCost) return state;
      if (state.hiredInterns.find((i) => i.defId === action.defId)) return state;
      const newIntern: HiredIntern = { defId: action.defId, level: "Junior", busy: false };
      const { log, logIdCounter } = addLog(state.log, state.logIdCounter, `${def.name} joined. Orientation is tomorrow. Maybe.`, "[>]");
      return {
        ...state,
        credits: state.credits - def.hireCost,
        hiredInterns: [...state.hiredInterns, newIntern],
        log,
        logIdCounter,
      };
    }

    case "LEVEL_UP_INTERN": {
      const intern = state.hiredInterns.find((i) => i.defId === action.defId);
      const def = INTERNS.find((i) => i.id === action.defId);
      if (!intern || !def) return state;
      if (intern.level === "Staff") return state;
      const nextLevel: InternLevel = intern.level === "Junior" ? "Mid" : "Staff";
      const cost = INTERN_LEVEL_UPGRADE_COST[nextLevel];
      if (state.credits < cost) return state;
      const { log, logIdCounter } = addLog(state.log, state.logIdCounter, `${def.name} promoted to ${nextLevel}. They asked for equity.`, "^^");
      return {
        ...state,
        credits: state.credits - cost,
        hiredInterns: state.hiredInterns.map((i) =>
          i.defId === action.defId ? { ...i, level: nextLevel } : i
        ),
        log,
        logIdCounter,
      };
    }

    case "ASSIGN_INTERN": {
      const internDef = INTERNS.find((d) => d.id === action.internId);
      const incidentDef = INCIDENTS.find((d) => {
        const inc = state.activeIncidents.find((i) => i.id === action.incidentId);
        return d.id === inc?.defId;
      });
      const { log, logIdCounter } = addLog(
        state.log,
        state.logIdCounter,
        `${internDef?.name ?? "Intern"} assigned to ${incidentDef?.name ?? "incident"}. Confidence: medium.`,
        ".."
      );
      return {
        ...state,
        activeIncidents: state.activeIncidents.map((i) =>
          i.id === action.incidentId
            ? { ...i, resolvingInternId: action.internId, resolveTick: action.resolveTick }
            : i
        ),
        hiredInterns: state.hiredInterns.map((h) =>
          h.defId === action.internId ? { ...h, busy: true } : h
        ),
        log,
        logIdCounter,
      };
    }

    case "ADD_INCIDENT": {
      const def = INCIDENTS.find((d) => d.id === action.incident.defId);
      const { log, logIdCounter } = addLog(state.log, state.logIdCounter, `${def?.name ?? "Incident"}: ${def?.flavor ?? ""}`, "[!]");
      return { ...state, activeIncidents: [...state.activeIncidents, action.incident], log, logIdCounter };
    }

    case "RESOLVE_INCIDENT_MANUAL": {
      const incident = state.activeIncidents.find((i) => i.id === action.incidentId);
      const def = INCIDENTS.find((d) => d.id === incident?.defId);
      const { log, logIdCounter } = addLog(state.log, state.logIdCounter, `${def?.name ?? "Incident"} resolved manually. Barely.`, "ok");
      return {
        ...state,
        activeIncidents: state.activeIncidents.filter((i) => i.id !== action.incidentId),
        hiredInterns: state.hiredInterns.map((h) =>
          h.defId === incident?.resolvingInternId ? { ...h, busy: false } : h
        ),
        log,
        logIdCounter,
      };
    }

    case "RESOLVE_INCIDENT_INTERN": {
      const incident = state.activeIncidents.find((i) => i.id === action.incidentId);
      const def = INCIDENTS.find((d) => d.id === incident?.defId);
      const internDef = INTERNS.find((d) => d.id === action.internId);
      const quips = INTERN_QUIPS[action.internId] ?? [];
      const quip = quips[Math.floor(Math.random() * quips.length)] ?? "Fixed it.";
      const sideQuip = action.sideEffect
        ? (INTERN_SIDE_EFFECT_QUIPS[action.internId] ?? [])[0]
        : null;

      let { log, logIdCounter } = addLog(state.log, state.logIdCounter, `${internDef?.name}: ${quip}`, "ok");
      if (sideQuip) {
        ({ log, logIdCounter } = addLog(log, logIdCounter, sideQuip, "!!"));
      }

      return {
        ...state,
        activeIncidents: state.activeIncidents.filter((i) => i.id !== action.incidentId),
        hiredInterns: state.hiredInterns.map((h) =>
          h.defId === action.internId ? { ...h, busy: false } : h
        ),
        log,
        logIdCounter,
      };
    }

    case "BUY_UPGRADE": {
      const def = CLICK_UPGRADES.find((u) => u.id === action.id);
      if (!def) return state;
      if (state.credits < def.cost) return state;
      if (state.purchasedUpgradeIds.includes(def.id)) return state;
      const { log, logIdCounter } = addLog(state.log, state.logIdCounter, `Purchased ${def.name}. ${def.description}`, "[$]");
      return {
        ...state,
        credits: state.credits - def.cost,
        purchasedUpgradeIds: [...state.purchasedUpgradeIds, def.id],
        log,
        logIdCounter,
      };
    }

    case "FOCUS_PANEL":
      return { ...state, focusedPanel: action.panel };

    case "NAV_UP": {
      if (state.focusedPanel === "infra")
        return { ...state, selectedInfraIndex: Math.max(0, state.selectedInfraIndex - 1) };
      if (state.focusedPanel === "interns")
        return { ...state, selectedInternIndex: Math.max(0, state.selectedInternIndex - 1) };
      if (state.focusedPanel === "upgrades")
        return { ...state, selectedUpgradeIndex: Math.max(0, state.selectedUpgradeIndex - 1) };
      return state;
    }

    case "NAV_DOWN": {
      if (state.focusedPanel === "infra")
        return { ...state, selectedInfraIndex: Math.min(INFRASTRUCTURE.length - 1, state.selectedInfraIndex + 1) };
      if (state.focusedPanel === "interns")
        return { ...state, selectedInternIndex: Math.min(INTERNS.length - 1, state.selectedInternIndex + 1) };
      if (state.focusedPanel === "upgrades")
        return { ...state, selectedUpgradeIndex: Math.min(CLICK_UPGRADES.length - 1, state.selectedUpgradeIndex + 1) };
      return state;
    }

    case "TOGGLE_PRESTIGE":
      return { ...state, showPrestige: !state.showPrestige, prestigeConfirming: false };

    case "CONFIRM_PRESTIGE":
      return { ...state, prestigeConfirming: true };

    case "CANCEL_PRESTIGE":
      return { ...state, showPrestige: false, prestigeConfirming: false };

    case "PRESTIGE": {
      const newCompleted = [...state.completedPrestigeIds, action.prestigeId];
      const newEffects = computeWarStoryEffects(newCompleted);
      const fresh = createInitialState();
      const { log, logIdCounter } = addLog(
        fresh.log,
        fresh.logIdCounter,
        "Migration complete. You feel wiser. You are not.",
        "~~"
      );
      return {
        ...fresh,
        completedPrestigeIds: newCompleted,
        warStoryEffects: newEffects,
        milestonesSeen: state.milestonesSeen,
        pluginState: state.pluginState,
        lastSavedAt: Date.now(),
        log,
        logIdCounter,
      };
    }

    case "LOAD_SAVE":
      return { ...action.state, tick: 0, showPrestige: false, prestigeConfirming: false };

    case "LOG": {
      const { log, logIdCounter } = addLog(state.log, state.logIdCounter, action.message, action.emoji);
      return { ...state, log, logIdCounter };
    }

    case "MARK_MILESTONE":
      return { ...state, milestonesSeen: [...state.milestonesSeen, action.credits] };

    case "SET_LAST_SAVED_AT":
      return { ...state, lastSavedAt: action.ts };

    case "PLUGIN_ACTION": {
      const handler = pluginRegistry.getReducerExtension(action.pluginAction);
      return handler ? handler(state, action.payload) : state;
    }

    default:
      return state;
  }
}

export function useGameState(initialState?: GameState) {
  return useReducer(reducer, initialState ?? createInitialState());
}
