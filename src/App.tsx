import { useEffect, useState } from "react";
import { TopBar } from "./components/TopBar";
import { AnimationPanel } from "./components/AnimationPanel";
import { CanvasPreview } from "./components/CanvasPreview";
import { GlobalPanel } from "./components/GlobalPanel";
import { ExportPanel } from "./components/ExportPanel";
import { createDefaultScene } from "./types/scene";
import type { SceneConfig } from "./types/scene";
import { preloadSceneAssets } from "./lib/preload";
import { loadPreset, loadScene, saveScene } from "./lib/scenes";

type SaveStatus = "idle" | "saving" | "saved" | "error";

function App() {
  const [scene, setScene] = useState<SceneConfig>(createDefaultScene());
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  // Warm the image/font caches whenever the assets a scene depends on
  // change (new upload, or a saved scene reopened) — CanvasPreview redraws
  // itself once each asset resolves via subscribeImageCache/FontRegistry.
  useEffect(() => {
    preloadSceneAssets(scene).catch((err) => console.error("Asset preload failed", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene.animation, scene.typography.fontFileId]);

  const handleSave = async (name?: string) => {
    const toSave = name ? { ...scene, name } : scene;
    if (name) setScene(toSave);
    setSaveStatus("saving");
    try {
      await saveScene(toSave);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 1500);
    } catch (err) {
      console.error("Save failed", err);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2500);
    }
  };

  const handleSaveAs = () => {
    const name = window.prompt("Save scene as:", scene.name);
    if (name && name.trim()) void handleSave(name.trim());
  };

  const handleNew = () => {
    if (window.confirm("Start a new scene? Unsaved changes will be lost.")) {
      setScene(createDefaultScene());
    }
  };

  const handleOpenScene = async (fileName: string) => {
    try {
      setScene(await loadScene(fileName));
    } catch (err) {
      console.error("Failed to load scene", err);
      window.alert(err instanceof Error ? err.message : "Failed to load scene");
    }
  };

  const handleOpenPreset = async (fileName: string) => {
    try {
      setScene(await loadPreset(fileName));
    } catch (err) {
      console.error("Failed to load preset", err);
      window.alert(err instanceof Error ? err.message : "Failed to load preset");
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  return (
    <div className={`app app-theme-${theme}`}>
      <TopBar
        sceneName={scene.name}
        onSceneNameChange={(name) => setScene({ ...scene, name })}
        onNew={handleNew}
        onSave={() => void handleSave()}
        onSaveAs={handleSaveAs}
        onOpenScene={(fileName) => void handleOpenScene(fileName)}
        onOpenPreset={(fileName) => void handleOpenPreset(fileName)}
        saveStatus={saveStatus}
      />

      <div className="app-body">
        <aside className="column column-left">
          <AnimationPanel
            animation={scene.animation}
            onChange={(animation) => setScene({ ...scene, animation })}
            canvas={scene.canvas}
            onCanvasChange={(canvas) => setScene({ ...scene, canvas })}
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
