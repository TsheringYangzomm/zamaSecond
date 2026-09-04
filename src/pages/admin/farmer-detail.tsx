import { useState, type ReactNode } from "react";
import { btnOutlineSm, btnOutlineXs, btnPrimarySm } from "../../components/ui/styles";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import type { FarmerDocumentRow, FarmerPrivateInfoRow, FarmerRow, FarmerSeasonalUpdateRow, FarmerStoryRow } from "../../cms/types";
import { getFarmerDocumentSignedUrl } from "../../admin/admin-api";
import { formatPartnerSince } from "../../cms/partner-since";
import { DocumentPicker } from "./admin-fields";

type FarmerDetailProps = {
  farmer: FarmerRow;
  privateInfo?: FarmerPrivateInfoRow | null;
  storyInfo?: FarmerStoryRow | null;
  seasonalInfo?: FarmerSeasonalUpdateRow | null;
  documentsEnabled: boolean;
  documents: FarmerDocumentRow[];
  productName: (id: string) => string;
  onEdit: () => void;
  onBack: () => void;
  onToggleActive: () => void;
  onSaveChanges: (adds: FarmerDocumentRow[], deletes: FarmerDocumentRow[]) => Promise<void>;
};

function detailRow(label: string, value: ReactNode) {
  return (
    <div className="grid gap-0.5">
      <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">{label}</span>
      <span className="text-brand-black">{value || "—"}</span>
    </div>
  );
}

