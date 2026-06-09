# Plugin API Reference

All types described here are exported from `src/game/plugins.ts`.

---

## Plugin

The top-level object your file must export as its default export.

```ts
interface Plugin {
  id: string;
  name: string;
  version?: string;
  content?: PluginContent;
  hooks?: PluginHooks;
  mechanics?: PluginMechanics;
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier. Used as the key for saved plugin state. Must not clash with other loaded plugins. |
| `name` | Yes | Human-readable name, printed when the plugin loads. |
| `version` | No | Semver string, printed when the plugin loads. |
| `content` | No | New game entities to inject into the game's data arrays. |
| `hooks` | No | Functions that fire at specific game events. |
| `mechanics` | No | Deeper integrations: reducer extensions, tick phases, keybindings, panels. |

---

## PluginContent

```ts
interface PluginContent {
  infrastructure?: InfraDef[];
  interns?: InternDef[];
  incidents?: IncidentDef[];
  upgrades?: UpgradeDef[];
  prestigeTiers?: PrestigeTier[];
}
```

All fields are optional arrays. Each item is appended to the corresponding built-in array before the game initializes.

---

### InfraDef

```ts
interface InfraDef {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  basePerSec: number;
}
```

| Field | Description |
|-------|-------------|
| `id` | Unique string, no spaces. Used in save files. |
| `name` | Displayed in the Infrastructure panel. |
| `description` | Flavor text shown below the name. |
| `baseCost` | Cost of the first unit. |
| `basePerSec` | Passive income per second, per unit owned. |

Cost for the Nth unit: `baseCost × 1.15^(N-1)`. The first unit of a tier unlocks only after you own at least one of the preceding tier. Plugin infrastructure is appended after built-in tiers, so the tier before yours is the last built-in one (us-east-1) unless you add multiple tiers.

---

### InternDef

```ts
interface InternDef {
  id: string;
  name: string;
  role: string;
  hireCost: number;
  specialty: IncidentSpecialty[];
  resolutionTicks: number;
  sideEffectChance: number;
}
```

| Field | Description |
|-------|-------------|
| `id` | Unique string. |
| `name` | Displayed in the Interns panel. |
| `role` | Job title shown below the name. |
| `hireCost` | One-time cost to hire. |
| `specialty` | Array of incident specialty types this intern can resolve. |
| `resolutionTicks` | Base number of ticks to resolve an incident at Junior level (1 tick = 100ms). Reduced by level multipliers. |
| `sideEffectChance` | Base probability (0–1) of spawning a new incident when resolving one. Reduced by level multipliers. |

**IncidentSpecialty values:** `"ec2"` `"s3"` `"lambda"` `"database"` `"iam"` `"general"`

An intern with `"general"` in their specialty list can resolve any incident regardless of its specialty. An intern resolves an incident if their specialty array contains the incident's specialty OR `"general"`.

---

### IncidentDef

```ts
interface IncidentDef {
  id: string;
  name: string;
  flavor: string;
  effect: IncidentEffect;
  specialty: IncidentSpecialty;
  minInfraCount: number;
}
```

| Field | Description |
|-------|-------------|
| `id` | Unique string. |
| `name` | Displayed in the event log and on the active incident line. |
| `flavor` | Message appended to the name in the event log when the incident spawns. |
| `effect` | What the incident does while active (see below). |
| `specialty` | Which intern specialty can resolve this incident. |
| `minInfraCount` | Minimum total infrastructure units owned before this incident can spawn. Use this to gate incidents behind progression. |

**IncidentEffect variants:**

```ts
{ type: "drain_per_sec"; multiplier: number }
```
Multiplies passive $/sec by `multiplier` while active. E.g. `0.8` = -20% income.

```ts
{ type: "click_multiplier"; multiplier: number }
```
Multiplies click income by `multiplier` while active.

```ts
{ type: "one_time_drain"; amount: number }
```
Deducts `amount` credits once when the incident spawns.

```ts
{ type: "disable_infra"; infraId: string }
```
Disables a specific infrastructure tier by id while active (it still exists but contributes 0 $/sec).

```ts
{ type: "halt_all" }
```
Sets passive income to zero while active.

---

### UpgradeDef

```ts
interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  clickBonus: number;
}
```

| Field | Description |
|-------|-------------|
| `id` | Unique string. |
| `name` | Displayed in the Upgrades panel. |
| `description` | Flavor text shown below the name. |
| `cost` | One-time purchase cost. |
| `clickBonus` | Flat credits added to each Space press after purchase. |

Upgrades are one-time purchases — they cannot be bought twice.

---

### PrestigeTier

```ts
interface PrestigeTier {
  id: string;
  name: string;
  tagline: string;
  retrospective: string;
  requiredCredits: number;
  warStoryReward: string;
}
```

| Field | Description |
|-------|-------------|
| `id` | Unique string. |
| `name` | Displayed on the prestige screen. |
| `tagline` | Short subtitle on the prestige screen. |
| `retrospective` | Flavor text shown on the prestige screen. |
| `requiredCredits` | Total credits earned needed to unlock this tier. |
| `warStoryReward` | Description of the reward (display-only — the actual effect must be implemented via `onPrestige` + `reducerExtensions`). |

Prestige tiers are appended after the five built-in tiers. The prestige screen shows them in array order.

---

## PluginHooks

```ts
interface PluginHooks {
  onTick?: (state: GameState, tick: number) => Action[];
  onIncidentSpawned?: (incident: ActiveIncident, state: GameState) => Action[];
  onPurchase?: (type: "infra" | "upgrade" | "intern", id: string, state: GameState) => Action[];
  onPrestige?: (prestigeId: string, state: GameState) => Action[];
  onSave?: (state: GameState) => Record<string, unknown>;
  onLoad?: (saved: Record<string, unknown>) => void;
}
```

All hooks are optional. Hooks that return `Action[]` have each returned action dispatched immediately and synchronously after the hook returns.

---

### onTick

```ts
onTick(state: GameState, tick: number): Action[]
```

Fires every game tick (100ms, 10 times per second). `tick` is the current tick counter for the session (resets to 0 on load).

Use `tickPhases` instead if you only need to run periodically — it's more efficient than checking `tick % N` inside `onTick`.

---

### onIncidentSpawned

```ts
onIncidentSpawned(incident: ActiveIncident, state: GameState): Action[]
```

Fires immediately after a new incident is added to the game. `incident` is the newly spawned `ActiveIncident`:

```ts
interface ActiveIncident {
  id: string;              // unique runtime id, e.g. "inc_42"
  defId: string;           // references an IncidentDef by id
  startedAt: number;       // Date.now() when spawned
  resolvingInternId: null; // always null when first spawned
  resolveTick: null;       // always null when first spawned
}
```

---

### onPurchase

```ts
onPurchase(type: "infra" | "upgrade" | "intern", id: string, state: GameState): Action[]
```

Fires when the player presses the buy key (`b`) for infrastructure or upgrades, or the hire key (`h`) for interns.

**Important:** this fires on the *attempt*, not on success. The reducer may still reject the purchase if the player can't afford it. If you need to confirm a purchase succeeded, check `state.credits` against the item cost yourself before acting.

---

### onPrestige

```ts
onPrestige(prestigeId: string, state: GameState): Action[]
```

Fires after a prestige completes. `prestigeId` is the `id` of the `PrestigeTier` that was just completed. `state` is the pre-prestige state (the prestige action has been dispatched and applied by the time this runs, so `state` reflects the reset).

---

### onSave

```ts
onSave(state: GameState): Record<string, unknown>
```

Fires on every save (auto-save every 30 seconds and on quit). Return any JSON-serializable object you want persisted. It is stored in the save file under your plugin's `id` and passed back to `onLoad` on the next startup.

Return `{}` if you have nothing to persist.

---

### onLoad

```ts
onLoad(saved: Record<string, unknown>): void
```

Fires once during startup after the save file is read. `saved` is whatever your `onSave` returned the last time the game was saved. If the game has never been saved, or your plugin is being loaded for the first time, `saved` is `{}`.

This is the right place to initialize module-level plugin state from persisted values.

---

## PluginMechanics

```ts
interface PluginMechanics {
  reducerExtensions?: Record<string, (state: GameState, payload: unknown) => GameState>;
  tickPhases?: PluginTickPhase[];
  keyHandlers?: Array<{ key: string; run: (state: GameState, dispatch: PluginDispatch) => void }>;
  panels?: Array<{ id: string; label: string; component: ComponentType<{ state: GameState; dispatch: PluginDispatch }> }>;
}
```

---

### reducerExtensions

```ts
reducerExtensions: Record<string, (state: GameState, payload: unknown) => GameState>
```

A map of action type strings to pure reducer functions. Each function receives the current `GameState` and the `payload` from the dispatched action, and must return a new `GameState`.

**Naming:** use a namespaced format — `"my-plugin/ACTION_NAME"` — to avoid collisions with other plugins.

**Dispatching:** use the `PLUGIN_ACTION` wrapper:

```ts
dispatch({
  type: "PLUGIN_ACTION",
  pluginAction: "my-plugin/MY_ACTION",
  payload: { value: 42 },
});
```

**Example:**

```ts
reducerExtensions: {
  "my-plugin/ADD_CREDITS": (state, payload) => {
    const { amount } = payload as { amount: number };
    return {
      ...state,
      credits: state.credits + amount,
      totalCreditsEarned: state.totalCreditsEarned + amount,
    };
  },
}
```

---

### tickPhases

```ts
interface PluginTickPhase {
  interval: number;
  run: (state: GameState, tick: number, dispatch: PluginDispatch) => void;
}
```

| Field | Description |
|-------|-------------|
| `interval` | Run every `interval` ticks. `interval: 10` = every second, `interval: 300` = every 30 seconds. |
| `run` | Called when the tick counter is divisible by `interval`. |

Tick phases run inside the game loop after all built-in phases (income, incidents, interns, milestones). Multiple tick phases from multiple plugins all run in registration order.

---

### keyHandlers

```ts
Array<{
  key: string;
  run: (state: GameState, dispatch: PluginDispatch) => void;
}>
```

| Field | Description |
|-------|-------------|
| `key` | The raw input character to match (case-sensitive). |
| `run` | Called when the player presses `key` during normal gameplay (not on overlay screens). |

Plugin key handlers run after all built-in key checks. **Do not use these reserved keys:** `b`, `h`, `u`, `r`, `p`, `n`, `q`, and do not use Space, Tab, or arrow keys.

---

### panels

```ts
Array<{
  id: string;
  label: string;
  component: ComponentType<{ state: GameState; dispatch: PluginDispatch }>;
}>
```

| Field | Description |
|-------|-------------|
| `id` | Unique panel identifier. Used as the `focusedPanel` value in `GameState`. Must not clash with `"infra"`, `"interns"`, `"upgrades"`, or other plugin panel ids. |
| `label` | Short label shown in the status bar when this panel is focused. |
| `component` | A React component rendered by Ink. Receives `state` and `dispatch` as props. |

Panels appear in the Tab cycle after the three built-in panels. The component is mounted only when the panel is focused.

---

## PluginDispatch

```ts
type PluginDispatch = (action: Action) => void;
```

The dispatch function passed to `tickPhases.run`, `keyHandlers.run`, and panel components. Identical to the React `dispatch` from `useReducer` — accepts any built-in `Action` or a `PLUGIN_ACTION`.

---

## Built-in Action types

These are the most useful built-in actions to dispatch from plugin hooks and mechanics.

| Action | Fields | Effect |
|--------|--------|--------|
| `LOG` | `message: string`, `emoji: string` | Appends a message to the event log (capped at 20 entries). |
| `APPLY_INCOME` | `amount: number` | Adds `amount` to credits and totalCreditsEarned. |
| `ADD_INCIDENT` | `incident: ActiveIncident` | Spawns a new incident. |
| `PLUGIN_ACTION` | `pluginAction: string`, `payload: unknown` | Routes to a registered `reducerExtension` handler. |

Avoid dispatching actions that affect navigation state (`NAV_UP`, `NAV_DOWN`, `FOCUS_PANEL`) or system state (`TICK`, `LOAD_SAVE`, `PRESTIGE`) from plugin hooks — these can produce unpredictable results.
