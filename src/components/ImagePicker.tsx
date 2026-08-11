import { useRef, useState } from "react";
import type { AssetRef } from "../types/scene";
import { assetUrl, uploadAsset } from "../lib/assets";

type Props = {
  images: AssetRef[];
  onChange: (next: AssetRef[]) => void;
  /** When provided, clicking a thumbnail reports a normalized (0..1) click position for that image's focal point. */
  onFocalPointClick?: (imageId: string, x: number, y: number) => void;
};

/** Shared file/folder picker + reorderable thumbnail list, used by image field and image flicker. */
export function ImagePicker({ images, onChange, onFocalPointClick }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const dragIndex = useRef<number | null>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      const files = Array.from(fileList).filter((f) => /\.(jpe?g|png|webp)$/i.test(f.name));
      const uploaded = await Promise.all(files.map((f) => uploadAsset("image", f)));
      onChange([...images, ...uploaded.map((u) => ({ id: u.id, name: u.originalName }))]);
    } finally {
      setUploading(false);
    }
  };

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const next = images.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const removeImage = (index: number) => onChange(images.filter((_, i) => i !== index));

  const duplicateImage = (index: number) => {
    const next = images.slice();
    next.splice(index + 1, 0, { ...next[index] });
    onChange(next);
  };

  return (
    <div>
      <div className="field-row" style={{ marginTop: 8 }}>
        <button type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
          Add files
        </button>
        <button type="button" disabled={uploading} onClick={() => folderInputRef.current?.click()}>
          Add folder
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        hidden
        // @ts-expect-error non-standard attribute, Chromium-only folder picking
        webkitdirectory=""
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {uploading && <p className="hint">Uploading…</p>}

      <ul className="thumb-list">
        {images.map((img, i) => (
          <li
            key={`${img.id}-${i}`}
            className="thumb-row"
            draggable
            onDragStart={() => (dragIndex.current = i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex.current !== null) moveImage(dragIndex.current, i);
              dragIndex.current = null;
            }}
          >
            <img
              src={assetUrl("image", img.id)}
              alt={img.name}
              className="thumb-img"
              onClick={(e) => {
                if (!onFocalPointClick) return;
                const rect = (e.target as HTMLElement).getBoundingClientRect();
                onFocalPointClick(img.id, (e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
              }}
              title={onFocalPointClick ? "Click to set focal point" : img.name}
            />
            <span className="thumb-name">{img.name}</span>
            <button type="button" onClick={() => moveImage(i, i - 1)} title="Move up">
              ↑
            </button>
            <button type="button" onClick={() => moveImage(i, i + 1)} title="Move down">
              ↓
            </button>
            <button type="button" onClick={() => duplicateImage(i)} title="Duplicate">
              ⧉
            </button>
            <button type="button" onClick={() => removeImage(i)} title="Remove">
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