function formatBytes(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function SectionCard({ title, tone, children, hint }: { title: string; tone: "main" | "story" | "private" | "docs"; children: ReactNode; hint?: string }) {
  const toneClasses: Record<string, string> = {
    main: "border-brand-forest bg-brand-white",
    story: "border-brand-green-ink/40 bg-brand-mint/25",
    private: "border-brand-orange-ink/40 bg-brand-buff/50",
    docs: "border-brand-forest bg-brand-white",
  };
  return (
    <section className={`grid gap-4 rounded-wobbly-card border-3 p-5 ${toneClasses[tone]}`}>
      <div className="grid gap-1">
        <h3 className="font-primary text-lg font-bold text-brand-green-ink">{title}</h3>
        {hint ? <p className="text-xs font-semibold text-brand-black/60">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function FarmerDetail({
  farmer,
  privateInfo,
  storyInfo,
  seasonalInfo,
  documentsEnabled,
  documents,
  productName,
  onEdit,
  onBack,
  onToggleActive,
  onSaveChanges,
}: FarmerDetailProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAdds, setPendingAdds] = useState<FarmerDocumentRow[]>([]);
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  const [confirmLeave, setConfirmLeave] = useState<"back" | "edit" | null>(null);

  const dirty = pendingAdds.length > 0 || pendingDeletes.size > 0;

  const displayedDocs = [
    ...pendingAdds,
    ...documents.filter((doc) => !pendingDeletes.has(doc.id)),
  ];

  function handleAddDocument(file: File, url: string) {
    const extension = (file.name.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const doc: FarmerDocumentRow = {
      id: "",
      farmer_id: farmer.id,
      title: file.name,
      file_type: extension,
      url,
      size_bytes: file.size,
      created_at: new Date().toISOString(),
    };
    setError(null);
    setPendingAdds((current) => [doc, ...current]);
  }

  function handleDeleteDocument(doc: FarmerDocumentRow) {
    setError(null);
    if (!doc.id) {
      setPendingAdds((current) => current.filter((item) => item !== doc));
      return;
    }
    setPendingDeletes((current) => new Set(current).add(doc.id));
  }

  async function handleSaveChanges() {
    setError(null);
    setBusy(true);
    const deletes = documents.filter((doc) => pendingDeletes.has(doc.id));
    try {
      await onSaveChanges(pendingAdds, deletes);
      setPendingAdds([]);
      setPendingDeletes(new Set());
      onBack();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the changes.");
    } finally {
      setBusy(false);
    }
  }

  function requestLeave(action: "back" | "edit") {
    if (dirty) {
      setConfirmLeave(action);
      return;
    }
    leave(action);
  }

  async function handleOpenDocument(doc: FarmerDocumentRow) {
    try {
      const signedUrl = await getFarmerDocumentSignedUrl(doc.url);
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : "Could not open the document.");
    }
  }

  function leave(action: "back" | "edit") {
    setConfirmLeave(null);
    if (action === "edit") onEdit();
    else onBack();
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1">
          <button className="w-fit text-sm font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 hover:text-brand-forest" type="button" onClick={() => requestLeave("back")}>← Back to farmers</button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-primary text-[clamp(1.7rem,3.5vw,2.4rem)] font-bold leading-[1.02] text-brand-green-ink">{farmer.name}</h1>
            <span className="rounded-full border-2 border-brand-forest bg-brand-white px-3 py-1 text-xs font-bold text-brand-black">{farmer.id}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border-2 px-2.5 py-0.5 text-xs font-bold ${farmer.published ? "border-brand-forest bg-brand-mint text-brand-green-ink" : "border-brand-black/30 bg-brand-white text-brand-black/52"}`}>
            {farmer.published ? "Active" : "Inactive"}
          </span>
          <button className={btnOutlineSm} type="button" onClick={onToggleActive} disabled={busy}>{farmer.published ? "Set inactive" : "Activate"}</button>
          <button className={btnOutlineSm} type="button" onClick={() => requestLeave("edit")} disabled={busy}>Edit</button>
        </div>
      </div>

      {error ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-orange/10 px-3 py-2 text-sm font-semibold text-brand-black" role="alert">{error}</p> : null}

      {dirty ? (
        <p className="rounded-wobbly-card border-3 border-dashed border-brand-orange-ink/40 bg-brand-buff/50 px-4 py-3 text-sm font-semibold text-brand-black">
          You have unsaved changes ({pendingAdds.length} new, {pendingDeletes.size} removed). Save them before leaving.
        </p>
      ) : null}

      <SectionCard title="Farmer profile">
        {farmer.image ? (
          <img className="h-28 w-28 rounded-wobbly-md border-3 border-brand-forest/30 bg-brand-warm-white object-cover shadow-brand-soft" src={farmer.image} alt="" />
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          {detailRow("Location", farmer.location)}
          {detailRow("Dzongkhag", farmer.dzongkhag)}
          {detailRow("Years farming", farmer.years_farming ? `${farmer.years_farming}` : "")}
          {detailRow("Partner since", formatPartnerSince(farmer.partner_since))}
          {detailRow("Verified", farmer.verified ? "Yes" : "No")}
          {detailRow("Products", farmer.products.length ? farmer.products.map((id) => productName(id)).join(", ") : "")}
          {detailRow("Tags", farmer.tags.join(", "))}
          {detailRow("Bio", farmer.bio)}
        </div>
      </SectionCard>

      <SectionCard title="Farmer storytelling" tone="story" hint="The latest published seasonal update shows on the landing page; a published story is linked as “Read their story”.">
        {seasonalInfo ? (
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Latest seasonal update</span>
              <span className={`rounded-full border-2 px-2 py-0.5 text-xs font-bold ${seasonalInfo.published ? "border-brand-forest bg-brand-mint text-brand-green-ink" : "border-brand-black/30 bg-brand-white text-brand-black/52"}`}>
                {seasonalInfo.published ? "Published" : "Draft"}
              </span>
              <span className="text-xs font-bold text-brand-black/52">{seasonalInfo.season}</span>
            </div>
            <p className="text-brand-black">{seasonalInfo.content || "—"}</p>
          </div>
        ) : (
          <p className="text-sm text-brand-black/60">No seasonal update yet.</p>
        )}
        {storyInfo ? (
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Story</span>
              <span className={`rounded-full border-2 px-2 py-0.5 text-xs font-bold ${storyInfo.published ? "border-brand-forest bg-brand-mint text-brand-green-ink" : "border-brand-black/30 bg-brand-white text-brand-black/52"}`}>
                {storyInfo.published ? "Published" : "Draft"}
              </span>
            </div>
            <p className="text-brand-black">{storyInfo.content || "—"}</p>
          </div>
        ) : (
          <p className="text-sm text-brand-black/60">No story yet.</p>
        )}
      </SectionCard>

      <SectionCard title="Private — admin only" tone="private" hint="These details are never shown on the public site.">
        {privateInfo ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {detailRow("Village", privateInfo.village)}
            {detailRow("Farm size", privateInfo.farm_size)}
            {detailRow("Farming practices", privateInfo.farming_practices)}
            {detailRow("Phone", privateInfo.contact_phone)}
            {detailRow("Email", privateInfo.contact_email)}
            {detailRow("Alternative contact", privateInfo.alternative_contact)}
            {detailRow("Preferred contact method", privateInfo.preferred_contact_method)}
            {detailRow("Admin notes", privateInfo.admin_notes)}
          </div>
        ) : (
          <p className="text-sm text-brand-black/60">Private details require the <code className="font-bold">farmer_private_info</code> table. Run <code className="font-bold">supabase/farmer-private-schema.sql</code> to enable them.</p>
        )}
      </SectionCard>

      <SectionCard
        title="Documents"
        tone="docs"
        hint="Admin-only files: contracts, signed agreements, and any other documents made with Zama. Upload a file below — files are kept as unsaved changes until you press Save changes."
      >
        {!documentsEnabled ? (
          <p className="rounded-wobbly-md border-2 border-dashed border-brand-forest/30 bg-brand-white px-3 py-2 text-xs font-semibold text-brand-black/64">
            Documents require the <code className="font-bold">farmer_documents</code> table and <code className="font-bold">farmer-docs</code> storage bucket. Run <code className="font-bold">supabase/farmer-document-schema.sql</code> to enable them.
          </p>
        ) : (
          <>
            {displayedDocs.length === 0 ? (
              <p className="rounded-wobbly-md border-2 border-dashed border-brand-forest/30 bg-brand-white px-3 py-2 text-xs font-semibold text-brand-black/64">No documents uploaded for {farmer.name} yet.</p>
            ) : (
              <ul className="grid gap-2">
                {displayedDocs.map((doc) => {
                  const isPending = pendingAdds.includes(doc);
                  const isDeleted = pendingDeletes.has(doc.id);
                  return (
                    <li key={isPending ? doc.url : doc.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-wobbly-md border-2 bg-brand-white px-3 py-2 ${isPending ? "border-brand-orange-ink/50 shadow-brand-soft" : isDeleted ? "border-brand-orange/40 opacity-60" : "border-brand-forest/20"}`}>
                      <div className="grid gap-0.5">
                        <span className="font-bold text-brand-black">
                          {doc.title || doc.url.split("/").pop()}
                          {isPending ? <span className="ml-2 rounded-full border-2 border-brand-orange-ink bg-brand-buff px-2 py-0.5 text-[0.65rem] font-bold text-brand-orange-ink">New</span> : null}
                          {isDeleted ? <span className="ml-2 rounded-full border-2 border-brand-orange bg-brand-orange/15 px-2 py-0.5 text-[0.65rem] font-bold text-brand-orange-ink">Will be removed</span> : null}
                        </span>
                        <span className="text-xs font-semibold text-brand-black/52">
                          {doc.file_type ? doc.file_type.toUpperCase() : ""}{doc.size_bytes != null ? ` · ${formatBytes(doc.size_bytes)}` : ""} · {formatDate(doc.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isDeleted ? <button className={btnOutlineXs} type="button" onClick={() => void handleOpenDocument(doc)}>Open</button> : null}
                        <button className={btnOutlineXs} type="button" onClick={() => handleDeleteDocument(doc)} disabled={busy}>{isDeleted ? "Undo" : "Delete"}</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <DocumentPicker farmerId={farmer.id} onUploaded={(file, url) => void handleAddDocument(file, url)} />
          </>
        )}
      </SectionCard>

      <div className="flex flex-wrap items-center gap-3">
        <button className={btnPrimarySm} type="button" onClick={() => void handleSaveChanges()} disabled={busy || !dirty}>
          {busy ? "Saving..." : "Save changes"}
        </button>
        {dirty ? (
          <button className={btnOutlineSm} type="button" onClick={() => { setPendingAdds([]); setPendingDeletes(new Set()); setError(null); }} disabled={busy}>Discard changes</button>
        ) : null}
        <button className={btnOutlineSm} type="button" onClick={() => requestLeave("edit")} disabled={busy}>Edit farmer</button>
        <button className={btnOutlineSm} type="button" onClick={() => requestLeave("back")} disabled={busy}>Back to farmers</button>
      </div>

      <ConfirmDialog
        open={confirmLeave !== null}
        title="Unsaved changes"
        message="You have unsaved document changes. Leave without saving them?"
        confirmLabel="Leave without saving"
        busy={busy}
        onConfirm={() => leave(confirmLeave ?? "back")}
        onCancel={() => setConfirmLeave(null)}
      />
    </div>
  );
}
