# Getting Started with Plugins

This tutorial walks you through installing your first plugin and then writing one from scratch. No prior knowledge of the game internals required.

---

## Installing a plugin

Plugins live in `~/.eventual-consistency/plugins/`. The game scans that directory at startup and loads every `.ts` or `.js` file it finds.

**Step 1 — Create the plugins directory:**

```sh
mkdir -p ~/.eventual-consistency/plugins
```

**Step 2 — Drop a plugin file in:**

```sh
cp /path/to/some-plugin.ts ~/.eventual-consistency/plugins/
```

**Step 3 — Start the game:**

```sh
bun run index.ts
```

If the plugin loaded successfully you'll see a confirmation before the game renders:

```
[plugin] Loaded: My Plugin (my-plugin v1.0.0)
```

If something went wrong loading the plugin the error is printed and the game starts without it — your save is never affected.

---

## Writing your first plugin

We'll build a plugin that adds one new piece of infrastructure and logs a message when you prestige. By the end you'll have a working plugin and understand the basic shape of the API.

### Step 1 — Create the file

Create a new file:

```sh
touch ~/.eventual-consistency/plugins/my-first-plugin.ts
```

### Step 2 — Write the plugin skeleton

Open the file in your editor and paste this:

```ts
export default {
  id: "my-first-plugin",
  name: "My First Plugin",
  version: "1.0.0",
};
```

Every plugin needs at minimum an `id` and a `name`. The `id` must be unique across all loaded plugins. Save the file and run the game — you should see it load.

### Step 3 — Add a new infrastructure tier

Let's add a custom AWS service. Add a `content` block:

```ts
export default {
  id: "my-first-plugin",
  name: "My First Plugin",
  version: "1.0.0",

  content: {
    infrastructure: [
      {
        id: "vibes_cluster",
        name: "Vibes Cluster",
        description: "Powered entirely by confidence and stock options.",
        baseCost: 500_000_000_000, // $500B
        basePerSec: 12_000,
      },
    ],
  },
};
```

Restart the game. The **Vibes Cluster** now appears at the bottom of the Infrastructure panel, priced at $500B with $12,000/sec passive income. It scales and unlocks exactly like a built-in tier.

### Step 4 — React to a prestige

Now let's make the plugin do something when you complete a prestige. Add a `hooks` block:

```ts
export default {
  id: "my-first-plugin",
  name: "My First Plugin",
  version: "1.0.0",

  content: {
    infrastructure: [
      {
        id: "vibes_cluster",
        name: "Vibes Cluster",
        description: "Powered entirely by confidence and stock options.",
        baseCost: 500_000_000_000,
        basePerSec: 12_000,
      },
    ],
  },

  hooks: {
    onPrestige(prestigeId) {
      return [
        {
          type: "LOG",
          message: `Plugin noticed your ${prestigeId} migration. Bold move.`,
          emoji: "[P]",
        },
      ];
    },
  },
};
```

Hooks return an array of game actions to dispatch. Here we're returning a `LOG` action, which appends a message to the event log. The next time you prestige, you'll see that message appear.

### Step 5 — Add a keybinding

Let's bind the `x` key to log a message:

```ts
  mechanics: {
    keyHandlers: [
      {
        key: "x",
        run(state, dispatch) {
          dispatch({
            type: "LOG",
            message: "You pressed X. Nothing happened. Everything happened.",
            emoji: "~~",
          });
        },
      },
    ],
  },
```

Add that `mechanics` block to your plugin alongside `content` and `hooks`. Restart, press `x` in-game, and you'll see the message appear in the event log.

### The finished plugin

```ts
export default {
  id: "my-first-plugin",
  name: "My First Plugin",
  version: "1.0.0",

  content: {
    infrastructure: [
      {
        id: "vibes_cluster",
        name: "Vibes Cluster",
        description: "Powered entirely by confidence and stock options.",
        baseCost: 500_000_000_000,
        basePerSec: 12_000,
      },
    ],
  },

  hooks: {
    onPrestige(prestigeId) {
      return [
        {
          type: "LOG",
          message: `Plugin noticed your ${prestigeId} migration. Bold move.`,
          emoji: "[P]",
        },
      ];
    },
  },

  mechanics: {
    keyHandlers: [
      {
        key: "x",
        run(state, dispatch) {
          dispatch({
            type: "LOG",
            message: "You pressed X. Nothing happened. Everything happened.",
            emoji: "~~",
          });
        },
      },
    ],
  },
};
```

---

## What's next

- Read [How It Works](./how-it-works.md) to understand the loading lifecycle and how each plugin capability integrates with the game engine.
- Read the [API Reference](./api-reference.md) for the full list of fields, hooks, and types.
- Look at `docs/example-plugin.ts` in the repo for a complete plugin demonstrating all features.
