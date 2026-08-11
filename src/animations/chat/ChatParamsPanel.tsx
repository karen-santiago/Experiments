import { useRef } from "react";
import type { AssetRef, ChatAnimationConfig, ChatMessage, ChatSpeaker } from "../../types/scene";
import { SliderField } from "../../components/SliderField";
import { FontSelect } from "../../components/FontSelect";
import { assetUrl, uploadAsset } from "../../lib/assets";

type Props = {
  config: ChatAnimationConfig;
  onChange: (next: ChatAnimationConfig) => void;
  fonts: AssetRef[];
};

function makeId(): string {
  return `msg-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function AvatarUpload({ label, avatar, onChange }: { label: string; avatar: AssetRef | null; onChange: (a: AssetRef | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="field">
      <span>{label}</span>
      <div className="field-row">
        {avatar && <img src={assetUrl("image", avatar.id)} alt={avatar.name} className="avatar-preview" />}
        <button type="button" onClick={() => inputRef.current?.click()}>
          {avatar ? "Replace" : "Upload avatar"}
        </button>
        {avatar && (
          <button type="button" onClick={() => onChange(null)}>
            Remove
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const uploaded = await uploadAsset("image", file);
          onChange({ id: uploaded.id, name: uploaded.originalName });
        }}
      />
    </div>
  );
}

export function ChatParamsPanel({ config, onChange, fonts }: Props) {
  const set = <K extends keyof ChatAnimationConfig>(key: K, value: ChatAnimationConfig[K]) =>
    onChange({ ...config, [key]: value });

  const setMessage = (id: string, patch: Partial<ChatMessage>) =>
    set(
      "messages",
      config.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    );

  const addMessage = (speaker: ChatSpeaker) =>
    set("messages", [...config.messages, { id: makeId(), speaker, text: "" }]);

  const removeMessage = (id: string) => set("messages", config.messages.filter((m) => m.id !== id));

  const moveMessage = (index: number, dir: -1 | 1) => {
    const to = index + dir;
    if (to < 0 || to >= config.messages.length) return;
    const next = config.messages.slice();
    const [item] = next.splice(index, 1);
    next.splice(to, 0, item);
    set("messages", next);
  };

  return (
    <div className="params-panel">
      <FontSelect fonts={fonts} value={config.fontId} onChange={(fontId) => set("fontId", fontId)} />

      <details open>
        <summary>Speakers</summary>
        <label className="field">
          <span>Name A</span>
          <input type="text" value={config.nameA} onChange={(e) => set("nameA", e.target.value)} />
        </label>
        <AvatarUpload label="Avatar A" avatar={config.avatarA} onChange={(a) => set("avatarA", a)} />
        <label className="field">
          <span>Bubble color A</span>
          <input type="color" value={config.bubbleColorA} onChange={(e) => set("bubbleColorA", e.target.value)} />
        </label>
        <label className="field">
          <span>Text color A</span>
          <input type="color" value={config.textColorA} onChange={(e) => set("textColorA", e.target.value)} />
        </label>

        <label className="field">
          <span>Name B</span>
          <input type="text" value={config.nameB} onChange={(e) => set("nameB", e.target.value)} />
        </label>
        <AvatarUpload label="Avatar B" avatar={config.avatarB} onChange={(a) => set("avatarB", a)} />
        <label className="field">
          <span>Bubble color B</span>
          <input type="color" value={config.bubbleColorB} onChange={(e) => set("bubbleColorB", e.target.value)} />
        </label>
        <label className="field">
          <span>Text color B</span>
          <input type="color" value={config.textColorB} onChange={(e) => set("textColorB", e.target.value)} />
        </label>
      </details>

      <details open>
        <summary>Script ({config.messages.length})</summary>
        <ul className="chat-message-list">
          {config.messages.map((m, i) => (
            <li key={m.id} className="chat-message-row">
              <span className="chat-message-speaker">{m.speaker === "a" ? config.nameA || "A" : config.nameB || "B"}</span>
              <select value={m.speaker} onChange={(e) => setMessage(m.id, { speaker: e.target.value as ChatSpeaker })}>
                <option value="a">A</option>
                <option value="b">B</option>
              </select>
              <input
                type="text"
                className="chat-message-text"
                value={m.text}
                onChange={(e) => setMessage(m.id, { text: e.target.value })}
                placeholder="Message text"
              />
              <button type="button" onClick={() => moveMessage(i, -1)} title="Move up">
                ↑
              </button>
              <button type="button" onClick={() => moveMessage(i, 1)} title="Move down">
                ↓
              </button>
              <button type="button" onClick={() => removeMessage(m.id)} title="Remove">
                ✕
              </button>
            </li>
          ))}
        </ul>
        <div className="field-row">
          <button type="button" onClick={() => addMessage("a")}>
            + Line from A
          </button>
          <button type="button" onClick={() => addMessage("b")}>
            + Line from B
          </button>
        </div>
      </details>

      <details open>
        <summary>Bubble style</summary>
        <SliderField label="Font size" value={config.fontSize} min={12} max={80} step={1} onChange={(v) => set("fontSize", v)} />
        <SliderField label="Corner radius" value={config.bubbleCornerRadius} min={0} max={48} step={1} onChange={(v) => set("bubbleCornerRadius", v)} />
      </details>

      <details open>
        <summary>Timing</summary>
        <SliderField label="Hold start (s)" value={config.holdStart} min={0} max={5} step={0.05} onChange={(v) => set("holdStart", v)} />
        <SliderField label="Message interval (ms)" value={config.messageIntervalMs} min={100} max={3000} step={50} onChange={(v) => set("messageIntervalMs", v)} />
        <label className="field field-checkbox">
          <input type="checkbox" checked={config.showTypingIndicator} onChange={(e) => set("showTypingIndicator", e.target.checked)} />
          <span>Typing indicator</span>
        </label>
        {config.showTypingIndicator && (
          <>
            <SliderField label="Typing duration (ms)" value={config.typingDurationMs} min={100} max={3000} step={50} onChange={(v) => set("typingDurationMs", v)} />
            <label className="field">
              <span>Typing dot color</span>
              <input type="color" value={config.typingDotColor} onChange={(e) => set("typingDotColor", e.target.value)} />
            </label>
          </>
        )}
        <SliderField label="Hold end (s)" value={config.holdEnd} min={0} max={5} step={0.05} onChange={(v) => set("holdEnd", v)} />
        <label className="field">
          <span>Loop mode</span>
          <select value={config.loopMode} onChange={(e) => set("loopMode", e.target.value as ChatAnimationConfig["loopMode"])}>
            <option value="once">Once</option>
            <option value="loop">Loop</option>
            <option value="pingpong">Ping-pong</option>
          </select>
        </label>
      </details>
    </div>
  );
}
