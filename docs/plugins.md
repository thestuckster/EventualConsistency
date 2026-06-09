# Eventual Consistency — Plugin System

Plugins let you extend the game with new content, react to game events, add custom mechanics, and even build entirely new UI panels — all without touching the core codebase.

---

## Table of Contents

1. [Installing Plugins](#installing-plugins)
2. [How the Plugin System Works](#how-the-plugin-system-works)
3. [Plugin API Reference](#plugin-api-reference)
   - [Plugin Interface](#plugin-interface)
   - [PluginContent](#plugincontent)
   - [PluginHooks](#pluginhooks)
   - [PluginMechanics](#pluginmechanics)
4. [Creating Your First Plugin](#creating-your-first-plugin)
5. [Dispatching Custom Actions](#dispatching-custom-actions)
6. [Advanced: Custom Panels](#advanced-custom-panels)
7. [Tips and Gotchas](#tips-and-gotchas)

---

## Installing Plugins

Plugins live in `~/.eventual-consistency/plugins/`. Each plugin is a single `.js` or `.ts` file.

```
~/.eventual-consistency/
├── save.json          ← your save file
└── plugins/
    ├── my-plugin.ts   ← loaded automatically on startup
    └── another.js
```

**Steps:**

1. Create the plugins directory if it doesn't exist:
   ```sh
   mkdir -p ~/.eventual-consistency/plugins
   ```
2. Drop your plugin file (`.ts` or `.js`) into that directory.
3. Start or restart the game — plugins are loaded once at startup.

The game will print a confirmation line for each plugin that loads successfully:
```
[plugin] Loaded: My Plugin (my-plugin v1.0.0)
```

If a plugin fails to load, the error is printed and the game continues without it.

---

## How the Plugin System Works

When the game starts, before rendering anything, it scans `~/.eventual-consistency/plugins/` and dynamically imports every `.ts` / `.js` file it finds. Each file must export a `Plugin` object as its **default export**.

The `Plugin` object is passed to the plugin registry, which:

1. **Injects content** (new infrastructure, interns, incidents, upgrades, prestige tiers) directly into the game's data arrays — so they appear in the UI as if they were built-in.
2. **Registers hooks** that fire at specific game events (tick, incident spawned, purchase, prestige).
3. **Registers mechanics** that run inside the game loop, respond to keypresses, or render custom UI panels.

Because plugins are loaded before the game state is initialized, any content they add is included in fresh saves and properly migrated into existing saves.

---

## Plugin API Reference

All types are exported from `src/game/plugins.ts`. If you're writing a TypeScript plugin and want type checking, you can import them from the game source.

### Plugin Interface

```ts
interface Plugin {
  id: string;       // unique identifier — must not clash with other plugins
  name: string;     // human-readable name shown on load
  version?: string; // optional semver string shown on load

  content?: PluginContent;
  hooks?: PluginHooks;
  mechanics?: PluginMechanics;
}
```

Your plugin file must export this as its **default export**:

```ts
export default {
  id: "my-plugin",
  name: "My Plugin",
  version: "1.0.0",
  // ...
} satisfies Plugin;
```

---

### PluginContent

Add new game entities. They are merged into the built-in arrays before the game initializes.

```ts
interface PluginContent {
  infrastructure?: InfraDef[];   // new buildings/services to buy
  interns?: InternDef[];         // new interns to hire
  incidents?: IncidentDef[];     // new incidents that can spawn
  upgrades?: UpgradeDef[];       // new one-time click upgrades
  prestigeTiers?: PrestigeTier[]; // new prestige milestones
}
```

#### InfraDef

```ts
interface InfraDef {
  id: string;          // unique, no spaces
  name: string;        // displayed in the infra panel
  description: string; // flavor text shown below the name
  baseCost: number;    // cost for the first unit
  basePerSec: number;  // passive income per second per unit
}
```

Cost scales at 15% per unit owned: `baseCost * 1.15^owned`.

#### InternDef

```ts
interface InternDef {
  id: string;
  name: string;
  role: string;
  hireCost: number;
  specialty: IncidentSpecialty[];  // which incident types this intern can resolve
  resolutionTicks: number;         // base ticks to resolve an incident (1 tick = 100ms)
  sideEffectChance: number;        // 0–1 probability of causing a new incident on resolve
}
```

`IncidentSpecialty` values: `"ec2" | "s3" | "lambda" | "database" | "iam" | "general"`

#### IncidentDef

```ts
interface IncidentDef {
  id: string;
  name: string;
  flavor: string;           // message shown in the event log when it spawns
  minInfraCount: number;    // only spawns when the player owns at least this many infra units
  specialty: IncidentSpecialty;
  effect: IncidentEffect;
}
```

`IncidentEffect` variants:

| type | fields | description |
|------|--------|-------------|
| `drain_per_sec` | `multiplier: number` | multiplies passive income (e.g. `0.8` = -20%) |
| `click_multiplier` | `multiplier: number` | multiplies click income |
| `one_time_drain` | `amount: number` | deducts credits once on spawn |
| `disable_infra` | `infraId: string` | disables a specific infrastructure type |
| `halt_all` | — | sets passive income to zero |

#### UpgradeDef

```ts
interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  clickBonus: number;  // flat credits added per [Space] press
}
```

#### PrestigeTier

```ts
interface PrestigeTier {
  id: string;
  name: string;
  tagline: string;
  retrospective: string;  // flavor text shown on the prestige screen
  requiredCredits: number;
  warStoryReward: string; // description of the reward (display only — implement via hooks/mechanics)
}
```

Note: prestige tiers added by plugins are display-only entries. To actually apply war story effects from a plugin prestige, use the `onPrestige` hook combined with a custom reducer extension.

---

### PluginHooks

Hooks fire at specific moments in the game loop. Each hook returns an array of `Action` objects that are dispatched immediately.

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

#### onTick

Called every game tick (100ms). Use sparingly — this runs 10 times per second.

```ts
onTick(state, tick) {
  // fire every 5 seconds (50 ticks)
  if (tick % 50 === 0) {
    return [{ type: "LOG", message: "Still alive.", emoji: "~" }];
  }
  return [];
}
```

#### onIncidentSpawned

Called immediately after a new incident is added to the game. The `incident` argument is the newly spawned `ActiveIncident`.

#### onPurchase

Called when the player presses the buy key for infra/upgrades or the hire key for interns. Note: this fires on the *attempt* — the reducer may still reject the purchase if the player cannot afford it. Check `state.credits` vs the item cost if you need to guard against that.

#### onPrestige

Called after the prestige action completes. `prestigeId` identifies which tier was completed.

#### onSave / onLoad

Use these to persist plugin-specific state across sessions.

```ts
hooks: {
  onSave(state) {
    return { myCounter: myPluginCounter };
  },
  onLoad(saved) {
    myPluginCounter = (saved.myCounter as number) ?? 0;
  },
}
```

The data returned by `onSave` is stored in the save file under your plugin's `id` and passed back to `onLoad` on the next game start.

---

### PluginMechanics

For deeper integration: custom reducer logic, additional game loop phases, extra keyboard shortcuts, and new UI panels.

```ts
interface PluginMechanics {
  reducerExtensions?: Record<string, (state: GameState, payload: unknown) => GameState>;
  tickPhases?: PluginTickPhase[];
  keyHandlers?: Array<{ key: string; run: (state: GameState, dispatch: PluginDispatch) => void }>;
  panels?: Array<{
    id: string;
    label: string;
    component: ComponentType<{ state: GameState; dispatch: PluginDispatch }>;
  }>;
}
```

#### reducerExtensions

Add custom actions to the game's reducer. Keyed by a string action type name (use a namespaced name like `"MY_PLUGIN/MY_ACTION"` to avoid collisions).

Dispatch your custom actions using the built-in `PLUGIN_ACTION` wrapper:

```ts
dispatch({
  type: "PLUGIN_ACTION",
  pluginAction: "MY_PLUGIN/MY_ACTION",
  payload: { someData: 42 },
});
```

The handler receives `(state, payload)` and must return the new `GameState`:

```ts
reducerExtensions: {
  "MY_PLUGIN/MY_ACTION": (state, payload) => {
    const p = payload as { someData: number };
    return { ...state, credits: state.credits + p.someData };
  },
}
```

#### tickPhases

Additional phases that run inside the main 100ms game loop. `interval` specifies how many ticks between executions.

```ts
tickPhases: [{
  interval: 100, // run every 10 seconds
  run(state, tick, dispatch) {
    dispatch({ type: "LOG", message: "Bonus event!", emoji: "[!]" });
  },
}]
```

#### keyHandlers

Bind a keyboard shortcut. `key` is the raw input character. Built-in keys (`b`, `h`, `u`, `r`, `p`, `n`, `q`, space, tab, arrows) take priority — plugin handlers run after all built-in checks.

```ts
keyHandlers: [{
  key: "x",
  run(state, dispatch) {
    dispatch({ type: "LOG", message: "X pressed!", emoji: "~~" });
  },
}]
```

#### panels

Add a full-width UI panel that appears in the Tab cycle after the built-in Upgrades / Infra / Interns panels. The `component` is a React component rendered by Ink.

```ts
panels: [{
  id: "my-panel",
  label: "My Panel",
  component: ({ state, dispatch }) => (
    <Box flexDirection="column">
      <Text bold>My Custom Panel</Text>
      <Text>Credits: {state.credits}</Text>
    </Box>
  ),
}]
```

---

## Creating Your First Plugin

Here's a complete working plugin that adds a new AWS service, a custom incident, and logs a message on prestige:

```ts
// ~/.eventual-consistency/plugins/quantum-cloud.ts
import type { Plugin } from "/path/to/EventualConsistency/src/game/plugins.ts";

export default {
  id: "quantum-cloud",
  name: "Quantum Cloud",
  version: "1.0.0",

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

  hooks: {
    onPrestige(prestigeId, state) {
      return [{
        type: "LOG",
        message: `Quantum entanglement recalibrated after ${prestigeId} migration.`,
        emoji: "[Q]",
      }];
    },
  },
} satisfies Plugin;
```

Save it to `~/.eventual-consistency/plugins/quantum-cloud.ts` and start the game. The Quantum VPC will appear at the bottom of the infrastructure list and Schrodinger's Deploy can spawn once you own 10+ infrastructure units.

---

## Dispatching Custom Actions

If you need to modify game state in ways beyond the built-in actions, use `reducerExtensions` + `PLUGIN_ACTION`:

```ts
export default {
  id: "bonus-credits",
  name: "Bonus Credits",

  mechanics: {
    reducerExtensions: {
      "bonus-credits/ADD_BONUS": (state, payload) => {
        const { amount } = payload as { amount: number };
        return {
          ...state,
          credits: state.credits + amount,
          totalCreditsEarned: state.totalCreditsEarned + amount,
        };
      },
    },

    keyHandlers: [{
      key: "x",
      run(state, dispatch) {
        dispatch({
          type: "PLUGIN_ACTION",
          pluginAction: "bonus-credits/ADD_BONUS",
          payload: { amount: 1000 },
        });
      },
    }],
  },
} satisfies Plugin;
```

Press `x` in-game to add $1,000 to your credits.

---

## Advanced: Custom Panels

Panels are rendered using [Ink](https://github.com/vadimdemedes/ink) — React for the terminal. Your component receives the full `GameState` and a `dispatch` function.

```ts
import React from "react";
import { Box, Text } from "ink";
import type { Plugin } from "/path/to/EventualConsistency/src/game/plugins.ts";

const StatsPanel = ({ state }) => (
  <Box flexDirection="column" borderStyle="single" borderColor="cyan" padding={1}>
    <Text bold color="cyan">STATS</Text>
    <Text>Total earned: ${state.totalCreditsEarned.toFixed(2)}</Text>
    <Text>Active incidents: {state.activeIncidents.length}</Text>
    <Text>Interns hired: {state.hiredInterns.length}</Text>
  </Box>
);

export default {
  id: "stats-panel",
  name: "Stats Panel",
  mechanics: {
    panels: [{
      id: "stats",
      label: "Stats",
      component: StatsPanel,
    }],
  },
} satisfies Plugin;
```

Tab to the new "Stats" panel in-game to see it rendered.

---

## Tips and Gotchas

- **Plugin `id` must be unique.** If two plugins share an id, the second is silently skipped.
- **Content is appended, not merged.** Plugin infrastructure is added after the built-in 14 items. Existing save files get the new slots with count 0 via migration.
- **`onPurchase` fires on attempt, not on success.** Check `state.credits` vs item cost if you need to guard against failed purchases.
- **`onTick` runs 10 times per second.** Keep it cheap. Use `tickPhases` with a larger `interval` for periodic work.
- **Key conflicts:** Plugin key handlers run after all built-in keys. Don't use `b`, `h`, `u`, `r`, `p`, `n`, `q`, space, tab, or arrow keys.
- **`onSave` / `onLoad` store data by plugin id.** If you rename your plugin's `id`, previously saved data will not be restored.
- **Plugins load once at startup.** Changes to a plugin file require restarting the game.
- **TypeScript plugins** are supported natively via Bun — no compilation step needed.
