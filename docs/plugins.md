# Plugin System

Eventual Consistency has a plugin system that lets you extend the game without touching the core codebase. Plugins are single TypeScript or JavaScript files that you drop into a folder on your machine.

## What plugins can do

- **Add content** — new infrastructure tiers, interns, incidents, upgrades, and prestige milestones that slot into the existing game as if they were built-in
- **React to events** — run code when incidents spawn, purchases happen, or a prestige completes
- **Extend the game loop** — add new periodic phases that fire on a custom tick interval
- **Add keybindings** — bind unused keys to custom actions
- **Build new UI panels** — full Ink-rendered panels that appear in the Tab cycle alongside the built-in ones
- **Custom state and reducer logic** — define new action types and handle them in the reducer

## Documentation

| Doc | Description |
|-----|-------------|
| [Getting Started](./plugins/getting-started.md) | Install your first plugin in under 5 minutes |
| [How It Works](./plugins/how-it-works.md) | Loading lifecycle, content injection, hooks, and mechanics |
| [API Reference](./plugins/api-reference.md) | Every interface, field, hook, and type |
