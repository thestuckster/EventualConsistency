import { join } from "node:path";
import { homedir } from "node:os";
import { existsSync, readdirSync } from "node:fs";
import { pluginRegistry, type Plugin } from "./plugins.ts";

export const PLUGIN_DIR = join(homedir(), ".eventual-consistency", "plugins");

export async function loadPlugins(): Promise<void> {
  if (!existsSync(PLUGIN_DIR)) return;

  const files = readdirSync(PLUGIN_DIR).filter(
    (f) => f.endsWith(".js") || f.endsWith(".ts")
  );

  if (files.length === 0) return;

  for (const file of files) {
    const fullPath = join(PLUGIN_DIR, file);
    try {
      const mod = await import(fullPath);
      const plugin: Plugin = mod.default ?? mod.plugin;
      if (!plugin?.id) {
        console.warn(`[plugin] ${file}: no default export with an "id" field — skipping`);
        continue;
      }
      pluginRegistry.register(plugin);
      console.log(`[plugin] Loaded: ${plugin.name} (${plugin.id} v${plugin.version ?? "?"})`);
    } catch (err) {
      console.error(`[plugin] Failed to load ${file}:`, err);
    }
  }
}
