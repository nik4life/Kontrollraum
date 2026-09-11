"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, FileDown, FileText, Plus, Save, Search, Trash2, X } from "lucide-react";

type Row = Record<string, any>;
type QuotePosition = {
  key: string;
  catalogItemId: string | null;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
};
type QuoteDraft = {
  id?: string;
  number?: string;
  customerId: string;
  priceListId: string;
  title: string;
  description: string;
  validUntil: string;
};
type QuoteTemplate = {
  id: string;
  name: string;
  priceListId: string;
  title: string;
  description: string;
  validDays: number;
  positions: QuotePosition[];
};

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body;
}

const emptyDraft = (): QuoteDraft => ({ customerId: "", priceListId: "", title: "", description: "", validUntil: "" });

export default function QuoteWorkspace({ setView }: { setView: (view: any) => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [customers, setCustomers] = useState<Row[]>([]);
  const [catalog, setCatalog] = useState<Row[]>([]);
  const [priceLists, setPriceLists] = useState<Row[]>([]);
  const [templates, setTemplates] = useState<QuoteTemplate[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [detail, setDetail] = useState<Row | null>(null);
  const [draft, setDraft] = useState<QuoteDraft>(emptyDraft());
  const [positions, setPositions] = useState<QuotePosition[]>([]);
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState<"idle"|"saving"|"saved"|"dirty">("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<"draft"|"pending"|"accepted"|"archive">("draft");
  const [quoteSearch, setQuoteSearch] = useState("");
  const [quoteSort, setQuoteSort] = useState<"newest"|"oldest"|"customer-az"|"customer-za">("newest");
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load() {
    const [q, c, k, p] = await Promise.all([api("/api/quotes"), api("/api/customers"), api("/api/catalog"), api("/api/price-lists")]);
    setRows(q); setCustomers(c); setCatalog(k); setPriceLists(p);
  }
  useEffect(() => {
    load();
    try { setTemplates(JSON.parse(localStorage.getItem("kontrollraum.quoteTemplates") || "[]")); } catch { setTemplates([]); }
  }, []);

  const selectedCustomer = customers.find(x => x.id === draft.customerId);
  const selectedPriceList = priceLists.find(x => x.id === draft.priceListId);

  function priceFor(item: Row, priceListId = draft.priceListId) {
    if (!priceListId) return Number(item.salesPrice || 0);
    const list = priceLists.find(x => x.id === priceListId);
    const special = list?.prices?.find((x: Row) => x.itemId === item.id);
    return Number(special?.price ?? item.salesPrice ?? 0);
  }

  function newPosition(item?: Row): QuotePosition {
    return {
      key: `${Date.now()}-${Math.random()}`,
      catalogItemId: item?.id || null,
      description: item?.name || "",
      quantity: 1,
      unit: item?.unit || "Stk",
      unitPrice: item ? priceFor(item) : 0,
      taxRate: Number(item?.taxRate || 19),
    };
  }

  function openCreate() {
    setDetail(null); setDraft(emptyDraft()); setPositions([]); setError(""); setSaveState("idle"); setLastSaved(null); setEditorOpen(true);
  }

  async function openDetail(row: Row) {
    setError("");
    const full = await api(`/api/quotes/${row.id}`);
    setDetail(full);
    setDraft({
      id: full.id, number: full.number, customerId: full.customerId, priceListId: "",
      title: full.title || "", description: full.description || "", validUntil: dateInput(full.validUntil),
    });
    setPositions((full.items || []).sort((a: Row,b: Row)=>a.position-b.position).map((x: Row) => ({
      key: x.id || `${Date.now()}-${Math.random()}`,
      catalogItemId: x.catalogItemId || null,
      description: x.description,
      quantity: Number(x.quantity), unit: x.unit,
      unitPrice: Number(x.unitPrice), taxRate: Number(x.taxRate),
    })));
    setSaveState("saved"); setLastSaved(new Date(full.updatedAt || Date.now())); setEditorOpen(true);
  }

  function markDirty(nextDraft?: Partial<QuoteDraft>) {
    if (nextDraft) setDraft(d => ({ ...d, ...nextDraft }));
    setSaveState("dirty");
  }

  function updatePosition(key: string, patch: Partial<QuotePosition>) {
    setPositions(p => p.map(x => x.key === key ? { ...x, ...patch } : x));
    setSaveState("dirty");
  }
  function removePosition(key: string) { setPositions(p => p.filter(x => x.key !== key)); setSaveState("dirty"); }
  function addCatalogPosition(id: string, quantity = 1) {
    const item = catalog.find(x => x.id === id); if (!item) return;
    const position = newPosition(item);
    position.quantity = Math.max(0.001, quantity);
    setPositions(p => [...p, position]); setSaveState("dirty");
  }

  function changePriceList(id: string) {
    setDraft(d => ({ ...d, priceListId: id }));
    setPositions(p => p.map(pos => {
      const item = catalog.find(x => x.id === pos.catalogItemId);
      return item ? { ...pos, unitPrice: priceFor(item, id) } : pos;
    }));
    setSaveState("dirty");
  }

  async function persist(showErrors = true) {
    if (!draft.customerId || !draft.title.trim()) {
      if (showErrors) setError("Kunde und Titel / Projekt sind erforderlich, bevor der Entwurf gespeichert werden kann.");
      return null;
    }
    setError(""); setSaveState("saving");
    try {
      const payload = { customerId: draft.customerId, title: draft.title, description: draft.description, validUntil: draft.validUntil || null, items: positions };
      let saved: Row;
      if (draft.id) saved = await api(`/api/quotes/${draft.id}`, { method: "PATCH", body: JSON.stringify({ action: "update", ...payload }) });
      else saved = await api("/api/quotes", { method: "POST", body: JSON.stringify(payload) });
      setDraft(d => ({ ...d, id: saved.id, number: saved.number })); setDetail(saved); setSaveState("saved"); setLastSaved(new Date()); await load();
      return saved;
    } catch (e: any) { setSaveState("dirty"); if (showErrors) setError(e.message); return null; }
  }

  useEffect(() => {
    if (!editorOpen || !draft.id || saveState !== "dirty") return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => { persist(false); }, 900);
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorOpen, draft, positions, saveState]);

  async function action(name: string, extra: Row = {}) {
    const id = draft.id || detail?.id; if (!id) return;
    try {
      if (saveState === "dirty") await persist();
      await api(`/api/quotes/${id}`, { method: "PATCH", body: JSON.stringify({ action: name, ...extra }) });
      setEditorOpen(false); setDetail(null); await load(); if (name === "convert") setView("orders");
    } catch (e: any) { setError(e.message); }
  }

  async function startRevision() {
    const id = draft.id || detail?.id; if (!id) return;
    try {
      const revised = await api(`/api/quotes/${id}`, { method: "PATCH", body: JSON.stringify({ action: "revise" }) });
      setDetail(revised);
      setDraft(d => ({ ...d, number: revised.number }));
      setSaveState("saved");
      setLastSaved(new Date());
      await load();
    } catch (e: any) { setError(e.message); }
  }

  function storeTemplates(next: QuoteTemplate[]) {
    setTemplates(next); localStorage.setItem("kontrollraum.quoteTemplates", JSON.stringify(next));
  }
  function saveAsTemplate() {
    if (!draft.title.trim() || !positions.length) return setError("Für eine Vorlage werden Titel und mindestens eine Position benötigt.");
    const name = window.prompt("Name der Angebotsvorlage", draft.title); if (!name?.trim()) return;
    const tpl: QuoteTemplate = {
      id: `${Date.now()}`, name: name.trim(), priceListId: draft.priceListId,
      title: draft.title, description: draft.description, validDays: 30,
      positions: positions.map(x => ({ ...x, key: `${Date.now()}-${Math.random()}` })),
    };
    storeTemplates([...templates, tpl]);
  }
  function applyTemplate(id: string) {
    const tpl = templates.find(x => x.id === id); if (!tpl) return;
    setDraft(d => ({ ...d, title: tpl.title, description: tpl.description, priceListId: tpl.priceListId || d.priceListId,
      validUntil: new Date(Date.now() + tpl.validDays*86400000).toISOString().slice(0,10) }));
    setPositions(tpl.positions.map(x => ({ ...x, key: `${Date.now()}-${Math.random()}` })));
    setSaveState("dirty");
  }

  const tabs = [
    { id: "draft" as const, label: "Entwurf", statuses: ["DRAFT"] },
    { id: "pending" as const, label: "Ausstehend", statuses: ["SENT"] },
    { id: "accepted" as const, label: "Angenommen", statuses: ["ACCEPTED"] },
    { id: "archive" as const, label: "Archiv", statuses: ["REJECTED", "ARCHIVED", "CONVERTED"] },
  ];
  const currentTab = tabs.find(x => x.id === activeTab)!;
  const visibleRows = useMemo(() => {
    const query = quoteSearch.trim().toLowerCase();
    const filtered = rows.filter(x => currentTab.statuses.includes(x.status)).filter(x => {
      if (!query) return true;
      return [x.number, x.title, x.customer?.name].some(v => String(v || "").toLowerCase().includes(query));
    });
    return [...filtered].sort((a, b) => {
      if (quoteSort === "customer-az" || quoteSort === "customer-za") {
        const value = String(a.customer?.name || "").localeCompare(String(b.customer?.name || ""), "de", { sensitivity: "base" });
        return quoteSort === "customer-az" ? value : -value;
      }
      const av = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const bv = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return quoteSort === "oldest" ? av - bv : bv - av;
    });
  }, [rows, currentTab, quoteSearch, quoteSort]);
  const canEdit = !detail || !["REJECTED","ARCHIVED","CONVERTED"].includes(detail.status);

  return <div className="page-wrap">
    <div className="page-head"><div><p className="eyebrow">Vertrieb</p><h1>Angebote</h1><p>Entwürfe, versendete und angenommene Angebote getrennt verwalten und abgeschlossene Vorgänge im Archiv behalten.</p></div><button className="primary-btn" onClick={openCreate} disabled={!customers.length}><Plus size={17}/>Angebot</button></div>
    <section className="quote-overview">
      <div className="quote-tabs">{tabs.map(tab => <button type="button" key={tab.id} className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)}><span>{tab.label}</span><b>{rows.filter(x => tab.statuses.includes(x.status)).length}</b></button>)}</div>
      <div className="quote-list-tools">
        <label className="quote-list-search"><Search size={16}/><input value={quoteSearch} onChange={e => setQuoteSearch(e.target.value)} placeholder="Angebot, Projekt oder Auftraggeber suchen …"/>{quoteSearch && <button type="button" onClick={() => setQuoteSearch("")} aria-label="Suche löschen"><X size={15}/></button>}</label>
        <select className="quote-list-sort" value={quoteSort} onChange={e => setQuoteSort(e.target.value as typeof quoteSort)}><option value="newest">Datum: Neueste zuerst</option><option value="oldest">Datum: Älteste zuerst</option><option value="customer-az">Auftraggeber: A–Z</option><option value="customer-za">Auftraggeber: Z–A</option></select>
      </div>
      <div className="quote-stage-list">{visibleRows.length ? visibleRows.map(x => <button className="quote-stage-row" key={x.id} onClick={() => openDetail(x)}><div className="customer-avatar"><FileText size={17}/></div><div className="quote-stage-main"><b>{x.number} · {x.customer?.name}</b><span>{x.title}</span></div><div className="quote-stage-meta"><strong>{money(x.grossTotal)}</strong><small>{quoteListStatus(x.status)} · {shortDate(x.createdAt || x.updatedAt)}</small></div><ChevronRight size={17}/></button>) : <Empty text={quoteSearch ? "Keine passenden Angebote gefunden." : emptyTabText(activeTab, customers.length > 0)}/>}</div>
    </section>

    {editorOpen && <QuoteEditorShell close={() => setEditorOpen(false)} title={draft.number ? `${draft.number} · ${draft.title || "Entwurf"}` : "Neues Angebot"}>
      <div className="quote-v2-toolbar">
        <div><span className="quote-v2-status">{detail ? quoteStatus(detail.status) : "Entwurf"}</span><span className={`quote-save-state ${saveState}`}>{saveState === "saving" ? "Speichert …" : saveState === "dirty" ? "Nicht gespeicherte Änderungen" : saveState === "saved" ? `Gespeichert${lastSaved ? ` ${lastSaved.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})}`:""}` : "Noch nicht gespeichert"}</span></div>
        <div className="button-row">
          {!!templates.length && <label className="quote-template-picker"><span>Vorlage</span><select defaultValue="" onChange={e=>{applyTemplate(e.target.value);e.currentTarget.value=""}}><option value="" disabled>Vorlage laden …</option>{templates.map(t=><option value={t.id} key={t.id}>{t.name}</option>)}</select></label>}
          <button className="secondary-btn" type="button" onClick={saveAsTemplate}>Als Vorlage</button>
          {draft.id && <button className="secondary-btn" type="button" onClick={()=>window.open(`/api/quotes/${draft.id}/print`,`_blank`)}><FileDown size={16}/>PDF / Druck</button>}
          <button className="primary-btn" type="button" onClick={()=>persist()}><Save size={16}/>{draft.id ? "Speichern" : "Entwurf speichern"}</button>
        </div>
      </div>

      <div className="quote-v2-head-grid">
        <SearchSelect label="Kunde" placeholder="Kunde, Nummer oder Ort suchen …" value={draft.customerId} rows={customers} getLabel={x=>`${x.number ? `${x.number} · `:""}${x.name}${x.city ? ` · ${x.city}`:""}`} onChange={id=>markDirty({customerId:id})}/>
        <label className="field"><span>Katalog / Preisliste</span><select value={draft.priceListId} onChange={e=>changePriceList(e.target.value)}><option value="">Standardpreise</option>{priceLists.map(x=><option key={x.id} value={x.id}>{x.code ? `${x.code} · `:""}{x.name}</option>)}</select></label>
        <label className="field quote-v2-project"><span>Titel / Projekt</span><input value={draft.title} onChange={e=>markDirty({title:e.target.value})} placeholder="z. B. Prüfstand Netzwerk"/></label>
        <label className="field"><span>Gültig bis</span><input type="date" value={draft.validUntil} onChange={e=>markDirty({validUntil:e.target.value})}/></label>
        <label className="field quote-v2-description"><span>Beschreibung / Einleitung</span><input value={draft.description} onChange={e=>markDirty({description:e.target.value})} placeholder="Optionaler Einleitungstext"/></label>
      </div>

      <PositionEditor positions={positions} catalog={catalog} selectedPriceList={selectedPriceList} onAdd={addCatalogPosition} onUpdate={updatePosition} onRemove={removePosition}/>
      {error && <div className="form-error quote-v2-error">{error}</div>}

      {draft.id && detail && <div className="quote-v2-workflow">
        <div><b>Weiterer Ablauf</b><span>Das Angebot bleibt bis zum Versenden bearbeitbar. Änderungen an einem angenommenen Angebot erhöhen die Version.</span></div>
        <div className="button-row quote-actions">
          {detail.status === "DRAFT" && <button className="primary-btn" onClick={() => action("send")}>Als versendet markieren</button>}
          {detail.status === "SENT" && <><button className="primary-btn" onClick={() => action("accept")}>Angenommen</button><button className="secondary-btn" onClick={() => action("reject")}>Abgelehnt</button></>}
          {detail.status === "REJECTED" && <><button className="primary-btn" onClick={startRevision}>Neue Version bearbeiten</button><button className="secondary-btn" onClick={() => action("archive")}>Archivieren</button></>}
          {detail.status === "ACCEPTED" && <button className="primary-btn" onClick={() => { const h=window.prompt("Geplanter Zeitansatz in Stunden", "1"); if(h) action("convert",{plannedMinutes:Math.round(num(h)*60)}); }}>In Auftrag umwandeln</button>}
        </div>
      </div>}
      {!canEdit && <div className="quote-v2-locked">Dieses Angebot ist abgeschlossen. Die gespeicherte Fassung bleibt unverändert erhalten.</div>}
    </QuoteEditorShell>}
  </div>;
}

