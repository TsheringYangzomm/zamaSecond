import { useEffect, useMemo, useRef, useState } from "react";
import { Clipboard, ExternalLink, FileText, RefreshCw, Trash2, Upload } from "lucide-react";
import { useAdminAuth } from "../../admin/admin-auth";
import { btnOutlineSm, btnPrimarySm } from "../../components/ui/styles";
import { farmerDzongkhags } from "../../data/farmers";
import { fetchAdminPartnershipRequests, fetchPartnershipPageSettings, savePartnershipPageSettings, updateAdminPartnershipRequest } from "../../partnerships/partnership-api";
import { deletePartnershipDocument, fetchAdminPartnershipDocuments, getPartnershipDocumentSignedUrl, uploadPartnershipDocument } from "../../partnerships/partnership-documents-api";
import { createDefaultPartnershipPageSettings, farmProducerTypeId, makePartnerTypeId, normalisePartnershipPageSettings } from "../../partnerships/partnership-defaults";
import type { PartnershipDocument, PartnershipPageSettings, PartnershipRequest, PartnershipStatus } from "../../partnerships/partnership-types";
import { ClearFiltersButton, ColumnFilterDropdown, DATE_RANGES, dateRangeKey } from "./column-filter-dropdown";
import { inputClasses, textAreaClasses } from "./admin-fields";

const statuses: PartnershipStatus[] = ["new", "in_review", "contacted", "approved", "declined"];

const statusLabels: Record<PartnershipStatus, string> = {
  new: "New",
  in_review: "In review",
  contacted: "Contacted",
  approved: "Approved",
  declined: "Declined",
};

function statusClass(status: PartnershipStatus): string {
  if (status === "approved") return "border-brand-forest bg-brand-mint text-brand-green-ink";
  if (status === "declined") return "border-brand-orange-ink bg-brand-buff text-brand-orange-ink";
  if (status === "new") return "border-brand-orange-ink bg-brand-yellow text-brand-orange-ink";
  return "border-brand-forest/30 bg-brand-warm-white text-brand-black/70";
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-BT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Thimphu" }).format(parsed);
}

function fieldLabel(label: string) {
  return <span className="text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">{label}</span>;
}

