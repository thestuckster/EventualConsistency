import React from "react";
import { render } from "ink";
import { App } from "./src/components/App.tsx";
import { loadGame } from "./src/game/persistence.ts";

const saved = await loadGame();

const { waitUntilExit } = render(
  React.createElement(App, {
    initialState: saved?.state,
    offlineEarnings: saved?.offlineEarnings,
    offlineSeconds: saved?.offlineSeconds,
    isNewGame: !saved,
  })
);

await waitUntilExit();