function PositionEditor({positions,catalog,selectedPriceList,onAdd,onUpdate,onRemove}:{positions:QuotePosition[];catalog:Row[];selectedPriceList?:Row;onAdd:(id:string,quantity?:number)=>void;onUpdate:(key:string,patch:Partial<QuotePosition>)=>void;onRemove:(key:string)=>void}) {
  const [search,setSearch]=useState("");
  const [expanded,setExpanded]=useState<string|null>(null);
  const [qty,setQty]=useState(1);
  const filtered=useMemo(()=>{
    const q=search.trim().toLowerCase(); if(!q)return [];
    return catalog.filter(x=>[x.sku,x.name,x.description,x.manufacturer,x.manufacturerSku].some(v=>String(v||"").toLowerCase().includes(q))).slice(0,8);
  },[catalog,search]);
  const totals=useMemo(()=>positions.reduce((a,x)=>{const net=x.quantity*x.unitPrice;return {net:a.net+net,tax:a.tax+net*x.taxRate/100}}, {net:0,tax:0}),[positions]);
  function add(item:Row){onAdd(item.id, Math.max(0.001, qty)); setSearch("");setQty(1)}
  return <section className="quote-v2-builder">
    <div className="quote-v2-addbar">
      <div className="quote-v2-add-copy"><b>Position hinzufügen</b><span>{selectedPriceList ? `Preise aus ${selectedPriceList.name}` : "Standardpreise"}</span></div>
      <div className="quote-v2-article-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Artikelnummer, Leistung oder Begriff suchen …"/>{search && <button type="button" onClick={()=>setSearch("")}><X size={15}/></button>}
        {!!filtered.length && <div className="quote-v2-results">{filtered.map(x=><button type="button" key={x.id} onClick={()=>add(x)}><span><b>{x.sku || "Artikel"}</b>{x.name}</span><strong>{money(x.salesPrice)} / {x.unit}</strong></button>)}</div>}
      </div>
      <label className="quote-v2-qty"><span>Menge</span><input type="number" min="0.001" step="0.001" value={qty} onChange={e=>setQty(Math.max(.001,num(e.target.value)))}/></label>
      <button type="button" className="secondary-btn" disabled={!filtered[0]} onClick={()=>filtered[0]&&add(filtered[0])}><Plus size={16}/>Hinzufügen</button>
    </div>

    <div className="quote-v2-list-head"><span>Pos.</span><span>Artikel / Leistung</span><span>Menge</span><span>EP netto</span><span>GP netto</span><span></span></div>
    <div className="quote-v2-position-list">{positions.map((x,i)=>{
      const open=expanded===x.key;
      return <div className={`quote-v2-position ${open?"open":""}`} key={x.key}>
        <button type="button" className="quote-v2-position-main" onClick={()=>setExpanded(open?null:x.key)}>
          <span className="quote-v2-pos-no">{i+1}</span>
          <span className="quote-v2-pos-name"><b>{x.description || "Ohne Bezeichnung"}</b><small>{x.catalogItemId ? catalog.find(c=>c.id===x.catalogItemId)?.sku || "Katalogartikel" : "Freie Position"}</small></span>
          <span>{formatQty(x.quantity)} {x.unit}</span><span>{money(x.unitPrice)}</span><strong>{money(x.quantity*x.unitPrice)}</strong><ChevronDown size={16}/>
        </button>
        {open && <div className="quote-v2-position-edit">
          <label className="field wide"><span>Bezeichnung</span><input value={x.description} onChange={e=>onUpdate(x.key,{description:e.target.value})}/></label>
          <label className="field"><span>Menge</span><input type="number" step="0.001" value={x.quantity} onChange={e=>onUpdate(x.key,{quantity:num(e.target.value)})}/></label>
          <label className="field"><span>Einheit</span><input value={x.unit} onChange={e=>onUpdate(x.key,{unit:e.target.value})}/></label>
          <label className="field"><span>EP netto</span><input type="number" step="0.01" value={x.unitPrice} onChange={e=>onUpdate(x.key,{unitPrice:num(e.target.value)})}/></label>
          <label className="field"><span>USt. %</span><input type="number" step="0.01" value={x.taxRate} onChange={e=>onUpdate(x.key,{taxRate:num(e.target.value)})}/></label>
          <button type="button" className="quote-v2-delete" onClick={()=>onRemove(x.key)}><Trash2 size={16}/>Position löschen</button>
        </div>}
      </div>})}
      {!positions.length&&<div className="empty-row"><span>Noch keine Positionen. Suche oben nach einem Artikel oder einer Leistung.</span></div>}
    </div>
    <div className="quote-v2-totals"><span>Netto <b>{money(totals.net)}</b></span><span>USt. <b>{money(totals.tax)}</b></span><span>Brutto <strong>{money(totals.net+totals.tax)}</strong></span></div>
  </section>;
}