export function PartnershipsTab() {
  const { email } = useAdminAuth();
  const [requests, setRequests] = useState<PartnershipRequest[] | null>(null);
  const [settings, setSettings] = useState<PartnershipPageSettings>(createDefaultPartnershipPageSettings);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ status: "", type: "", dzongkhag: "", date: "", archived: "active" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<PartnershipPageSettings>(createDefaultPartnershipPageSettings);

  const selected = useMemo(() => requests?.find((request) => request.id === selectedId) ?? null, [requests, selectedId]);
  const typeLabels = useMemo(() => new Map(settings.partnerTypes.map((type) => [type.id, type.label])), [settings.partnerTypes]);

  const filtered = useMemo(() => {
    if (!requests) return [];
    const needle = query.trim().toLowerCase();
    return requests.filter((request) => {
      if (filters.archived === "active" && request.archivedAt) return false;
      if (filters.archived === "archived" && !request.archivedAt) return false;
      if (filters.status && request.status !== filters.status) return false;
      if (filters.type && request.partnerType !== filters.type) return false;
      if (filters.dzongkhag && request.dzongkhag !== filters.dzongkhag) return false;
      if (filters.date && dateRangeKey(request.createdAt) !== filters.date) return false;
      if (!needle) return true;
      return [request.contactName, request.organisationName, request.email, request.phone, request.message, request.location, request.dzongkhag]
        .some((value) => value.toLowerCase().includes(needle));
    });
  }, [filters, query, requests]);

  const counts = useMemo(() => Object.fromEntries(statuses.map((status) => [status, (requests ?? []).filter((request) => request.status === status && !request.archivedAt).length])) as Record<PartnershipStatus, number>, [requests]);

  async function load() {
    setError(null);
    try {
      const [nextRequests, nextSettings] = await Promise.all([fetchAdminPartnershipRequests(), fetchPartnershipPageSettings()]);
      setRequests(nextRequests);
      setSettings(nextSettings);
      setSettingsDraft(nextSettings);
      setSelectedId((current) => current && nextRequests.some((request) => request.id === current) ? current : null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load partnership data.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function copyContact(value: string, label: string) {
    if (!value) {
      setNotice(`There is no ${label.toLowerCase()} for this request.`);
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`${label} copied.`);
    } catch {
      setNotice(`Could not copy ${label.toLowerCase()}.`);
    }
  }

  async function saveRequest(request: PartnershipRequest, patch: Partial<Pick<PartnershipRequest, "status" | "adminNotes" | "archivedAt">>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await updateAdminPartnershipRequest(request.id, {
        status: patch.status ?? request.status,
        adminNotes: patch.adminNotes ?? request.adminNotes,
        archived: patch.archivedAt === undefined ? Boolean(request.archivedAt) : Boolean(patch.archivedAt),
      }, email ?? "admin");
      setRequests((current) => (current ?? []).map((item) => item.id === updated.id ? updated : item));
      setSelectedId(updated.id);
      setNotice(updated.farmerId && !request.farmerId ? "Request saved and an unpublished farmer draft was created." : "Partnership request saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the partnership request.");
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await savePartnershipPageSettings(normalisePartnershipPageSettings(settingsDraft));
      setSettings(saved);
      setSettingsDraft(saved);
      setNotice("Public partnership page settings saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save partnership page settings.");
    } finally {
      setBusy(false);
    }
  }

  function addPartnerType(label: string) {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) return;
    setSettingsDraft((current) => ({
      ...current,
      partnerTypes: [...current.partnerTypes, { id: makePartnerTypeId(trimmedLabel, current.partnerTypes.map((type) => type.id)), label: trimmedLabel }],
    }));
  }

  const activeFilterCount = [filters.status, filters.type, filters.dzongkhag, filters.date, filters.archived !== "active" ? filters.archived : ""].filter(Boolean).length;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1"><p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-orange-ink">People</p><h1 className="font-primary text-[clamp(1.7rem,3.5vw,2.4rem)] font-bold leading-[1.02] text-brand-green-ink">Partnerships</h1><p className="text-sm text-brand-black/68">{requests ? `${requests.filter((request) => !request.archivedAt).length} active request${requests.filter((request) => !request.archivedAt).length === 1 ? "" : "s"}` : "Loading partnership requests..."}</p></div>
        <button className={btnOutlineSm} type="button" disabled={busy} onClick={() => void load()}><RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh</button>
      </div>

      {error ? <div className="grid gap-2 rounded-wobbly-card border-3 border-dashed border-brand-orange bg-brand-orange/10 p-4"><p className="text-sm font-semibold text-brand-black" role="alert">{error}</p><div><button className={btnOutlineSm} type="button" onClick={() => void load()}>Try again</button></div></div> : null}
      {notice ? <p className="text-sm font-semibold text-brand-green-ink" role="status">{notice}</p> : null}

      <section className="grid gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft" aria-label="Partnership request summary">
        <div className="flex flex-wrap gap-2">{statuses.map((status) => <button className={`rounded-full border-2 px-3 py-1 text-xs font-bold ${filters.status === status ? statusClass(status) : "border-brand-forest/20 bg-brand-warm-white text-brand-black/65"}`} key={status} type="button" onClick={() => setFilters((current) => ({ ...current, status: current.status === status ? "" : status }))}>{statusLabels[status]} {counts[status]}</button>)}</div>
        <input className={inputClasses} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search organisation, person, email, location, or request..." aria-label="Search partnership requests" />
        <div className="flex flex-wrap gap-2"><ColumnFilterDropdown label="Type" options={settings.partnerTypes.map((type) => ({ value: type.id, label: type.label }))} value={filters.type} onSelect={(type) => setFilters((current) => ({ ...current, type }))} /><ColumnFilterDropdown label="Dzongkhag" options={farmerDzongkhags.map((dzongkhag) => ({ value: dzongkhag, label: dzongkhag }))} value={filters.dzongkhag} onSelect={(dzongkhag) => setFilters((current) => ({ ...current, dzongkhag }))} /><ColumnFilterDropdown label="Date" options={DATE_RANGES} value={filters.date} onSelect={(date) => setFilters((current) => ({ ...current, date }))} /><ColumnFilterDropdown label="Records" options={[{ value: "active", label: "Active" }, { value: "archived", label: "Archived" }, { value: "all", label: "All" }]} value={filters.archived} onSelect={(archived) => setFilters((current) => ({ ...current, archived }))} /><ClearFiltersButton count={activeFilterCount} onClear={() => setFilters({ status: "", type: "", dzongkhag: "", date: "", archived: "active" })} /></div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(19rem,0.8fr)_minmax(0,1.2fr)]">
        <section className="grid content-start gap-2" aria-label="Partnership request list">
          {requests === null ? <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-white p-5 text-sm text-brand-black/60">Loading requests...</p> : filtered.length === 0 ? <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-white p-5 text-sm text-brand-black/60">No partnership requests match these filters.</p> : filtered.map((request) => <button className={`grid gap-2 rounded-wobbly-card border-3 p-4 text-left shadow-brand-soft transition-colors ${selectedId === request.id ? "border-brand-green-ink bg-brand-mint" : "border-brand-forest bg-brand-white hover:bg-brand-warm-white"}`} type="button" key={request.id} onClick={() => setSelectedId(request.id)}><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="truncate font-primary text-lg font-bold text-brand-green-ink">{request.organisationName}</p><p className="text-sm text-brand-black/68">{request.contactName} · {typeLabels.get(request.partnerType) ?? request.partnerType}</p></div><span className={`rounded-full border-2 px-2 py-1 text-[0.67rem] font-bold ${statusClass(request.status)}`}>{statusLabels[request.status]}</span></div><div className="flex flex-wrap justify-between gap-2 text-xs text-brand-black/55"><span>{request.dzongkhag || "Location pending"}</span><span>{formatDateTime(request.createdAt)}</span></div></button>)}</section>

        <section className="min-w-0" aria-label="Partnership request detail">
          {selected ? <PartnershipRequestDetail request={selected} typeLabel={typeLabels.get(selected.partnerType) ?? selected.partnerType} busy={busy} onCopy={copyContact} onSave={saveRequest} /> : <div className="grid min-h-70 place-items-center rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-warm-white p-6 text-center text-sm font-semibold text-brand-black/60">Select a partnership request to review its details, notes, and status.</div>}
        </section>
      </div>

      <PartnershipSettingsPanel settings={settingsDraft} busy={busy} onChange={setSettingsDraft} onAddType={addPartnerType} onSave={() => void saveSettings()} />
    </div>
  );
}

