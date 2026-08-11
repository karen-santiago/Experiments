import { useState } from "react";
import { TopBar } from "./components/TopBar";
import { AnimationPanel } from "./components/AnimationPanel";
import { CanvasPreview } from "./components/CanvasPreview";
import { GlobalPanel } from "./components/GlobalPanel";
import { ExportPanel } from "./components/ExportPanel";
import { createDefaultScene } from "./types/scene";
import type { SceneConfig } from "./types/scene";

function App() {
  const [scene, setScene] = useState<SceneConfig>(createDefaultScene());
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  return (
    <div className={`app app-theme-${theme}`}>
      <TopBar sceneName={scene.name} onSceneNameChange={(name) => setScene({ ...scene, name })} />

      <div className="app-body">
        <aside className="column column-left">
          <AnimationPanel
            animation={scene.animation}
            onChange={(animation) => setScene({ ...scene, animation })}
          />
        </aside>

        <main className="column column-center">
          <CanvasPreview scene={scene} speedMultiplier={speedMultiplier} />
        </main>

        <aside className="column column-right">
          <GlobalPanel
            scene={scene}
            onChange={setScene}
            speedMultiplier={speedMultiplier}
            onSpeedMultiplierChange={setSpeedMultiplier}
          />
          <ExportPanel scene={scene} />
          <button className="theme-toggle" onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}>
            Toggle {theme === "dark" ? "light" : "dark"} theme
          </button>
        </aside>
      </div>
    </div>
  );
}

export default App;
