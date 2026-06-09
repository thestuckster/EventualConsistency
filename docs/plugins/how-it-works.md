# How Plugins Work

This document explains the internals of the plugin system — how plugins are discovered, how content gets injected into the game, and how each capability (hooks, mechanics, panels) integrates with the engine.

---

## Loading lifecycle

When the game starts (`index.ts`), the very first thing it does — before loading your save file, before rendering anything — is call `loadPlugins()`. This function:

1. Checks if `~/.eventual-consistency/plugins/` exists. If not, it returns immediately.
2. Reads all `.ts` and `.js` files in that directory.
3. Dynamically imports each file via `import(fullPath)`.
4. Reads the `default` export (or a named `plugin` export as a fallback).
5. Passes the plugin object to `pluginRegistry.register()`.

After all plugins have been registered, the game loads the save file and renders. By this point, any content contributed by plugins is already part of the game's data arrays.

```
startup
  └── loadPlugins()
        ├── import plugin-a.ts → pluginRegistry.register(...)
        ├── import plugin-b.ts → pluginRegistry.register(...)
        └── import plugin-c.ts → pluginRegistry.register(...)
  └── loadGame()         ← save migration uses updated data arrays
  └── render(<App />)    ← initial state built from updated data arrays
```

If a plugin throws during import (syntax error, missing dependency, etc.), the error is printed to stderr and the game continues without that plugin.

---

## Content injection

When `pluginRegistry.register()` is called, any content declared in `plugin.content` is **pushed directly into the game's data arrays**:

```
plugin.content.infrastructure  →  INFRASTRUCTURE[]
plugin.content.interns         →  INTERNS[]
plugin.content.incidents       →  INCIDENTS[]
plugin.content.upgrades        →  CLICK_UPGRADES[]
plugin.content.prestigeTiers   →  PRESTIGE_TIERS[]
```

These are the same arrays the built-in game data lives in, so plugin content is indistinguishable from built-in content at runtime. All the existing systems — the infra panel, incident spawner, intern assignment, upgrade panel — pick it up automatically.

### Initial state

`createInitialState()` is a function (not a module-level constant) that builds the initial `GameState` by reading the current state of those arrays. Because plugins are loaded before `createInitialState()` is ever called, the initial state includes plugin infrastructure slots, owned-infra entries, etc.

### Save migration

When an existing save is loaded, `createInitialState()` is spread as a base, then the saved data is overlaid on top. This means:

- Plugin infrastructure added after a save was created gets initialized to `{ count: 0 }` automatically.
- If you remove a plugin, its infrastructure slots stay in the save file but are harmlessly ignored at runtime.

---

## Hooks

Hooks are functions you provide that fire at specific moments in the game loop. Each hook receives relevant state and returns an array of `Action` objects. Those actions are dispatched immediately after the hook returns.

### When each hook fires

| Hook | When |
|------|------|
| `onTick` | Every game tick (100ms) |
| `onIncidentSpawned` | Immediately after a new incident is added |
| `onPurchase` | When the player presses the buy/hire key |
| `onPrestige` | After a prestige completes |
| `onSave` | When the game saves (auto-save or on quit) |
| `onLoad` | After the save file is loaded at startup |

### Returning actions from hooks

Hooks that return `Action[]` dispatch each action in order, synchronously, right after the hook returns. You can return any built-in action type. The most commonly useful ones from a plugin:

```ts
{ type: "LOG", message: "something happened", emoji: "[!]" }
{ type: "APPLY_INCOME", amount: 1000 }
{ type: "PLUGIN_ACTION", pluginAction: "my-plugin/MY_TYPE", payload: { ... } }
```

### onSave / onLoad

These two hooks are for persisting plugin-specific data across sessions. `onSave` returns a plain object; `onLoad` receives whatever was returned by `onSave`. The data is stored in the save file under your plugin's `id` and is completely isolated from other plugins.

```ts
hooks: {
  onSave(state) {
    return { myCounter: myPluginState.counter };
  },
  onLoad(saved) {
    myPluginState.counter = (saved.myCounter as number) ?? 0;
  },
}
```

---

## Mechanics

Mechanics are deeper integrations: custom reducer logic, game loop phases, keybindings, and UI panels.

### reducerExtensions

You can register custom reducer handlers keyed by an action type string. Because the game's `Action` type is a closed union, custom actions are dispatched through a wrapper:

```ts
dispatch({
  type: "PLUGIN_ACTION",
  pluginAction: "my-plugin/CUSTOM_ACTION",
  payload: { someValue: 42 },
});
```

The reducer looks up `"my-plugin/CUSTOM_ACTION"` in the plugin registry and calls your handler with `(state, payload)`. Your handler returns the new `GameState`.

Use a namespaced format like `"plugin-id/ACTION_NAME"` to avoid collisions with other plugins.

### tickPhases

Tick phases are functions that run inside the main game loop at a specified interval. `interval: 100` means "run every 100 ticks" (every 10 seconds). They receive the current state, the current tick number, and `dispatch`.

This is the right place for periodic plugin behavior — awarding bonuses, checking conditions, spawning custom events. Prefer `tickPhases` over `onTick` for anything that doesn't need to run every single tick.

```ts
tickPhases: [{
  interval: 300, // every 30 seconds
  run(state, tick, dispatch) {
    // your logic here
  },
}]
```

### keyHandlers

Keyboard handlers bind a raw input character to a function. Plugin key handlers run after all built-in keys are checked, so they cannot shadow built-in bindings.

**Reserved keys** (do not use): `b`, `h`, `u`, `r`, `p`, `n`, `q`, `Space`, `Tab`, arrow keys.

### panels

Panels are full React/Ink components that appear in the Tab cycle after the three built-in panels (Upgrades → Infra → Interns → *your panels*). The component receives `state` (the full `GameState`) and `dispatch`.

Panels are rendered only when focused — the component is mounted and unmounted as the player tabs in and out.

```ts
panels: [{
  id: "my-panel",       // must be unique
  label: "My Panel",    // shown in status bar when focused
  component: ({ state, dispatch }) => (
    <Box flexDirection="column">
      <Text bold>Hello from plugin</Text>
    </Box>
  ),
}]
```

---

## Plugin state and the GameState

`GameState` has a `pluginState` field:

```ts
pluginState: Record<string, Record<string, unknown>>
```

This is populated automatically by the `onSave` / `onLoad` hooks — you don't interact with it directly. It persists through save/load and is preserved (not reset) through prestige.

---

## Multiple plugins

Multiple plugins can be loaded simultaneously. The registry processes them in filesystem order. If two plugins register the same `id`, the second is skipped with a warning. If two plugins register reducer extensions with the same `pluginAction` string, whichever was registered first wins.
