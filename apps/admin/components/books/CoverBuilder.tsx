"use client";

/* eslint-disable @next/next/no-img-element -- Private preview responses and blob URLs cannot use next/image. */

import { useEffect, useId, useState } from "react";
import { ImagePlus, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

type Palette = { id: string; genre: string; panel: string; imageBackground: string; accent: string; secondary: string };
type Recipe = {
  title: string; author: string; palette: Palette;
  textColorMode: "auto" | "black" | "white";
  titleFontFamily?: "sans" | "serif"; authorFontFamily?: "sans" | "serif";
  titleFontSize?: number | null; authorFontSize?: number | null;
  grainStrength: number; focalOffset: number;
};
type Design = {
  revision: number; draft: Recipe | null; published: Recipe | null;
  hasSource: boolean; activePath: string | null; publishedPath: string | null;
  generationState: string; error: string | null; palettes: Palette[];
};
type Activity = "loading" | "idle" | "saving" | "generating" | "uploading" | "previewing" | "publishing" | "saved" | "previewed" | "published" | "failed";

function normalize(recipe: Recipe): Recipe {
  return { ...recipe, titleFontFamily: recipe.titleFontFamily ?? "sans", authorFontFamily: recipe.authorFontFamily ?? "sans", titleFontSize: recipe.titleFontSize ?? null, authorFontSize: recipe.authorFontSize ?? null };
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function coverTextColor(recipe: Recipe) {
  if (recipe.textColorMode === "black") return "#101010";
  if (recipe.textColorMode === "white") return "#FFFFFF";
  const panel = luminance(recipe.palette.panel);
  return (panel + 0.05) / 0.05 >= 1.05 / (panel + 0.05) ? "#101010" : "#FFFFFF";
}

function lowContrast(recipe: Recipe) {
  const panel = luminance(recipe.palette.panel);
  const text = luminance(coverTextColor(recipe));
  return (Math.max(panel, text) + 0.05) / (Math.min(panel, text) + 0.05) < 4.5;
}

async function readDesign(response: Response): Promise<Design> {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Cover operation failed.");
  return data as Design;
}

function font(family: Recipe["titleFontFamily"]) {
  return family === "serif" ? "Readup Cover Serif, Georgia, serif" : "Readup Cover Sans, sans-serif";
}

function LayoutGuide({ recipe, sourceUrl }: { recipe: Recipe; sourceUrl: string | null }) {
  const titleSize = recipe.titleFontSize ?? (recipe.title.length > 55 ? 64 : recipe.title.length > 32 ? 78 : 100);
  const authorSize = recipe.authorFontSize ?? 42;
  return (
    <div className="relative aspect-[5/8] w-full overflow-hidden rounded-sm shadow-lg" style={{ containerType: "inline-size", backgroundColor: recipe.palette.panel }}>
      <div className="absolute inset-x-0 top-0 flex h-[40%] flex-col justify-between overflow-hidden" style={{ color: coverTextColor(recipe), padding: "7.6cqw" }}>
        <p className="m-0 font-bold break-words" style={{ fontFamily: font(recipe.titleFontFamily), fontSize: `${titleSize / 10}cqw`, lineHeight: 1.13 }}>{recipe.title || "Book title"}</p>
        <p className="m-0 break-words" style={{ fontFamily: font(recipe.authorFontFamily), fontSize: `${authorSize / 10}cqw`, lineHeight: 1.2 }}>{recipe.author || "Author name"}</p>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[60%] overflow-hidden" style={{ backgroundColor: recipe.palette.imageBackground }}>
        {sourceUrl ? <img src={sourceUrl} alt="Lower cover illustration" className="size-full object-cover" style={{ objectPosition: `center ${(recipe.focalOffset + 1) * 50}%` }} /> :
          <div className="flex size-full flex-col items-center justify-center gap-3 p-6 text-center text-sm" style={{ color: coverTextColor(recipe) }}><ImagePlus aria-hidden="true" /><span>Generate or upload a square illustration</span></div>}
      </div>
    </div>
  );
}

function TypographyFields({ kind, recipe, disabled, id, update }: {
  kind: "title" | "author"; recipe: Recipe; disabled: boolean; id: string; update: (value: Partial<Recipe>) => void;
}) {
  const isTitle = kind === "title";
  const familyKey = isTitle ? "titleFontFamily" : "authorFontFamily";
  const sizeKey = isTitle ? "titleFontSize" : "authorFontSize";
  const size = recipe[sizeKey];
  const label = isTitle ? "Title" : "Author";
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor={`${id}-${kind}`}>{label}</FieldLabel>
        <Input id={`${id}-${kind}`} value={recipe[kind]} maxLength={isTitle ? 500 : 300} disabled={disabled} onChange={(event) => update({ [kind]: event.target.value })} />
        {isTitle ? <FieldDescription>Use the exact wording to show on the cover.</FieldDescription> : null}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`${id}-${kind}-font`}>{label} font</FieldLabel>
          <select id={`${id}-${kind}-font`} className="h-11 rounded-input border border-input bg-background px-3 text-sm" value={recipe[familyKey]} disabled={disabled} onChange={(event) => update({ [familyKey]: event.target.value })}>
            <option value="sans">Sans serif</option><option value="serif">Serif</option>
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-${kind}-mode`}>{label} size</FieldLabel>
          <select id={`${id}-${kind}-mode`} className="h-11 rounded-input border border-input bg-background px-3 text-sm" value={size == null ? "auto" : "custom"} disabled={disabled} onChange={(event) => update({ [sizeKey]: event.target.value === "auto" ? null : isTitle ? 84 : 40 })}>
            <option value="auto">Auto fit</option><option value="custom">Custom</option>
          </select>
        </Field>
      </div>
      {size != null ? <Field>
        <FieldLabel htmlFor={`${id}-${kind}-size`}>{label} size</FieldLabel>
        <div className="flex items-center gap-3">
          <input type="range" aria-label={`${label} size slider`} min={isTitle ? 56 : 30} max={isTitle ? 112 : 46} step="1" className="min-w-0 flex-1 accent-primary" value={size} disabled={disabled} onChange={(event) => update({ [sizeKey]: Number(event.target.value) })} />
          <Input id={`${id}-${kind}-size`} type="number" min={isTitle ? 56 : 30} max={isTitle ? 112 : 46} step="1" className="w-20" value={size} disabled={disabled} onChange={(event) => { const next = Number(event.target.value); if (Number.isInteger(next) && next >= (isTitle ? 56 : 30) && next <= (isTitle ? 112 : 46)) update({ [sizeKey]: next }); }} />
          <span className="text-xs text-muted-foreground">px</span>
        </div>
      </Field> : null}
    </FieldGroup>
  );
}

export function CoverBuilder({ workId, buttonLabel = "Open cover builder", title, author, onPublished }: {
  workId: string; buttonLabel?: string; title?: string; author?: string;
  onPublished?: (path: string) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [design, setDesign] = useState<Design | null>(null);
  const [draft, setDraft] = useState<Recipe | null>(null);
  const [activity, setActivity] = useState<Activity>("idle");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewRevision, setPreviewRevision] = useState(0);
  const id = useId();
  const base = `/api/books/works/${workId}/cover-design`;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetch(base, { cache: "no-store" }).then(readDesign).then((data) => {
      if (!cancelled) { setDesign(data); setDraft(data.draft ? normalize(data.draft) : null); setActivity("idle"); }
    }).catch((cause) => {
      if (!cancelled) { setError(cause instanceof Error ? cause.message : "Could not load cover design."); setActivity("failed"); }
    });
    return () => { cancelled = true; };
  }, [open, base]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => {
    if (!open || design?.generationState !== "generating") return;
    const timer = window.setInterval(() => {
      void fetch(base, { cache: "no-store" }).then(readDesign).then((data) => {
        if (data.generationState !== "generating") { setDesign(data); setDraft(data.draft ? normalize(data.draft) : null); setActivity("idle"); }
      }).catch(() => {});
    }, 4000);
    return () => window.clearInterval(timer);
  }, [open, design?.generationState, base]);

  const dirty = Boolean(draft && design?.draft && JSON.stringify(draft) !== JSON.stringify(normalize(design.draft)));
  const busy = ["loading", "saving", "generating", "uploading", "previewing", "publishing"].includes(activity) || design?.generationState === "generating";
  const exactPreview = Boolean(preview && previewRevision === design?.revision && !dirty);
  const sourceUrl = design?.hasSource ? `${base}/source?v=${design.revision}` : null;

  function receive(data: Design) {
    setDesign(data); setDraft(data.draft ? normalize(data.draft) : null);
    setPreview(null); setPreviewRevision(0);
  }
  function close() {
    if (dirty && !window.confirm("Discard unsaved cover changes?")) return;
    setOpen(false);
  }
  function fail(cause: unknown) {
    setError(cause instanceof Error ? cause.message : "Cover operation failed.");
    setActivity("failed");
  }
  function update(value: Partial<Recipe>) {
    setDraft((current) => current ? { ...current, ...value } : current);
    setError(null);
  }
  async function saveCurrent(current: Design, recipe: Recipe): Promise<Design> {
    const saved = await readDesign(await fetch(base, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ revision: current.revision, recipe: {
        title: recipe.title, author: recipe.author, paletteId: recipe.palette.id,
        textColorMode: recipe.textColorMode, titleFontFamily: recipe.titleFontFamily,
        authorFontFamily: recipe.authorFontFamily, titleFontSize: recipe.titleFontSize,
        authorFontSize: recipe.authorFontSize, grainStrength: recipe.grainStrength,
        focalOffset: recipe.focalOffset,
      } }),
    }));
    receive(saved);
    return saved;
  }
  async function renderPreview(revision: number) {
    const response = await fetch(`${base}/preview`, { cache: "no-store" });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error ?? "Preview failed.");
    }
    setPreview(URL.createObjectURL(await response.blob()));
    setPreviewRevision(revision);
  }
  async function createDraft() {
    setActivity("saving"); setError(null);
    try {
      receive(await readDesign(await fetch(base, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create", title, author }),
      })));
      setActivity("saved");
    } catch (cause) { fail(cause); }
  }
  async function run(action: "save" | "preview" | "generate" | "publish", file?: File) {
    if (!design || !draft) return;
    setError(null);
    setActivity(file ? "uploading" : action === "save" ? "saving" : action === "preview" ? "previewing" : action === "generate" ? "generating" : "publishing");
    try {
      let current = design;
      if (dirty) current = await saveCurrent(current, draft);
      if (action === "save") { setActivity("saved"); return; }
      if (file) {
        const form = new FormData();
        form.set("source", file); form.set("revision", String(current.revision));
        current = await readDesign(await fetch(base, { method: "POST", body: form }));
        receive(current);
      } else if (action === "generate" || action === "publish") {
        current = await readDesign(await fetch(base, {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ action, revision: current.revision, expectedActivePath: current.activePath }),
        }));
        if (action === "publish") {
          setDesign(current);
          setDraft(current.draft ? normalize(current.draft) : null);
          setPreviewRevision(current.revision);
          setActivity("published");
          const publishedPath = current.activePath;
          if (publishedPath) void Promise.resolve().then(() => onPublished?.(publishedPath)).catch((cause) => {
            console.warn("Could not refresh cover status after publishing", cause);
          });
          return;
        }
        receive(current);
      }
      if (current.hasSource) await renderPreview(current.revision);
      setActivity("previewed");
    } catch (cause) { fail(cause); }
  }

  return (
    <>
      <Button type="button" variant="link" size="sm" className="mt-2 px-0" onClick={() => {
        setDesign(null); setDraft(null); setPreview(null); setPreviewRevision(0);
        setError(null); setActivity("loading"); setOpen(true);
      }}>{buttonLabel}</Button>
      <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
        <DialogContent showCloseButton={false} className="flex h-[min(92dvh,900px)] max-w-[min(1100px,calc(100%-1rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(1100px,calc(100%-2rem))]">
          <DialogHeader className="shrink-0 border-b border-border px-5 py-4 sm:px-7">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1"><DialogTitle className="text-xl">Cover builder</DialogTitle><DialogDescription>Design the title panel and illustration, then review the final 5:8 cover.</DialogDescription></div>
              <Button type="button" variant="ghost" size="sm" onClick={close}>Close</Button>
            </div>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {error || design?.error ? <div className="px-5 pt-5 sm:px-7"><Alert variant="destructive"><AlertDescription>{error ?? design?.error}</AlertDescription></Alert></div> : null}
            {!design ? <p className="p-7 text-sm text-muted-foreground">{activity === "loading" ? "Loading cover design…" : "Could not load the cover design."}</p> : !draft ? (
              <div className="flex flex-col items-start gap-4 p-7"><p className="max-w-lg text-sm text-muted-foreground">Start a design draft to customize the cover text, typography, colors, and illustration.</p><Button type="button" disabled={busy} onClick={() => void createDraft()}>Create design draft</Button></div>
            ) : (
              <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:gap-9">
                <div className="flex min-w-0 flex-col gap-7">
                  <section className="flex flex-col gap-4" aria-labelledby={`${id}-text-heading`}>
                    <div><h3 id={`${id}-text-heading`} className="text-base font-semibold">Cover text</h3><p className="text-sm text-muted-foreground">Text is rendered separately so it stays sharp on the finished cover.</p></div>
                    <TypographyFields kind="title" recipe={draft} disabled={busy} id={id} update={update} />
                    <Separator />
                    <TypographyFields kind="author" recipe={draft} disabled={busy} id={id} update={update} />
                  </section>
                  <Separator />
                  <section className="flex flex-col gap-4" aria-labelledby={`${id}-style-heading`}>
                    <div><h3 id={`${id}-style-heading`} className="text-base font-semibold">Color and texture</h3><p className="text-sm text-muted-foreground">Palette changes the title panel. Regenerate the illustration to apply its colors there.</p></div>
                    <FieldGroup>
                      <Field><FieldLabel htmlFor={`${id}-palette`}>Palette</FieldLabel>
                        <select id={`${id}-palette`} className="h-11 rounded-input border border-input bg-background px-3 text-sm" value={draft.palette.id} disabled={busy} onChange={(event) => { const palette = design.palettes.find((item) => item.id === event.target.value); if (palette) update({ palette }); }}>
                          {design.palettes.map((palette) => <option key={palette.id} value={palette.id}>{palette.genre.replaceAll("_", " ")} · {palette.id.endsWith("-1") ? "1" : "2"}</option>)}
                        </select>
                        <div className="flex gap-2" aria-label="Current palette colors">{[draft.palette.panel, draft.palette.imageBackground, draft.palette.accent, draft.palette.secondary].map((color, index) => <span key={index} className="size-7 rounded-full border border-border" style={{ backgroundColor: color }} title={color} />)}</div>
                      </Field>
                      <Field><FieldLabel htmlFor={`${id}-color`}>Text color</FieldLabel>
                        <select id={`${id}-color`} className="h-11 rounded-input border border-input bg-background px-3 text-sm" value={draft.textColorMode} disabled={busy} onChange={(event) => update({ textColorMode: event.target.value as Recipe["textColorMode"] })}><option value="auto">Automatic contrast</option><option value="black">Black</option><option value="white">White</option></select>
                        {lowContrast(draft) ? <FieldDescription className="text-destructive">Low contrast with this panel color.</FieldDescription> : null}
                      </Field>
                      <Field><FieldLabel htmlFor={`${id}-grain`}>Grain · {Math.round(draft.grainStrength * 100)}%</FieldLabel><input id={`${id}-grain`} type="range" min="0" max="0.12" step="0.01" className="w-full accent-primary" value={draft.grainStrength} disabled={busy} onChange={(event) => update({ grainStrength: Number(event.target.value) })} /></Field>
                    </FieldGroup>
                  </section>
                  <Separator />
                  <section className="flex flex-col gap-4" aria-labelledby={`${id}-image-heading`}>
                    <div><h3 id={`${id}-image-heading`} className="text-base font-semibold">Illustration</h3><p className="text-sm text-muted-foreground">Generate art or upload a square PNG, JPEG, or WebP image at least 512 × 512 px.</p></div>
                    <div className="flex flex-wrap items-center gap-3"><Button type="button" variant="outline" disabled={busy || !draft.title.trim() || !draft.author.trim()} onClick={() => void run("generate")}><RefreshCw data-icon="inline-start" />{design.hasSource ? "Regenerate art" : "Generate art"}</Button><span className="text-xs text-muted-foreground">Replaces the draft illustration</span></div>
                    <Field><FieldLabel htmlFor={`${id}-upload`}>Or upload an illustration</FieldLabel><Input id={`${id}-upload`} type="file" accept="image/png,image/jpeg,image/webp" disabled={busy || !draft.title.trim() || !draft.author.trim()} onChange={(event) => { const file = event.target.files?.[0]; if (file) void run("preview", file); event.target.value = ""; }} /><FieldDescription>Maximum 8 MB. The active cover changes only when you publish.</FieldDescription></Field>
                    {design.hasSource ? <Field><FieldLabel htmlFor={`${id}-focal`}>Vertical crop · {draft.focalOffset === 0 ? "center" : draft.focalOffset < 0 ? "higher" : "lower"}</FieldLabel><input id={`${id}-focal`} type="range" min="-1" max="1" step="0.05" className="w-full accent-primary" value={draft.focalOffset} disabled={busy} onChange={(event) => update({ focalOffset: Number(event.target.value) })} /><FieldDescription>Adjusts which part of the square art appears below the title panel.</FieldDescription></Field> : null}
                  </section>
                </div>
                <aside className="flex flex-col gap-4 lg:sticky lg:top-0 lg:self-start" aria-label="Cover preview">
                  <div className="flex items-center justify-between gap-2"><div><h3 className="text-base font-semibold">Cover preview</h3><p className="text-xs text-muted-foreground">1000 × 1600 px · 5:8</p></div><span className="text-xs text-muted-foreground">{exactPreview ? "Final render" : "Layout guide"}</span></div>
                  <div className="mx-auto w-full max-w-[360px]">{exactPreview && preview ? <img src={preview} alt="Final composed cover preview" className="aspect-[5/8] w-full rounded-sm object-cover shadow-lg" /> : <LayoutGuide recipe={draft} sourceUrl={sourceUrl} />}</div>
                  <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                    <p>{exactPreview ? "This exact render is ready to publish." : dirty ? "Changes appear here as a layout guide. Update preview to render the exact cover." : design.hasSource ? "Update preview to render the exact cover." : "Add an illustration to render the finished cover."}</p>
                    {draft.title.length > 75 ? <p>Long title: check readability at the smaller card size.</p> : null}
                    {exactPreview && preview ? <div className="flex items-end gap-3 pt-1"><img src={preview} alt="Cover cropped as a mobile book card" width={136} height={196} className="h-[196px] w-[136px] rounded-md border border-border object-cover" /><div className="flex flex-col gap-1"><span>Mobile card · 136 × 196</span><a href={preview} target="_blank" rel="noreferrer" className="font-medium text-foreground underline">Open full size</a></div></div> : null}
                  </div>
                </aside>
              </div>
            )}
          </div>
          {design && draft ? <div className="flex shrink-0 flex-col gap-3 border-t border-border bg-background px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <p role="status" className="text-xs text-muted-foreground">{busy ? activity === "generating" ? "Generating illustration…" : `${activity[0]?.toUpperCase()}${activity.slice(1)}…` : dirty ? "Unsaved changes" : activity === "published" ? "Cover published" : activity === "previewed" ? "Preview is up to date" : design.publishedPath === design.activePath && design.activePath ? "Generated cover active" : "Draft ready"}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={busy || !dirty || !draft.title.trim() || !draft.author.trim()} onClick={() => void run("save")}>Save draft</Button>
              <Button type="button" variant="outline" disabled={busy || !design.hasSource || !draft.title.trim() || !draft.author.trim()} onClick={() => void run("preview")}>Update preview</Button>
              <Button type="button" disabled={busy || !design.hasSource || dirty || !exactPreview} onClick={() => void run("publish")}>Publish cover</Button>
            </div>
          </div> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
