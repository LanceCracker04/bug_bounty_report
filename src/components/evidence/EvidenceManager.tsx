import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import type { EvidenceItem } from "../../types/report";
import { deleteEvidenceFile, getEvidenceFile, saveEvidenceFile } from "../../utils/evidenceDatabase";
import { generateReportId } from "../../utils/reportHelpers";

interface EvidenceManagerProps {
  reportId: string;
  evidenceItems: EvidenceItem[];
  onChange: (items: EvidenceItem[]) => void;
  onNotify: (type: "success" | "error" | "warning", message: string) => void;
}

const acceptedImageTypes = ["image/png", "image/jpeg", "image/webp"];
const maximumImageBytes = 3 * 1024 * 1024;

function validUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function EvidenceManager({ reportId, evidenceItems, onChange, onNotify }: EvidenceManagerProps) {
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [selectedImage, setSelectedImage] = useState<EvidenceItem>();
  const [itemToDelete, setItemToDelete] = useState<EvidenceItem>();
  const [urlDraft, setUrlDraft] = useState({ title: "", sourceUrl: "", description: "" });
  const [textDraft, setTextDraft] = useState({ title: "", description: "" });
  const [showUrlForm, setShowUrlForm] = useState(false);
  const [showTextForm, setShowTextForm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    const createdUrls: string[] = [];
    const loadImages = async () => {
      const nextUrls: Record<string, string> = {};
      for (const item of evidenceItems.filter((evidence) => evidence.type === "image")) {
        try {
          const file = await getEvidenceFile(item.id);
          if (file) {
            const url = URL.createObjectURL(file.blob);
            createdUrls.push(url);
            nextUrls[item.id] = url;
          }
        } catch {
          // Missing or inaccessible files leave the metadata visible without a thumbnail.
        }
      }
      if (active) setImageUrls(nextUrls);
    };
    void loadImages();
    return () => { active = false; createdUrls.forEach((url) => URL.revokeObjectURL(url)); };
  }, [evidenceItems]);

  const updateItem = (id: string, change: Partial<EvidenceItem>) => onChange(evidenceItems.map((item) => item.id === id ? { ...item, ...change } : item));

  const uploadImages = async (files: FileList | null) => {
    if (!files) return;
    const images = Array.from(files);
    const currentImageCount = evidenceItems.filter((item) => item.type === "image").length;
    if (currentImageCount + images.length > 10) {
      onNotify("warning", "A report can contain a maximum of 10 uploaded images.");
      return;
    }
    for (const file of images) {
      if (!acceptedImageTypes.includes(file.type)) {
        onNotify("error", `${file.name} is not a supported image. Use PNG, JPG, JPEG, or WebP.`);
        continue;
      }
      if (file.size > maximumImageBytes) {
        onNotify("error", `${file.name} exceeds the 3 MB image limit.`);
        continue;
      }
      const id = generateReportId();
      try {
        await saveEvidenceFile(reportId, id, file);
        onChange([...evidenceItems, { id, reportId, type: "image", title: file.name.replace(/\.[^.]+$/, ""), fileName: file.name, mimeType: file.type, createdAt: new Date().toISOString() }]);
      } catch (error) {
        onNotify("error", error instanceof Error ? `Could not store ${file.name}: ${error.message}` : `Could not store ${file.name}.`);
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const addUrl = () => {
    if (!urlDraft.title.trim() || !validUrl(urlDraft.sourceUrl)) {
      onNotify("warning", "Add a title and a valid http(s) source URL.");
      return;
    }
    onChange([...evidenceItems, { id: generateReportId(), reportId, type: "url", title: urlDraft.title.trim(), sourceUrl: urlDraft.sourceUrl.trim(), description: urlDraft.description.trim() || undefined, createdAt: new Date().toISOString() }]);
    setUrlDraft({ title: "", sourceUrl: "", description: "" }); setShowUrlForm(false);
  };

  const addText = () => {
    if (!textDraft.title.trim() || !textDraft.description.trim()) {
      onNotify("warning", "Add a title and technical note before saving text evidence.");
      return;
    }
    onChange([...evidenceItems, { id: generateReportId(), reportId, type: "text", title: textDraft.title.trim(), description: textDraft.description.trim(), createdAt: new Date().toISOString() }]);
    setTextDraft({ title: "", description: "" }); setShowTextForm(false);
  };

  const deleteItem = async () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === "image") {
      try { await deleteEvidenceFile(itemToDelete.id); } catch { onNotify("error", "The attachment could not be removed from browser storage."); return; }
    }
    onChange(evidenceItems.filter((item) => item.id !== itemToDelete.id));
    setItemToDelete(undefined);
    onNotify("success", "Evidence item removed.");
  };

  return <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-medium text-slate-200">Evidence Manager</h3><p className="mt-1 text-xs text-slate-500">Images are held in browser IndexedDB; report metadata stays lightweight.</p></div><div className="flex flex-wrap gap-2"><input ref={inputRef} className="sr-only" id="evidence-upload" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event) => void uploadImages(event.target.files)} /><label className="button-secondary cursor-pointer px-3 py-1.5 text-xs" htmlFor="evidence-upload">Upload image</label><button className="button-secondary px-3 py-1.5 text-xs" type="button" onClick={() => setShowUrlForm((visible) => !visible)}>Add URL</button><button className="button-secondary px-3 py-1.5 text-xs" type="button" onClick={() => setShowTextForm((visible) => !visible)}>Add technical note</button></div></div>
    <p className="text-xs text-slate-600">PNG, JPG, JPEG, or WebP · up to 3 MB each · {evidenceItems.filter((item) => item.type === "image").length}/10 image attachments</p>
    {showUrlForm && <div className="grid gap-3 rounded-lg border border-slate-700 bg-[#0d1014] p-4 md:grid-cols-3"><label className="field-group"><span>Title</span><input className="input-field" value={urlDraft.title} onChange={(event) => setUrlDraft({ ...urlDraft, title: event.target.value })} /></label><label className="field-group"><span>Source URL</span><input className="input-field" type="url" value={urlDraft.sourceUrl} onChange={(event) => setUrlDraft({ ...urlDraft, sourceUrl: event.target.value })} placeholder="https://…" /></label><label className="field-group"><span>Description</span><input className="input-field" value={urlDraft.description} onChange={(event) => setUrlDraft({ ...urlDraft, description: event.target.value })} /></label><div className="md:col-span-3 flex justify-end gap-2"><button className="button-secondary" type="button" onClick={() => setShowUrlForm(false)}>Cancel</button><button className="button-primary" type="button" onClick={addUrl}>Save URL evidence</button></div></div>}
    {showTextForm && <div className="rounded-lg border border-slate-700 bg-[#0d1014] p-4"><div className="grid gap-3 md:grid-cols-3"><label className="field-group"><span>Title</span><input className="input-field" value={textDraft.title} onChange={(event) => setTextDraft({ ...textDraft, title: event.target.value })} placeholder="HTTP response excerpt" /></label><label className="field-group md:col-span-2"><span>Technical note, request, or response snippet</span><textarea className="input-field min-h-28 resize-y font-mono text-xs" value={textDraft.description} onChange={(event) => setTextDraft({ ...textDraft, description: event.target.value })} /></label></div><div className="mt-3 flex justify-end gap-2"><button className="button-secondary" type="button" onClick={() => setShowTextForm(false)}>Cancel</button><button className="button-primary" type="button" onClick={addText}>Save text evidence</button></div></div>}
    {evidenceItems.length === 0 ? <p className="rounded-md border border-dashed border-slate-700 px-4 py-5 text-sm text-slate-500">No evidence has been added to this report.</p> : <div className="grid gap-4 lg:grid-cols-2">{evidenceItems.map((item) => <article className="rounded-lg border border-slate-800 bg-[#0d1014] p-4" key={item.id}><div className="mb-3 flex items-start gap-3">{item.type === "image" ? imageUrls[item.id] ? <button className="h-16 w-24 overflow-hidden rounded border border-slate-700 bg-slate-900" type="button" onClick={() => setSelectedImage(item)} aria-label={`Preview ${item.title}`}><img className="h-full w-full object-cover" src={imageUrls[item.id]} alt={item.title} /></button> : <div className="flex h-16 w-24 items-center justify-center rounded border border-dashed border-slate-700 text-xs text-slate-600">Unavailable</div> : <div className="flex h-10 w-10 items-center justify-center rounded border border-slate-700 bg-slate-900 text-slate-400" aria-hidden="true">{item.type === "url" ? "↗" : "¶"}</div>}<div className="min-w-0 flex-1"><p className="text-xs uppercase tracking-wide text-slate-600">{item.type === "image" ? item.fileName : item.type === "url" ? "Source URL" : "Text evidence"}</p>{item.type === "url" && item.sourceUrl && <a className="mt-1 block truncate text-xs text-cyan-400 hover:text-cyan-300" href={item.sourceUrl} target="_blank" rel="noreferrer">{item.sourceUrl}</a>}</div><button className="table-action-danger" type="button" onClick={() => setItemToDelete(item)}>Delete</button></div><div className="grid gap-3"><label className="field-group"><span>Title</span><input className="input-field" value={item.title} onChange={(event) => updateItem(item.id, { title: event.target.value })} /></label><label className="field-group"><span>Description</span><textarea className={`input-field min-h-20 resize-y ${item.type === "text" ? "font-mono text-xs" : ""}`} value={item.description ?? ""} onChange={(event) => updateItem(item.id, { description: event.target.value || undefined })} placeholder={item.type === "text" ? "Request, response, or technical observation" : "Optional context"} /></label></div></article>)}</div>}
    {selectedImage && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-6" role="presentation" onMouseDown={() => setSelectedImage(undefined)}><div className="max-h-full max-w-5xl" role="dialog" aria-modal="true" aria-label={`Preview ${selectedImage.title}`} onMouseDown={(event) => event.stopPropagation()}><div className="mb-3 flex items-center justify-between text-sm text-slate-300"><span>{selectedImage.title}</span><button className="button-secondary px-3 py-1.5 text-xs" type="button" onClick={() => setSelectedImage(undefined)}>Close preview</button></div>{imageUrls[selectedImage.id] ? <img className="max-h-[80vh] max-w-full rounded border border-slate-700" src={imageUrls[selectedImage.id]} alt={selectedImage.title} /> : <p className="rounded bg-slate-900 p-6 text-slate-400">The image attachment is unavailable.</p>}</div></div>}
    <ConfirmDialog isOpen={Boolean(itemToDelete)} title="Delete evidence item?" description="This removes the item from the report. Uploaded images will also be deleted from browser storage." confirmLabel="Delete evidence" onConfirm={() => void deleteItem()} onCancel={() => setItemToDelete(undefined)} />
  </section>;
}
