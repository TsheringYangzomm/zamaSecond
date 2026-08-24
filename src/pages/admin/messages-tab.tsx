import { useEffect, useMemo, useState } from "react";
import { deleteContactMessage, listContactMessages, type ContactMessageRow } from "../../admin/admin-api";
import { btnOutlineSm } from "../../components/ui/styles";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { inputClasses, selectClasses } from "./admin-fields";
import { formatDate } from "./commerce-shared";

const topicLabels: Record<string, string> = {
  question: "Question",
  feedback: "Feedback",
  support: "Support",
};

export function MessagesTab() {
  const [messages, setMessages] = useState<ContactMessageRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ContactMessageRow | null>(null);

  const topics = useMemo(() => {
    const set = new Set((messages ?? []).map((m) => m.topic).filter(Boolean));
    return [...set].sort();
  }, [messages]);

  async function load() {
    setMessages(null);
    setError(null);
    try {
      setMessages(await listContactMessages());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load messages.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    if (!messages) return [];
    const q = query.trim().toLowerCase();
    return messages.filter((msg) => {
      if (topicFilter && msg.topic !== topicFilter) return false;
      if (!q) return true;
      return (
        msg.name.toLowerCase().includes(q) ||
        msg.email.toLowerCase().includes(q) ||
        msg.message.toLowerCase().includes(q)
      );
    });
  }, [messages, query, topicFilter]);

  async function handleDelete(msg: ContactMessageRow) {
    setStatus(null);
    try {
      await deleteContactMessage(msg.id);
      setMessages((current) => (current ?? []).filter((m) => m.id !== msg.id));
      setStatus(`Deleted message from ${msg.name}.`);
    } catch (deleteError) {
      setStatus(deleteError instanceof Error ? deleteError.message : "Could not delete the message.");
    } finally {
      setPendingDelete(null);
    }
  }

  function handleToggle(id: string) {
    setExpanded((current) => (current === id ? null : id));
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="font-primary text-[clamp(1.7rem,3.5vw,2.4rem)] font-bold leading-[1.02] text-brand-green-ink">Messages</h1>
          <p className="text-sm text-brand-black/68">
            {messages ? `${messages.length} message${messages.length === 1 ? "" : "s"}` : "Loading messages..."}
          </p>
        </div>
        <button className={btnOutlineSm} type="button" onClick={() => void load()} disabled={!messages}>Refresh</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, or message..."
          aria-label="Search messages"
          className={inputClasses}
        />
        <select className={`${selectClasses} min-w-40`} aria-label="Filter by topic" value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)}>
          <option value="">All topics</option>
          {topics.map((topic) => <option key={topic} value={topic}>{topicLabels[topic] ?? topic}</option>)}
        </select>
      </div>

      {error ? (
        <div className="grid gap-3 rounded-wobbly-card border-3 border-dashed border-brand-orange bg-brand-orange/10 p-5">
          <p className="text-sm font-semibold text-brand-black" role="alert">{error}</p>
          <div><button className={btnOutlineSm} type="button" onClick={() => void load()}>Try again</button></div>
        </div>
      ) : null}

      {status ? <p className="text-sm font-semibold text-brand-green-ink" role="status">{status}</p> : null}

      {messages ? (
        filtered.length === 0 ? (
          <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-white p-6 text-center text-sm font-semibold text-brand-black/64">
            {query || topicFilter ? "No messages match the current search or filters." : "No messages yet."}
          </p>
        ) : (
          <div className="grid gap-2">
            {filtered.map((msg) => (
              <div className="rounded-wobbly-card border-3 border-brand-forest bg-brand-white shadow-brand-soft" key={msg.id}>
                <button
                  className="flex w-full items-center justify-between gap-3 p-4 text-left"
                  type="button"
                  onClick={() => handleToggle(msg.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-brand-black">{msg.name}</span>
                      <span className="text-xs text-brand-black/52">{msg.email}</span>
                      <span className="rounded-full border border-brand-forest/30 bg-brand-warm-white px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-brand-green-ink">
                        {topicLabels[msg.topic] ?? msg.topic}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-brand-black/68">{formatDate(msg.created_at)}</p>
                  </div>
                  <span className="text-xs text-brand-black/46">{expanded === msg.id ? "▲" : "▼"}</span>
                </button>
                {expanded === msg.id ? (
                  <div className="grid gap-3 border-t-2 border-dashed border-brand-forest/20 px-4 pb-4 pt-3">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-black">{msg.message}</p>
                    <div className="flex items-center gap-2">
                      <a className={btnOutlineSm} href={`mailto:${msg.email}`}>Reply</a>
                      <button
                        className="min-h-9 touch-manipulation rounded-full border-2 border-brand-orange-ink bg-brand-white px-3 py-1 text-xs font-bold text-brand-black transition-colors duration-120 ease-in-out hover:bg-brand-orange focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2"
                        type="button"
                        onClick={() => setPendingDelete(msg)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )
      ) : null}
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete message"
        message={pendingDelete ? `Delete message from ${pendingDelete.name} (${pendingDelete.email})?` : ""}
        confirmLabel="Delete"
        onConfirm={() => { if (pendingDelete) void handleDelete(pendingDelete); }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