function SearchSelect({label,placeholder,value,rows,getLabel,onChange}:{label:string;placeholder:string;value:string;rows:Row[];getLabel:(r:Row)=>string;onChange:(id:string)=>void}) {
  const selected=rows.find(x=>x.id===value); const [q,setQ]=useState(""); const [focus,setFocus]=useState(false);
  const shown=rows.filter(x=>getLabel(x).toLowerCase().includes(q.toLowerCase())).slice(0,8);
  return <label className="field quote-search-select"><span>{label}</span><div className="quote-search-input"><Search size={15}/><input value={focus?q:(selected?getLabel(selected):q)} onFocus={()=>{setFocus(true);setQ("")}} onBlur={()=>setTimeout(()=>setFocus(false),120)} onChange={e=>setQ(e.target.value)} placeholder={placeholder}/></div>{focus&&<div className="quote-search-menu">{shown.map(x=><button type="button" key={x.id} onMouseDown={e=>e.preventDefault()} onClick={()=>{onChange(x.id);setFocus(false)}}>{getLabel(x)}</button>)}{!shown.length&&<span>Kein Treffer</span>}</div>}</label>
}

function QuoteEditorShell({title,close,children}:{title:string;close:()=>void;children:any}) {
  return <div className="quote-v2-overlay"><div className="quote-v2-shell"><header className="quote-v2-shell-head"><div><span>Angebot</span><b>{title}</b></div><button type="button" className="icon-btn" onClick={close} aria-label="Schließen"><X size={19}/></button></header><main>{children}</main></div></div>;
}

