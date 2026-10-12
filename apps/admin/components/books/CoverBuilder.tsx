"use client";

/* eslint-disable @next/next/no-img-element -- Admin previews use private no-store routes and local blob URLs. */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Palette = { id: string; genre: string; panel: string; imageBackground: string; accent: string; secondary: string };
type Recipe = {
  title: string; author: string; palette: Palette;
  textColorMode: "auto" | "black" | "white";
  grainStrength: number; focalOffset: number;
};
type Design = {
  revision: number; draft: Recipe | null; published: Recipe | null;
  hasSource: boolean; activePath: string | null; publishedPath: string | null;
  generationState: string; error: string | null; palettes: Palette[];
};

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function lowContrast(recipe: Recipe) {
  if (recipe.textColorMode === "auto") return false;
  const panel = luminance(recipe.palette.panel);
  const text = luminance(recipe.textColorMode === "black" ? "#101010" : "#FFFFFF");
  return (Math.max(panel, text) + 0.05) / (Math.min(panel, text) + 0.05) < 4.5;
}

export function CoverBuilder({ workId, buttonLabel = "Open cover builder", title, author, onPublished }: { workId: string; buttonLabel?: string; title?: string; author?: string; onPublished?: (path: string) => void | Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [design, setDesign] = useState<Design | null>(null);
  const [draft, setDraft] = useState<Recipe | null>(null);
  const [state, setState] = useState("idle");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewRevision, setPreviewRevision] = useState(0);
  const base = `/api/books/works/${workId}/cover-design`;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetch(base).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load cover design.");
      if (!cancelled) { setDesign(data); setDraft(data.draft); setPreviewRevision(0); setPreview(null); setState("idle"); }
    }).catch((e) => { if (!cancelled) { setError(e.message); setState("failed"); } });
    return () => { cancelled = true; };
  }, [open, base]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function request(action: "create" | "generate" | "publish") {
    setState(action === "generate" ? "generating" : action === "publish" ? "publishing" : "saving");
    setError(null);
    try {
      const res = await fetch(base, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, revision: design?.revision,
          expectedActivePath: design?.activePath ?? null, title, author }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Cover operation failed.");
      setDesign(data); setDraft(data.draft); setPreviewRevision(0);
      if (action === "publish" && data.activePath) {
        void Promise.resolve(onPublished?.(data.activePath)).catch((error) => {
          console.warn("Could not refresh cover status after publishing", error);
        });
      }
      setState(action === "publish" ? "published" : "saved");
    } catch (e) { setError(e instanceof Error ? e.message : "Cover operation failed."); setState("failed"); }
  }

  async function save() {
    if (!design || !draft) return;
    setState("saving"); setError(null);
    try {
      const res = await fetch(base, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ revision: design.revision, recipe: {
          title: draft.title, author: draft.author, paletteId: draft.palette.id,
          textColorMode: draft.textColorMode, grainStrength: draft.grainStrength,
          focalOffset: draft.focalOffset,
        } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save draft.");
      setDesign(data); setDraft(data.draft); setPreviewRevision(0); setState("saved");
    } catch (e) { setError(e instanceof Error ? e.message : "Save failed."); setState("failed"); }
  }

  async function replace(file: File) {
    if (!design) return;
    setState("saving"); setError(null);
    const form = new FormData(); form.set("source", file); form.set("revision", String(design.revision));
    try {
      const res = await fetch(base, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lower image upload failed.");
      setDesign(data); setDraft(data.draft); setPreviewRevision(0); setState("saved");
    } catch (e) { setError(e instanceof Error ? e.message : "Upload failed."); setState("failed"); }
  }

  async function loadPreview() {
    setState("previewing"); setError(null);
    try {
      const res = await fetch(`${base}/preview`, { cache: "no-store" });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error ?? "Preview failed."); }
      setPreview(URL.createObjectURL(await res.blob()));
      setPreviewRevision(design?.revision ?? 0); setState("previewed");
    } catch (e) { setError(e instanceof Error ? e.message : "Preview failed."); setState("failed"); }
  }

  const dirty = Boolean(draft && design?.draft && JSON.stringify(draft) !== JSON.stringify(design.draft));
  const busy = ["loading", "saving", "generating", "previewing", "publishing"].includes(state)
    || design?.generationState === "generating";
  return (
    <>
      <button type="button" className="mt-2 font-medium underline" onClick={() => { setState("loading"); setError(null); setDesign(null); setDraft(null); setOpen(true); }}>
        {buttonLabel}
      </button>
      {open ? createPortal(<div role="dialog" aria-modal="true" aria-label="Cover builder" className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4" onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
        <div className="mx-auto max-w-5xl rounded-xl bg-background p-5 text-foreground shadow-xl">
          <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Work cover builder</h2><button type="button" className="rounded border px-3 py-1" onClick={() => setOpen(false)}>Close</button></div>
          <div className="mt-4 space-y-3 text-sm">
        {error || design?.error ? <p role="alert" className="text-red-600">{error ?? design?.error}</p> : null}
        <p className="text-muted-foreground">{state === "idle" ? design?.generationState === "generating" ? "generating" : "Ready" : state} · {design?.published && design.publishedPath === design.activePath ? "Generated cover active" : design?.activePath ? "Manual or legacy cover active" : "No active cover"}</p>
        {design && !design.draft ? <button type="button" className="rounded border px-3 py-1" onClick={() => void request("create")}>Create design draft</button> : null}
        {draft ? <>
          <label className="block">Cover display title<input className="mt-1 w-full rounded border p-2" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
          <label className="block">Cover display author<input className="mt-1 w-full rounded border p-2" value={draft.author} onChange={(e) => setDraft({ ...draft, author: e.target.value })} /></label>
          <div><p>Palette · {draft.palette.id}</p><div className="mt-1 flex items-center gap-2"><span className="h-7 w-7 rounded border" style={{ background: draft.palette.panel }} /><span className="h-7 w-7 rounded border" style={{ background: draft.palette.imageBackground }} /><span className="h-7 w-7 rounded border" style={{ background: draft.palette.accent }} /><span className="h-7 w-7 rounded border" style={{ background: draft.palette.secondary }} /><span className="text-muted-foreground">Saved colors</span></div><div className="mt-2 flex flex-wrap gap-2">{design?.palettes.map((palette) => <button key={palette.id} type="button" title={`${palette.genre} · ${palette.id}`} aria-label={`Use ${palette.id} palette`} aria-pressed={palette.id === draft.palette.id} className={`h-9 w-9 rounded border-2 ${palette.id === draft.palette.id ? "border-black" : "border-transparent"}`} style={{ background: `linear-gradient(135deg, ${palette.panel} 50%, ${palette.imageBackground} 50%)` }} onClick={() => setDraft({ ...draft, palette })} />)}</div></div>
          <label className="block">Text color <select className="ml-2 rounded border p-1" value={draft.textColorMode} onChange={(e) => setDraft({ ...draft, textColorMode: e.target.value as Recipe["textColorMode"] })}><option value="auto">Automatic</option><option value="black">Black</option><option value="white">White</option></select></label>
          <label className="block">Grain strength: {Math.round(draft.grainStrength * 100)}%<input className="w-full" type="range" min="0" max="0.12" step="0.01" value={draft.grainStrength} onChange={(e) => setDraft({ ...draft, grainStrength: Number(e.target.value) })} /></label>
          <label className="block">Image focal position: {Math.round(draft.focalOffset * 100)}<input className="w-full" type="range" min="-1" max="1" step="0.05" value={draft.focalOffset} onChange={(e) => setDraft({ ...draft, focalOffset: Number(e.target.value) })} /></label>
          {draft.title.length > 75 ? <p className="text-amber-700">Dense title: check the mobile preview.</p> : null}
          {lowContrast(draft) ? <p className="text-amber-700">Low contrast between text and panel. Choose Automatic or another color.</p> : null}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="rounded border px-3 py-1" disabled={busy || !dirty} onClick={() => void save()}>Save draft</button>
            <button type="button" className="rounded border px-3 py-1" disabled={busy || dirty} onClick={() => void request("generate")}>{design?.hasSource ? "Regenerate lower image" : "Generate lower image"}</button>
            <label className="cursor-pointer rounded border px-3 py-1">Replace lower image<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={busy || dirty} onChange={(e) => { const file = e.target.files?.[0]; if (file) void replace(file); e.target.value = ""; }} /></label>
            <button type="button" className="rounded border px-3 py-1" disabled={busy || dirty || !design?.hasSource} onClick={() => void loadPreview()}>Preview</button>
            <button type="button" className="rounded bg-foreground px-3 py-1 text-background" disabled={busy || dirty || !design?.hasSource || previewRevision !== design?.revision} onClick={() => void request("publish")}>Publish cover</button>
          </div>
          {design?.hasSource ? <img src={`${base}/source?v=${design.revision}`} alt="Generated lower illustration" className="h-32 w-32 rounded border object-cover" /> : null}
          {preview ? <div className="flex flex-wrap items-start gap-4"><div><p>Full cover · <a href={preview} target="_blank" rel="noreferrer" className="underline">Open 1000 px image</a></p><img src={preview} alt="Composed cover preview" width={400} height={640} className="max-w-full border" /></div><div><p>136 px mobile card</p><img src={preview} alt="Composed cover preview at mobile card width" width={136} height={218} className="border" /></div></div> : null}
        </> : null}
          </div>
        </div>
      </div>, document.body) : null}
    </>
  );
}
