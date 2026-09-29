"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Copy,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  History,
  Layers3,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Upload,
  X,
  AlertTriangle,
  Link2,
  Bold,
  Italic,
  List,
  Code2,
  PanelRightClose,
  Menu,
} from "lucide-react";
import type {
  CommentNode,
  ImportResult,
  SectionNode,
  Template,
  TemplateCard,
} from "@/lib/types";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}
const number = (n: number) => n.toLocaleString();
const date = (s: string) =>
  new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const category = (kind: string) =>
  /defect|deficien|recommend/i.test(kind)
    ? "Deficiency"
    : /limit/i.test(kind)
      ? "Limitation"
      : "Information";
const categoryClass = (kind: string) => category(kind).toLowerCase();
type Editing = {
  entity: "template" | "section" | "item" | "comment";
  id: string;
  name: string;
  comment?: CommentNode;
};

export default function Workspace() {
  const [templates, setTemplates] = useState<TemplateCard[]>([]),
    [template, setTemplate] = useState<Template | null>(null);
  const [sectionId, setSectionId] = useState(""),
    [query, setQuery] = useState(""),
    [loading, setLoading] = useState(true);
  const [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [importOpen, setImportOpen] = useState(false);
  const [audit, setAudit] = useState(false),
    [editing, setEditing] = useState<Editing | null>(null),
    [busy, setBusy] = useState(false);
  const [sourceComment, setSourceComment] = useState<CommentNode | null>(null),
    [help, setHelp] = useState(false),
    [mobileMenu, setMobileMenu] = useState(false);
  const activeRequest = useRef(0);
  async function refreshList() {
    const rows = await request<TemplateCard[]>("/api/templates");
    setTemplates(rows);
    return rows;
  }
  async function openTemplate(id: string) {
    const ticket = ++activeRequest.current;
    setLoading(true);
    setError("");
    setQuery("");
    try {
      const result = await request<Template>(`/api/templates/${id}`);
      if (ticket !== activeRequest.current) return;
      setTemplate(result);
      setSectionId(result.sections[0]?.id || "");
      setMobileMenu(false);
    } catch (e) {
      if (ticket === activeRequest.current) setError((e as Error).message);
    } finally {
      if (ticket === activeRequest.current) setLoading(false);
    }
  }
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let rows = await refreshList();
        if (!alive) return;
        if (!rows.length) {
          await request("/api/demo", { method: "POST" });
          rows = await refreshList();
        }
        if (alive && rows.length) await openTemplate(rows[0].id);
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(id);
  }, [toast]);
  async function imported(result: Template) {
    setTemplate(result);
    setSectionId(result.sections[0]?.id || "");
    setQuery("");
    setImportOpen(false);
    setAudit(true);
    await refreshList();
    setToast("Template imported. Your original file is preserved.");
  }
  async function duplicate() {
    if (!template) return;
    setBusy(true);
    setError("");
    try {
      const copy = await request<Template>(
        `/api/templates/${template.id}/copy`,
        { method: "POST" },
      );
      setTemplate(copy);
      setSectionId(copy.sections[0]?.id || "");
      setQuery("");
      await refreshList();
      setToast("Independent copy created. The original is unchanged.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save(name: string, html?: string) {
    if (!template || !editing) return;
    const updated = await request<Template>(`/api/templates/${template.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity: editing.entity,
        entityId: editing.id,
        version: template.version,
        name,
        ...(html !== undefined ? { html } : {}),
      }),
    });
    setTemplate(updated);
    setEditing(null);
    await refreshList();
    setToast("Changes saved to the database.");
  }
  const section =
    template?.sections.find((s) => s.id === sectionId) ?? template?.sections[0];
  const search = query.trim().toLowerCase();
  const sections = search
    ? template?.sections.filter(
        (s) =>
          s.items.some(
            (i) =>
              i.name.toLowerCase().includes(search) ||
              i.comments.some((c) =>
                (c.name + " " + c.html).toLowerCase().includes(search),
              ),
          ) || s.name.toLowerCase().includes(search),
      ) || []
    : section
      ? [section]
      : [];
  const visibleItems = sections
    .flatMap((s) =>
      s.items.map((i) => ({
        ...i,
        section: s,
        comments:
          search &&
          !s.name.toLowerCase().includes(search) &&
          !i.name.toLowerCase().includes(search)
            ? i.comments.filter((c) =>
                (c.name + " " + c.html).toLowerCase().includes(search),
              )
            : i.comments,
      })),
    )
    .filter(
      (i) =>
        !search || i.comments.length || i.name.toLowerCase().includes(search),
    );
  return (
    <div className="app-shell">
      <aside className={`rail ${mobileMenu ? "open" : ""}`}>
        <a className="brand" href="/" aria-label="Fieldnote home">
          <span className="brand-mark">
            <Layers3 size={22} />
          </span>
          fieldnote<span className="brand-period">.</span>
        </a>
        <div className="workspace-label">
          <span className="avatar">G</span>
          <div>
            My workspace<small>Template library</small>
          </div>
          <ChevronDown size={15} />
        </div>
        <div className="rail-section-label">WORKSPACE</div>
        <button
          className="rail-nav selected"
          onClick={() => {
            setHelp(false);
            setMobileMenu(false);
          }}
        >
          <FolderOpen size={18} />
          Templates<span>{templates.length}</span>
        </button>
        <button className="rail-nav" onClick={() => setHelp(true)}>
          <CircleHelp size={18} />
          Import guide
          <ArrowUpRight size={14} />
        </button>
        <div className="rail-section-label library-label">
          YOUR TEMPLATES
          <button
            aria-label="Import another template"
            onClick={() => setImportOpen(true)}
          >
            <Plus size={15} />
          </button>
        </div>
        <div className="template-list">
          {templates.map((t) => (
            <button
              key={t.id}
              className={`template-nav ${template?.id === t.id ? "active" : ""}`}
              onClick={() => openTemplate(t.id)}
            >
              <FileText size={16} />
              <span>
                {t.name}
                <small>
                  {t.stats.comments} comments{t.copiedFrom ? " · Copy" : ""}
                </small>
              </span>
              {template?.id === t.id && <span className="active-dot" />}
            </button>
          ))}
          {!templates.length && (
            <p className="rail-empty">
              Your imported templates will appear here.
            </p>
          )}
        </div>
        <div className="rail-bottom">
          <div className="preservation-icon">
            <ShieldCheck size={23} />
          </div>
          <strong>Your work stays yours.</strong>
          <p>
            Original content preserved.
            <br />
            Every change in your control.
          </p>
          <div className="demo-badge">
            <span />
            Assignment demo
          </div>
        </div>
        <div className="rail-profile">
          <span className="avatar small">G</span>
          <div>
            Guest workspace<small>Saved in this browser’s workspace</small>
          </div>
        </div>
      </aside>
      <main className="main-shell">
        <header className="topbar">
          <button
            className="mobile-toggle icon-button"
            aria-label="Toggle navigation"
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumbs">
            Workspace
            <ChevronRight size={14} />
            <strong>Templates</strong>
          </div>
          <div className="topbar-right">
            <span className="connection">
              <span />
              {loading
                ? "Opening workspace"
                : error
                  ? "Needs attention"
                  : "Backend storage"}
            </span>
            <button
              className="icon-button"
              aria-label="Open import guide"
              onClick={() => setHelp(true)}
            >
              <CircleHelp size={18} />
            </button>
            <span className="avatar small">G</span>
          </div>
        </header>
        {error && (
          <div role="alert" className="error-banner">
            <AlertTriangle size={18} />
            <span>{error}</span>
            <button
              onClick={() =>
                template ? openTemplate(template.id) : location.reload()
              }
            >
              Reload
            </button>
            <button aria-label="Dismiss error" onClick={() => setError("")}>
              <X size={16} />
            </button>
          </div>
        )}
        {loading ? (
          <div className="loading-state">
            <Loader2 className="spin" size={28} />
            <h2>Opening your workspace…</h2>
            <p>Retrieving templates from the database.</p>
          </div>
        ) : !template ? (
          <div className="empty-state">
            <div className="eyebrow">A FRESH START. WITHOUT STARTING OVER.</div>
            <h1>
              Your expertise.
              <br />
              <em>Intact.</em>
            </h1>
            <p>
              Bring years of carefully written inspection comments
              <br />
              with you. Import, review, and make them your own.
            </p>
            <button
              className="button primary large"
              onClick={() => setImportOpen(true)}
            >
              <Upload size={18} />
              Import a Spectora template
              <ArrowRight size={18} />
            </button>
            <div className="empty-points">
              <span>
                <CheckCircle2 size={16} />
                Formatting preserved
              </span>
              <span>
                <CheckCircle2 size={16} />
                Real database storage
              </span>
              <span>
                <CheckCircle2 size={16} />
                Independent copies
              </span>
            </div>
          </div>
        ) : (
          <>
            <section className="page-heading">
              <div>
                <div className="eyebrow">TEMPLATE WORKSPACE</div>
                <div className="title-line">
                  <h1>{template.name}</h1>
                  <button
                    className="icon-button"
                    aria-label="Rename template"
                    onClick={() =>
                      setEditing({
                        entity: "template",
                        id: template.id,
                        name: template.name,
                      })
                    }
                  >
                    <Pencil size={16} />
                  </button>
                </div>
                <p>
                  <span className="source-pill">
                    <FileSpreadsheet size={13} />
                    Spectora import
                  </span>
                  <span className="subtle-dot">·</span>
                  {template.copiedFrom ? "Independent copy" : "Imported"}{" "}
                  {date(template.createdAt)}
                  <span className="subtle-dot">·</span>
                  <span className="saved-label">
                    <Check size={13} />
                    All changes saved
                  </span>
                </p>
              </div>
              <div className="heading-actions">
                <button
                  className="button secondary"
                  onClick={duplicate}
                  disabled={busy}
                >
                  {busy ? (
                    <Loader2 size={16} className="spin" />
                  ) : (
                    <Copy size={16} />
                  )}
                  Duplicate
                </button>
                <button
                  className="button primary"
                  onClick={() => setImportOpen(true)}
                >
                  <Plus size={17} />
                  Import template
                </button>
              </div>
            </section>
            <section className="summary-strip">
              <div className="summary-stat">
                <Layers3 size={19} />
                <strong>{number(template.stats.sections)}</strong>
                <span>sections</span>
              </div>
              <div className="summary-stat">
                <FolderOpen size={19} />
                <strong>{number(template.stats.items)}</strong>
                <span>items</span>
              </div>
              <div className="summary-stat">
                <FileText size={19} />
                <strong>{number(template.stats.comments)}</strong>
                <span>comments</span>
              </div>
              <button
                className="import-health"
                onClick={() => setAudit(!audit)}
              >
                <span className="health-icon">
                  <ShieldCheck size={20} />
                </span>
                <span>
                  <strong>Import accounted for</strong>
                  <small>
                    {template.warnings.length
                      ? `${template.warnings.length} notes to review`
                      : "Source content retained"}
                  </small>
                </span>
                <span className="text-link">
                  View import review
                  <ArrowUpRight size={15} />
                </span>
              </button>
            </section>
            <div className="editor-toolbar">
              <div className="editor-tabs">
                <span className="active-tab">Template editor</span>
                <button
                  className={audit ? "tab-active" : ""}
                  onClick={() => setAudit(!audit)}
                >
                  Import review
                  {template.warnings.length > 0 && (
                    <span className="count-badge">
                      {template.warnings.length}
                    </span>
                  )}
                </button>
              </div>
              <label className="search-box">
                <Search size={16} />
                <input
                  aria-label="Search template"
                  placeholder="Search sections, items, comments…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query ? (
                  <button
                    aria-label="Clear search"
                    onClick={() => setQuery("")}
                  >
                    <X size={14} />
                  </button>
                ) : (
                  <kbd>⌕</kbd>
                )}
              </label>
            </div>
            <div className={`editor-layout ${audit ? "with-audit" : ""}`}>
              <nav className="section-nav" aria-label="Template sections">
                <div className="section-nav-title">
                  SECTIONS<span>{template.sections.length}</span>
                </div>
                {template.sections.map((s, index) => (
                  <button
                    key={s.id}
                    className={s.id === section?.id && !query ? "active" : ""}
                    onClick={() => {
                      setSectionId(s.id);
                      setQuery("");
                    }}
                  >
                    <span className="section-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>
                      {s.name}
                      <small>
                        {s.items.length} items ·{" "}
                        {s.items.reduce((n, i) => n + i.comments.length, 0)}{" "}
                        comments
                      </small>
                    </span>
                    <ChevronRight size={14} />
                  </button>
                ))}
                <div className="section-footer">
                  <ShieldCheck size={14} />
                  Original order preserved
                </div>
              </nav>
              <section className="comment-workspace">
                <div className="section-heading">
                  <div>
                    <div className="eyebrow">
                      {query
                        ? "SEARCH RESULTS"
                        : `SECTION ${String((section?.position ?? 0) + 1).padStart(2, "0")}`}
                    </div>
                    <h2>{query ? `Results for “${query}”` : section?.name}</h2>
                    <p>
                      {visibleItems.length} items <span>·</span>{" "}
                      {visibleItems.reduce((n, i) => n + i.comments.length, 0)}{" "}
                      comments
                    </p>
                  </div>
                  {!query && section && (
                    <button
                      className="button text-button"
                      onClick={() =>
                        setEditing({
                          entity: "section",
                          id: section.id,
                          name: section.name,
                        })
                      }
                    >
                      <Pencil size={14} />
                      Rename section
                    </button>
                  )}
                </div>
                {visibleItems.length === 0 && (
                  <div className="no-results">
                    <Search size={24} />
                    <h3>No matching comments</h3>
                    <p>Try a different name or a phrase from a comment.</p>
                    <button
                      className="button secondary"
                      onClick={() => setQuery("")}
                    >
                      Clear search
                    </button>
                  </div>
                )}
                {visibleItems.map((item) => (
                  <article className="item-group" key={item.id}>
                    <div className="item-heading">
                      <div>
                        <span className="item-index">
                          {item.section.position + 1}.{item.position + 1}
                        </span>
                        <h3>{item.name}</h3>
                        <span className="count-badge">
                          {item.comments.length}
                        </span>
                      </div>
                      <button
                        className="icon-button"
                        aria-label={`Rename item ${item.name}`}
                        onClick={() =>
                          setEditing({
                            entity: "item",
                            id: item.id,
                            name: item.name,
                          })
                        }
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                    {item.comments.length === 0 ? (
                      <p className="empty-item">
                        This item contains no comments in the source file.
                      </p>
                    ) : (
                      item.comments.map((comment) => (
                        <div className="comment-card" key={comment.id}>
                          <div className="comment-card-heading">
                            <span
                              className={`category ${categoryClass(comment.kind)}`}
                            >
                              <span />
                              {category(comment.kind)}
                            </span>
                            <div className="comment-actions">
                              <button
                                title="View original source"
                                aria-label={`View source for ${comment.name}`}
                                onClick={() => setSourceComment(comment)}
                              >
                                <History size={15} />
                              </button>
                              <button
                                className="edit-comment"
                                aria-label={`Edit comment ${comment.name}`}
                                onClick={() =>
                                  setEditing({
                                    entity: "comment",
                                    id: comment.id,
                                    name: comment.name,
                                    comment,
                                  })
                                }
                              >
                                <Pencil size={13} />
                                Edit
                              </button>
                            </div>
                          </div>
                          <h4>{comment.name || "Untitled comment"}</h4>
                          <div
                            className="rich-content"
                            dangerouslySetInnerHTML={{
                              __html: comment.renderedHtml || "",
                            }}
                          />
                          {!comment.html && (
                            <p className="empty-comment">
                              No comment text in the export. Check the source
                              for field options.
                            </p>
                          )}
                          <div className="comment-footer">
                            <span>
                              <FileSpreadsheet size={12} />
                              Source row {comment.source.row}
                            </span>
                            {comment.fieldType && (
                              <span>{comment.fieldType}</span>
                            )}
                            {comment.warnings.length > 0 && (
                              <button onClick={() => setSourceComment(comment)}>
                                <AlertTriangle size={12} />
                                Review content note
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </article>
                ))}
              </section>
              {audit && (
                <aside className="audit-panel">
                  <div className="audit-title">
                    <h3>Import review</h3>
                    <button
                      className="icon-button"
                      aria-label="Close import review"
                      onClick={() => setAudit(false)}
                    >
                      <PanelRightClose size={17} />
                    </button>
                  </div>
                  <div className="audit-success">
                    <ShieldCheck size={24} />
                    <strong>Your source is preserved</strong>
                    <p>
                      Original cells and the uploaded file are retained
                      alongside your editable template.
                    </p>
                  </div>
                  <div className="audit-facts">
                    <div>
                      <span>Source rows</span>
                      <strong>{number(template.stats.rows)}</strong>
                    </div>
                    <div>
                      <span>Comments imported</span>
                      <strong>{number(template.stats.comments)}</strong>
                    </div>
                    <div>
                      <span>Rich-text comments</span>
                      <strong>{number(template.stats.richText)}</strong>
                    </div>
                    <div>
                      <span>Links in source</span>
                      <strong>{number(template.stats.links)}</strong>
                    </div>
                    <div>
                      <span>Images in source</span>
                      <strong>{number(template.stats.images)}</strong>
                    </div>
                  </div>
                  <h4>
                    Review notes <span>{template.warnings.length}</span>
                  </h4>
                  {template.warnings.length ? (
                    template.warnings.map((w, n) => (
                      <div className="audit-warning" key={n}>
                        <AlertTriangle size={14} />
                        <div>
                          <strong>
                            {w.code.replaceAll("_", " ").toLowerCase()}
                          </strong>
                          <p>{w.message}</p>
                          {w.row && (
                            <small>
                              {w.sheet} · Row {w.row}
                            </small>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="audit-empty">
                      <CheckCircle2 size={15} />
                      No unsupported content detected.
                    </p>
                  )}
                  <a
                    className="button secondary full-width"
                    href={`/api/templates/${template.id}/source`}
                  >
                    <ArrowDownToLine size={15} />
                    Download original file
                  </a>
                  <p className="hash-label">
                    SOURCE FINGERPRINT
                    <code>{template.sourceHash.slice(0, 24)}…</code>
                  </p>
                  <p className="audit-footnote">
                    This review describes the import. Later edits do not change
                    the original source.
                  </p>
                </aside>
              )}
            </div>
          </>
        )}
        <footer className="main-footer">
          <span>
            FIELDNOTE <span> / </span> Built for the work you’ve already done.
          </span>
          <button onClick={() => setHelp(true)}>
            About this demo
            <ArrowUpRight size={12} />
          </button>
        </footer>
      </main>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
      {importOpen && (
        <ImportDialog
          onClose={() => setImportOpen(false)}
          onImported={imported}
        />
      )}
      {editing && (
        <EditDialog
          editing={editing}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
      {sourceComment && (
        <Modal
          title="Original source"
          subtitle="An unchanged record of what came from Spectora."
          onClose={() => setSourceComment(null)}
        >
          <div className="source-origin">
            <FileSpreadsheet size={19} />
            <div>
              <strong>{sourceComment.source.sheet}</strong>
              <span>Row {sourceComment.source.row}</span>
            </div>
          </div>
          <div className="source-table">
            {Object.entries(sourceComment.source.cells).map(([key, value]) => (
              <div key={key}>
                <strong>{key}</strong>
                <pre>{value || "—"}</pre>
              </div>
            ))}
          </div>
          {sourceComment.warnings.length > 0 && (
            <div className="callout">
              <AlertTriangle size={17} />
              <p>
                {sourceComment.warnings
                  .map((w) => w.replaceAll("_", " ").toLowerCase())
                  .join("; ")}
                . The original is retained above; the preview renders only
                supported, safe content.
              </p>
            </div>
          )}
        </Modal>
      )}
      {help && (
        <Modal
          title="A new home for your templates"
          subtitle="A few things to know before bringing your work across."
          onClose={() => setHelp(false)}
        >
          <div className="guide-steps">
            <div>
              <span>1</span>
              <section>
                <h3>Export from Spectora</h3>
                <p>
                  In the template editor, open the actions menu → Export to
                  spreadsheet → <strong>Export HTML Text</strong>. Download the
                  generated .xls or .xlsx file.
                </p>
              </section>
            </div>
            <div>
              <span>2</span>
              <section>
                <h3>Review before importing</h3>
                <p>
                  Upload your file and check the section, item, and comment
                  counts. Review any unsupported content. Nothing is saved until
                  you confirm.
                </p>
              </section>
            </div>
            <div>
              <span>3</span>
              <section>
                <h3>Make it your own</h3>
                <p>
                  Edit names and comment text, then save. Duplicate a template
                  to experiment independently. The original file remains
                  available.
                </p>
              </section>
            </div>
          </div>
          <div className="callout neutral">
            <ShieldCheck size={20} />
            <p>
              This is a take-home demo. Templates are stored in a real database
              and separated by a persistent browser cookie. Keep that cookie to
              return to your workspace. Use sample material only; this is not a
              production account system.
            </p>
          </div>
          <p className="guide-limit">
            Basic formatting, tables, and safe links are rendered. Embedded
            scripts, videos, and unsafe markup are not executed. Remote images
            can become unavailable. Original source cells are kept for review.
          </p>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const prior = document.activeElement as HTMLElement | null;
    root.current?.focus();
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const nodes = Array.from(
          root.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]),a[href],input,textarea,[contenteditable="true"],[tabindex="0"]',
          ) || [],
        ).filter((x) => x.offsetParent !== null);
        if (!nodes.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", listener);
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", listener);
      document.body.style.overflow = old;
      prior?.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop">
      <div
        ref={root}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`modal ${wide ? "wide" : ""}`}
      >
        <header>
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={21} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

function ImportDialog({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: (t: Template) => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState<ImportResult | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [drag, setDrag] = useState(false),
    [name, setName] = useState("");
  async function choose(file: File | undefined) {
    if (!file) return;
    setError("");
    setPreview(null);
    setFile(file);
    setBusy(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const data = await request<ImportResult>("/api/import", {
        method: "POST",
        body: form,
      });
      setPreview(data);
      setName(data.name);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function commit() {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("name", name);
      await onImported(
        await request<Template>("/api/import?commit=true", {
          method: "POST",
          body: form,
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={
        preview
          ? "Your template, accounted for."
          : "Bring your template with you."
      }
      subtitle={
        preview
          ? "Review the import before adding it to your workspace."
          : "Upload a Spectora HTML-text spreadsheet. We’ll take care of the structure."
      }
      onClose={() => {
        if (!busy) onClose();
      }}
      wide
    >
      <div className="import-stepper">
        <span className={!preview ? "current" : "complete"}>
          <span>{preview ? <Check size={12} /> : 1}</span>Choose file
        </span>
        <div />
        <span className={preview ? "current" : ""}>
          <span>2</span>Review & import
        </span>
      </div>
      {!preview ? (
        <>
          <label
            className={`dropzone ${drag ? "dragging" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              if (!busy) choose(e.dataTransfer.files[0]);
            }}
          >
            <input
              type="file"
              accept=".xls,.xlsx"
              aria-label="Upload Spectora spreadsheet"
              disabled={busy}
              onChange={(e) => choose(e.target.files?.[0])}
            />
            <span className="upload-icon">
              {busy ? (
                <Loader2 className="spin" size={26} />
              ) : (
                <Upload size={26} />
              )}
            </span>
            <strong>
              {busy ? "Reading your template…" : "Drop your spreadsheet here"}
            </strong>
            <p>
              or <span>browse files</span>
            </p>
            <small>
              Spectora HTML-text export · .xls or .xlsx · up to 4 MB
            </small>
          </label>
          <div className="import-tip">
            <FileSpreadsheet size={19} />
            <p>
              <strong>Use “Export HTML Text” in Spectora.</strong>
              <br />
              This keeps your formatting and links. Plain-text exports cannot
              recover formatting that has already been removed.
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="file-preview">
            <span>
              <FileSpreadsheet size={25} />
            </span>
            <div>
              <strong>{file?.name}</strong>
              <small>
                {((file?.size || 0) / 1024).toFixed(1)} KB · Ready to import
              </small>
            </div>
            <button
              className="text-link"
              disabled={busy}
              onClick={() => {
                setPreview(null);
                setFile(null);
              }}
            >
              Change file
            </button>
          </div>
          <label className="field-label">
            Template name
            <input
              value={name}
              maxLength={500}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <div className="preview-counts">
            <div>
              <strong>{preview.stats.sections}</strong>
              <span>Sections</span>
            </div>
            <div>
              <strong>{preview.stats.items}</strong>
              <span>Items</span>
            </div>
            <div>
              <strong>{preview.stats.comments}</strong>
              <span>Comments</span>
            </div>
            <div>
              <strong>{preview.stats.rows}</strong>
              <span>Source rows</span>
            </div>
          </div>
          <div className="preview-notes">
            <h3>
              <ShieldCheck size={17} />
              Preservation check
            </h3>
            <p>
              <CheckCircle2 size={14} />
              Original cell values and source file retained
            </p>
            <p>
              <CheckCircle2 size={14} />
              Section, item, and comment order preserved
            </p>
            {preview.warnings.map((w, index) => (
              <div key={index} className="preview-warning">
                <AlertTriangle size={15} />
                <span>
                  {w.message}
                  {w.row && (
                    <small>
                      {" "}
                      {w.sheet}, row {w.row}
                    </small>
                  )}
                </span>
              </div>
            ))}
          </div>
          <details className="structure-preview">
            <summary>
              Preview template structure
              <ChevronDown size={15} />
            </summary>
            {preview.sections.map((s) => (
              <div key={s.id}>
                <strong>{s.name}</strong>
                <span>
                  {s.items.length} items ·{" "}
                  {s.items.reduce((n, i) => n + i.comments.length, 0)} comments
                </span>
              </div>
            ))}
          </details>
        </>
      )}
      {error && (
        <div role="alert" className="inline-error">
          <AlertTriangle size={18} />
          <p>{error}</p>
        </div>
      )}
      <footer className="modal-actions">
        <span>
          <ShieldCheck size={14} />
          Nothing is saved until you confirm.
        </span>
        <button className="button secondary" disabled={busy} onClick={onClose}>
          Cancel
        </button>
        {preview && (
          <button
            className="button primary"
            disabled={busy || !name.trim()}
            onClick={commit}
          >
            {busy ? (
              <Loader2 size={15} className="spin" />
            ) : (
              <Check size={16} />
            )}
            Import template
          </button>
        )}
      </footer>
    </Modal>
  );
}