function Empty({text}:{text:string}){return <div className="empty-row"><span>{text}</span></div>}
function num(v:any){const n=Number(String(v??"").replace(",","."));return Number.isFinite(n)?n:0}
function money(v:any){return new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(Number(v||0))}
function formatQty(v:number){return new Intl.NumberFormat("de-DE",{maximumFractionDigits:3}).format(v)}
function quoteStatus(v:string){return ({DRAFT:"Entwurf",SENT:"Ausstehend",ACCEPTED:"Angenommen",REJECTED:"Abgelehnt",ARCHIVED:"Archiviert",CONVERTED:"Beauftragt"} as Row)[v]||v}
function quoteListStatus(v:string){return ({DRAFT:"Entwurf",SENT:"Versendet",ACCEPTED:"Angenommen",REJECTED:"Abgelehnt",ARCHIVED:"Archiviert",CONVERTED:"Beauftragt"} as Row)[v]||v}
function shortDate(v:any){if(!v)return "–";const d=new Date(v);return Number.isNaN(d.getTime())?"–":new Intl.DateTimeFormat("de-DE").format(d)}
function emptyTabText(tab:string,hasCustomers:boolean){if(!hasCustomers)return "Lege zuerst einen Kunden an.";return ({draft:"Keine offenen Entwürfe.",pending:"Keine versendeten Angebote warten auf Rückmeldung.",accepted:"Keine angenommenen Angebote warten auf Beauftragung.",archive:"Das Archiv ist leer."} as Row)[tab]||"Keine Angebote."}
function dateInput(v:any){if(!v)return "";const d=new Date(v);return Number.isNaN(d.getTime())?"":d.toISOString().slice(0,10)}