function PartnershipRequestDetail({ request, typeLabel, busy, onCopy, onSave }: {
  request: PartnershipRequest;
  typeLabel: string;
  busy: boolean;
  onCopy: (value: string, label: string) => Promise<void>;
  onSave: (request: PartnershipRequest, patch: Partial<Pick<PartnershipRequest, "status" | "adminNotes" | "archivedAt">>) => Promise<void>;
}) {
  const [status, setStatus] = useState(request.status);
  const [notes, setNotes] = useState(request.adminNotes);

  useEffect(() => {
    setStatus(request.status);
    setNotes(request.adminNotes);
  }, [request]);

  const canArchive = status === "approved" || status === "declined";
  return <article className="grid gap-5 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-5 shadow-brand">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="grid gap-1"><p className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">{typeLabel}</p><h2 className="font-primary text-[clamp(1.5rem,3vw,2.1rem)] font-bold text-brand-green-ink">{request.organisationName}</h2><p className="text-sm text-brand-black/65">Submitted {formatDateTime(request.createdAt)}</p></div><span className={`rounded-full border-2 px-3 py-1 text-xs font-bold ${statusClass(request.status)}`}>{statusLabels[request.status]}</span></div>
    <div className="grid gap-3 rounded-wobbly-md border-2 border-dashed border-brand-forest/25 bg-brand-warm-white p-4 sm:grid-cols-2"><div className="grid gap-1"><span className="text-xs font-bold uppercase tracking-[0.08em] text-brand-black/55">Contact</span><strong className="text-brand-green-ink">{request.contactName}</strong></div><div className="grid gap-1"><span className="text-xs font-bold uppercase tracking-[0.08em] text-brand-black/55">Contact details</span><div className="flex flex-wrap gap-2"><button className={btnOutlineSm} type="button" onClick={() => void onCopy(request.email, "Email")}><Clipboard className="h-3.5 w-3.5" aria-hidden="true" /> Copy email</button>{request.phone ? <button className={btnOutlineSm} type="button" onClick={() => void onCopy(request.phone, "Phone")}><Clipboard className="h-3.5 w-3.5" aria-hidden="true" /> Copy phone</button> : null}</div></div>{request.location || request.dzongkhag ? <div className="grid gap-1 sm:col-span-2"><span className="text-xs font-bold uppercase tracking-[0.08em] text-brand-black/55">Farm location</span><span className="text-sm text-brand-black/75">{[request.location, request.dzongkhag].filter(Boolean).join(", ")}</span></div> : null}</div>
    <div className="grid gap-1"><span className="text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">Their request</span><p className="whitespace-pre-wrap rounded-wobbly-md border-2 border-brand-forest/18 bg-brand-white p-4 text-sm leading-relaxed text-brand-black">{request.message}</p></div>
    <label className="grid gap-2">{fieldLabel("Status")}<select className={inputClasses} value={status} onChange={(event) => setStatus(event.target.value as PartnershipStatus)}>{statuses.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}</select></label>
    <label className="grid gap-2">{fieldLabel("Private admin notes")}<textarea className={`${textAreaClasses} min-h-30`} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Internal follow-up notes. These are never shown publicly." /></label>
    <PartnershipDocuments requestId={request.id} />
    {request.partnerType === farmProducerTypeId && status === "approved" ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-green-ink/35 bg-brand-mint p-3 text-sm font-semibold text-brand-green-ink">{request.farmerId ? "An unpublished farmer draft is linked to this request." : "Saving approval will create an unpublished, unverified farmer draft with private contact details."}</p> : null}
    <div className="flex flex-wrap items-center gap-2"><button className={btnPrimarySm} type="button" disabled={busy} onClick={() => void onSave(request, { status, adminNotes: notes })}>{busy ? "Saving..." : "Save request"}</button>{request.farmerId ? <a className={btnOutlineSm} href={`/admin?tab=farmers&farmer=${encodeURIComponent(request.farmerId)}`}><ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Open farmer draft</a> : null}{request.archivedAt ? <button className={btnOutlineSm} type="button" disabled={busy} onClick={() => void onSave(request, { status, adminNotes: notes, archivedAt: null })}>Restore request</button> : <button className="min-h-9 rounded-full border-2 border-brand-orange-ink px-3 py-1 text-xs font-bold text-brand-orange-ink disabled:opacity-50" type="button" disabled={busy || !canArchive} title={!canArchive ? "Approve or decline before archiving." : undefined} onClick={() => void onSave(request, { status, adminNotes: notes, archivedAt: new Date().toISOString() })}>Archive</button>}</div>
  </article>;
}

function formatDocumentSize(size: number | null): string {
  if (size == null || !Number.isFinite(size)) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function PartnershipDocuments({ requestId }: { requestId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<PartnershipDocument[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setDocuments(null);
    setError(null);
    async function loadDocuments() {
      try {
        const nextDocuments = await fetchAdminPartnershipDocuments(requestId);
        if (active) setDocuments(nextDocuments);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not load partnership documents.");
      }
    }
    void loadDocuments();
    return () => { active = false; };
  }, [requestId]);

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const document = await uploadPartnershipDocument(requestId, file);
      setDocuments((current) => [document, ...(current ?? [])]);
      setNotice(`${document.title} uploaded privately.`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not upload the document.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function open(document: PartnershipDocument) {
    setError(null);
    try {
      const url = await getPartnershipDocumentSignedUrl(document);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : "Could not open the document.");
    }
  }

  async function remove(document: PartnershipDocument) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await deletePartnershipDocument(document);
      setDocuments((current) => (current ?? []).filter((item) => item.id !== document.id));
      setNotice(`${document.title} removed.`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not remove the document.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="grid gap-3 rounded-wobbly-md border-2 border-dashed border-brand-forest/25 bg-brand-warm-white p-4" aria-label="Private partnership documents">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="grid gap-1"><p className="flex items-center gap-1.5 font-primary text-lg font-bold text-brand-green-ink"><FileText className="h-4.5 w-4.5" aria-hidden="true" />Private documents</p><p className="text-xs leading-relaxed text-brand-black/60">Agreements, certificates, and verification files are visible only to authorised admins. PDF, Word, Excel, PNG, JPG, and WebP files up to 10 MB are supported.</p></div><input ref={inputRef} className="hidden" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,application/pdf,image/*" onChange={(event) => void upload(event.target.files?.[0])} /><button className={btnOutlineSm} type="button" disabled={busy} onClick={() => inputRef.current?.click()}><Upload className="h-3.5 w-3.5" aria-hidden="true" /> {busy ? "Uploading..." : "Upload document"}</button></div>
    {error ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-orange/10 p-3 text-xs font-semibold text-brand-black" role="alert">{error}</p> : null}
    {notice ? <p className="text-xs font-semibold text-brand-green-ink" role="status">{notice}</p> : null}
    {documents === null ? <p className="text-sm text-brand-black/55">Loading documents...</p> : documents.length === 0 ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-forest/20 bg-brand-white p-3 text-sm text-brand-black/60">No private documents attached yet.</p> : <ul className="grid gap-2">{documents.map((document) => <li className="flex flex-wrap items-center justify-between gap-3 rounded-wobbly-md border-2 border-brand-forest/18 bg-brand-white p-3" key={document.id}><div className="min-w-0 grid gap-0.5"><strong className="truncate text-sm text-brand-green-ink">{document.title}</strong><span className="text-xs text-brand-black/55">{document.fileType.toUpperCase()}{document.sizeBytes != null ? ` · ${formatDocumentSize(document.sizeBytes)}` : ""} · {formatDateTime(document.createdAt)}</span></div><div className="flex flex-wrap gap-2"><button className={btnOutlineSm} type="button" disabled={busy} onClick={() => void open(document)}><ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Open</button><button className="min-h-9 rounded-full border-2 border-brand-orange-ink px-3 py-1 text-xs font-bold text-brand-orange-ink disabled:opacity-50" type="button" disabled={busy} onClick={() => void remove(document)}><Trash2 className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />Remove</button></div></li>)}</ul>}
  </section>;
}

function PartnershipSettingsPanel({ settings, busy, onChange, onAddType, onSave }: {
  settings: PartnershipPageSettings;
  busy: boolean;
  onChange: (settings: PartnershipPageSettings) => void;
  onAddType: (label: string) => void;
  onSave: () => void;
}) {
  const [newPartnerType, setNewPartnerType] = useState("");

  function update<K extends keyof PartnershipPageSettings>(key: K, value: PartnershipPageSettings[K]) {
    onChange({ ...settings, [key]: value });
  }

  return <section className="grid gap-5 rounded-wobbly-card border-3 border-brand-forest bg-brand-warm-white p-5 shadow-brand" aria-labelledby="partnership-settings-title">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="grid gap-1"><p className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Public page control</p><h2 id="partnership-settings-title" className="font-primary text-2xl font-bold text-brand-green-ink">Partnership page settings</h2><p className="text-sm text-brand-black/65">These settings control the public partnership page and its request form.</p></div><label className="flex items-center gap-2 rounded-full border-2 border-brand-forest bg-brand-white px-3 py-2 text-sm font-bold text-brand-green-ink"><input type="checkbox" checked={settings.intakeOpen} onChange={(event) => update("intakeOpen", event.target.checked)} /> Accepting requests</label></div>
    <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2">{fieldLabel("Tag")}<input className={inputClasses} value={settings.tag} onChange={(event) => update("tag", event.target.value)} /></label><label className="grid gap-2">{fieldLabel("Submit label")}<input className={inputClasses} value={settings.submitLabel} onChange={(event) => update("submitLabel", event.target.value)} /></label><label className="grid gap-2 sm:col-span-2">{fieldLabel("Heading")}<input className={inputClasses} value={settings.heading} onChange={(event) => update("heading", event.target.value)} /></label><label className="grid gap-2 sm:col-span-2">{fieldLabel("Introduction")}<textarea className={textAreaClasses} value={settings.intro} onChange={(event) => update("intro", event.target.value)} /></label></div>
    <div className="grid gap-4 rounded-wobbly-md border-2 border-dashed border-brand-forest/25 bg-brand-white p-4"><h3 className="font-primary text-lg font-bold text-brand-green-ink">Form copy</h3><label className="grid gap-2">{fieldLabel("Eyebrow")}<input className={inputClasses} value={settings.formEyebrow} onChange={(event) => update("formEyebrow", event.target.value)} /></label><label className="grid gap-2">{fieldLabel("Form heading")}<input className={inputClasses} value={settings.formHeading} onChange={(event) => update("formHeading", event.target.value)} /></label><label className="grid gap-2">{fieldLabel("Form description")}<textarea className={textAreaClasses} value={settings.formCopy} onChange={(event) => update("formCopy", event.target.value)} /></label><label className="grid gap-2">{fieldLabel("Privacy note")}<textarea className={textAreaClasses} value={settings.privacyCopy} onChange={(event) => update("privacyCopy", event.target.value)} /></label></div>
    <div className="grid gap-4 rounded-wobbly-md border-2 border-dashed border-brand-forest/25 bg-brand-white p-4"><h3 className="font-primary text-lg font-bold text-brand-green-ink">When applications are paused</h3><label className="grid gap-2">{fieldLabel("Paused title")}<input className={inputClasses} value={settings.pausedTitle} onChange={(event) => update("pausedTitle", event.target.value)} /></label><label className="grid gap-2">{fieldLabel("Paused message")}<textarea className={textAreaClasses} value={settings.pausedCopy} onChange={(event) => update("pausedCopy", event.target.value)} /></label></div>
    <div className="grid gap-4 rounded-wobbly-md border-2 border-dashed border-brand-forest/25 bg-brand-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-primary text-lg font-bold text-brand-green-ink">Supporting cards</h3><button className={btnOutlineSm} type="button" disabled={settings.highlights.length >= 3} onClick={() => update("highlights", [...settings.highlights, { title: "New partnership path", copy: "Explain how Zama can work with this partner type." }])}>Add card</button></div><div className="grid gap-3 md:grid-cols-3">{settings.highlights.map((highlight, index) => <div className="grid gap-2 rounded-wobbly-md border-2 border-brand-forest/18 p-3" key={`${highlight.title}-${index}`}><label className="grid gap-1">{fieldLabel("Title")}<input className={inputClasses} value={highlight.title} onChange={(event) => update("highlights", settings.highlights.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item))} /></label><label className="grid gap-1">{fieldLabel("Copy")}<textarea className={`${textAreaClasses} min-h-24`} value={highlight.copy} onChange={(event) => update("highlights", settings.highlights.map((item, itemIndex) => itemIndex === index ? { ...item, copy: event.target.value } : item))} /></label><button className="w-fit text-xs font-bold text-brand-orange-ink underline disabled:opacity-40" type="button" disabled={settings.highlights.length <= 1} onClick={() => update("highlights", settings.highlights.filter((_, itemIndex) => itemIndex !== index))}>Remove</button></div>)}</div></div>
    <div className="grid gap-4 rounded-wobbly-md border-2 border-dashed border-brand-forest/25 bg-brand-white p-4"><div className="grid gap-3"><div><h3 className="font-primary text-lg font-bold text-brand-green-ink">Partnership types</h3><p className="text-xs text-brand-black/60">The Farm or producer option keeps its secure farmer-draft behavior even if you rename its label.</p></div><div className="flex flex-wrap gap-2"><input className={`${inputClasses} min-w-[14rem] flex-1`} value={newPartnerType} onChange={(event) => setNewPartnerType(event.target.value)} placeholder="New partner type" aria-label="New partnership type" /><button className={btnOutlineSm} type="button" disabled={!newPartnerType.trim()} onClick={() => { onAddType(newPartnerType); setNewPartnerType(""); }}>Add type</button></div></div><div className="grid gap-2 sm:grid-cols-2">{settings.partnerTypes.map((type, index) => <div className="flex min-w-0 items-center gap-2 rounded-wobbly-md border-2 border-brand-forest/18 p-2" key={type.id}><input className={`${inputClasses} min-w-0 flex-1`} value={type.label} onChange={(event) => update("partnerTypes", settings.partnerTypes.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} /><button className="shrink-0 text-xs font-bold text-brand-orange-ink underline disabled:opacity-40" type="button" disabled={type.id === farmProducerTypeId} title={type.id === farmProducerTypeId ? "This option is needed for farm draft creation." : undefined} onClick={() => update("partnerTypes", settings.partnerTypes.filter((item) => item.id !== type.id))}>Remove</button></div>)}</div></div>
    <div><button className={btnPrimarySm} type="button" disabled={busy} onClick={onSave}>{busy ? "Saving..." : "Save partnership page"}</button></div>
  </section>;
}