function EditDialog({
  editing,
  onClose,
  onSave,
}: {
  editing: Editing;
  onClose: () => void;
  onSave: (name: string, html?: string) => Promise<void>;
}) {
  const [name, setName] = useState(editing.name),
    [html, setHtml] = useState(editing.comment?.html || ""),
    [mode, setMode] = useState<"visual" | "source">("visual"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const editor = useRef<HTMLDivElement>(null),
    changed = useRef(false);
  useEffect(() => {
    if (editor.current)
      editor.current.innerHTML = editing.comment?.renderedHtml || "";
  }, [editing]);
  function command(cmd: string) {
    editor.current?.focus();
    document.execCommand(cmd);
    changed.current = true;
    if (editor.current) setHtml(editor.current.innerHTML);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave(
        name,
        editing.comment
          ? changed.current
            ? html
            : editing.comment.html
          : undefined,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function changeMode(next: "visual" | "source") {
    if (next === mode) return;
    if (next === "visual" && changed.current) {
      setError(
        "Save your HTML changes before switching back to formatted editing.",
      );
      return;
    }
    setMode(next);
    setError("");
  }
  return (
    <Modal
      title={
        editing.entity === "comment"
          ? "Edit comment"
          : `Rename ${editing.entity}`
      }
      subtitle={
        editing.entity === "comment"
          ? "Refine your words. The original source stays available."
          : "The hierarchy and original source stay preserved."
      }
      onClose={() => {
        if (!busy) onClose();
      }}
      wide={editing.entity === "comment"}
    >
      <form onSubmit={submit}>
        <label className="field-label">
          {editing.entity === "comment" ? "Comment title" : "Name"}
          <input
            required
            maxLength={500}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </label>
        {editing.comment && (
          <>
            <div className="edit-mode">
              <label>Comment text</label>
              <div>
                <button
                  type="button"
                  className={mode === "visual" ? "selected" : ""}
                  onClick={() => changeMode("visual")}
                >
                  Formatted
                </button>
                <button
                  type="button"
                  className={mode === "source" ? "selected" : ""}
                  onClick={() => changeMode("source")}
                >
                  <Code2 size={13} />
                  HTML source
                </button>
              </div>
            </div>
            <div
              style={{ display: mode === "visual" ? "block" : "none" }}
              className="rich-editor"
            >
              <div className="rich-toolbar">
                <button
                  type="button"
                  aria-label="Bold"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => command("bold")}
                >
                  <Bold size={15} />
                </button>
                <button
                  type="button"
                  aria-label="Italic"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => command("italic")}
                >
                  <Italic size={15} />
                </button>
                <button
                  type="button"
                  aria-label="Bullet list"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => command("insertUnorderedList")}
                >
                  <List size={17} />
                </button>
                <span>Basic formatting</span>
              </div>
              <div
                ref={editor}
                role="textbox"
                aria-label="Comment text"
                contentEditable
                suppressContentEditableWarning
                className="rich-content editable"
                onInput={() => {
                  changed.current = true;
                  setHtml(editor.current?.innerHTML || "");
                }}
              />
            </div>
            {mode === "source" && (
              <textarea
                className="html-editor"
                aria-label="Comment HTML source"
                value={html}
                maxLength={100000}
                onChange={(e) => {
                  changed.current = true;
                  setHtml(e.target.value);
                }}
              />
            )}
            {editing.comment.warnings.length > 0 && (
              <div className="callout">
                <AlertTriangle size={17} />
                <p>
                  This comment contains content notes. Editing the formatted
                  preview may replace unsupported markup; use HTML source to
                  retain it exactly.
                </p>
              </div>
            )}
          </>
        )}
        {error && (
          <div role="alert" className="inline-error">
            <AlertTriangle size={17} />
            <p>{error}</p>
          </div>
        )}
        <footer className="modal-actions">
          <span>
            <History size={14} />
            Original source always available
          </span>
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="button primary"
            type="submit"
            disabled={busy || !name.trim()}
          >
            {busy ? (
              <Loader2 size={16} className="spin" />
            ) : (
              <Check size={16} />
            )}
            Save changes
          </button>
        </footer>
      </form>
    </Modal>
  );
}
