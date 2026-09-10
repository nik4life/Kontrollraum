"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ChevronRight, FileText, Plus, Trash2 } from "lucide-react";

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

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body;
}

export default function QuoteWorkspace({ setView }: { setView: (view: any) => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [customers, setCustomers] = useState<Row[]>([]);
  const [catalog, setCatalog] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Row | null>(null);
  const [error, setError] = useState("");
  const [positions, setPositions] = useState<QuotePosition[]>([]);
  const [editPositions, setEditPositions] = useState<QuotePosition[]>([]);

  async function load() {
    const [q, c, k] = await Promise.all([api("/api/quotes"), api("/api/customers"), api("/api/catalog")]);
    setRows(q); setCustomers(c); setCatalog(k);
  }
  useEffect(() => { load(); }, []);

  function newPosition(item?: Row): QuotePosition {
    return {
      key: `${Date.now()}-${Math.random()}`,
      catalogItemId: item?.id || null,
      description: item?.name || "",
      quantity: 1,
      unit: item?.unit || "Stk",
      unitPrice: Number(item?.salesPrice || 0),
      taxRate: Number(item?.taxRate || 19),
    };
  }

  function openCreate() { setError(""); setPositions([]); setOpen(true); }
  function addCatalogPosition(id: string, editing = false) {
    if (!id) return;
    const item = catalog.find(x => x.id === id);
    if (!item) return;
    if (editing) setEditPositions(p => [...p, newPosition(item)]);
    else setPositions(p => [...p, newPosition(item)]);
  }
  function updatePosition(key: string, patch: Partial<QuotePosition>, editing = false) {
    const setter = editing ? setEditPositions : setPositions;
    setter(p => p.map(x => x.key === key ? { ...x, ...patch } : x));
  }
  function removePosition(key: string, editing = false) {
    const setter = editing ? setEditPositions : setPositions;
    setter(p => p.filter(x => x.key !== key));
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(""); const f = new FormData(e.currentTarget);
    if (!positions.length) return setError("Füge mindestens eine Angebotsposition hinzu.");
    try {
      await api("/api/quotes", { method: "POST", body: JSON.stringify({
        customerId: f.get("customerId"), title: f.get("title"), description: f.get("description"), validUntil: f.get("validUntil"), items: positions,
      }) });
      setOpen(false); setPositions([]); await load();
    } catch (e: any) { setError(e.message); }
  }

  async function openDetail(row: Row) {
    setError("");
    const full = await api(`/api/quotes/${row.id}`);
    setDetail(full);
    setEditPositions((full.items || []).map((x: Row) => ({
      key: x.id || `${Date.now()}-${Math.random()}`,
      catalogItemId: x.catalogItemId || null,
      description: x.description,
      quantity: Number(x.quantity),
      unit: x.unit,
      unitPrice: Number(x.unitPrice),
      taxRate: Number(x.taxRate),
    })));
  }

  async function saveExisting(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!detail) return; setError(""); const f = new FormData(e.currentTarget);
    if (!editPositions.length) return setError("Ein Angebot benötigt mindestens eine Position.");
    try {
      const updated = await api(`/api/quotes/${detail.id}`, { method: "PATCH", body: JSON.stringify({
        action: "update",
        title: f.get("title"), description: f.get("description"), validUntil: f.get("validUntil"), items: editPositions,
      }) });
      setDetail(updated); await load();
    } catch (e: any) { setError(e.message); }
  }

  async function action(name: string, extra: Row = {}) {
    if (!detail) return;
    try {
      await api(`/api/quotes/${detail.id}`, { method: "PATCH", body: JSON.stringify({ action: name, ...extra }) });
      setDetail(null); await load(); if (name === "convert") setView("orders");
    } catch (e: any) { setError(e.message); }
  }

  return <div className="page-wrap">
    <div className="page-head"><div><p className="eyebrow">Vertrieb</p><h1>Angebote</h1><p>Erstellen, kalkulieren, versenden und nach Annahme in einen Auftrag überführen.</p></div><button className="primary-btn" onClick={openCreate} disabled={!customers.length}><Plus size={17}/>Angebot</button></div>
    <div className="list-card">{rows.length ? rows.map(x => <button className="customer-row" key={x.id} onClick={() => openDetail(x)}><div className="customer-avatar"><FileText size={17}/></div><div><b>{x.number} · {x.customer?.name}</b><span>{x.title} · {money(x.grossTotal)}</span></div><small>{quoteStatus(x.status)}</small><ChevronRight size={17}/></button>) : <Empty text={customers.length ? "Noch keine Angebote." : "Lege zuerst einen Kunden an."}/>}</div>

    {open && <Modal title="Angebot erstellen" close={() => setOpen(false)} wide>
      <form onSubmit={save}>
        <div className="form-grid"><Select name="customerId" label="Kunde" options={customers.map(x => ({ value: x.id, label: `${x.number || ""} ${x.name}`.trim() }))}/><Field name="title" label="Titel / Projekt" required/><Field name="description" label="Beschreibung"/><Field name="validUntil" label="Gültig bis" type="date"/></div>
        <PositionEditor positions={positions} catalog={catalog} onAdd={id => addCatalogPosition(id)} onUpdate={(k,p) => updatePosition(k,p)} onRemove={k => removePosition(k)}/>
        {error && <div className="form-error">{error}</div>}
        <button className="primary-btn full" disabled={!positions.length}>Angebot mit {positions.length} Position{positions.length===1?"":"en"} anlegen</button>
      </form>
    </Modal>}

    {detail && <Modal title={`${detail.number} · ${detail.title}`} close={() => setDetail(null)} wide>
      <p><b>{detail.customer?.name}</b> · {quoteStatus(detail.status)}</p>
      <div className="fact-grid"><div><span>Netto</span><b>{money(detail.netTotal)}</b></div><div><span>Brutto</span><b>{money(detail.grossTotal)}</b></div><div><span>Version</span><b>{detail.version}</b></div><div><span>Positionen</span><b>{detail.items?.length||0}</b></div></div>
      {! ["REJECTED","ARCHIVED","CONVERTED"].includes(detail.status) && <form onSubmit={saveExisting}>
        <div className="form-grid"><Field name="title" label="Titel / Projekt" defaultValue={detail.title} required/><Field name="description" label="Beschreibung" defaultValue={detail.description || ""}/><Field name="validUntil" label="Gültig bis" type="date" defaultValue={dateInput(detail.validUntil)}/></div>
        <PositionEditor positions={editPositions} catalog={catalog} onAdd={id => addCatalogPosition(id,true)} onUpdate={(k,p) => updatePosition(k,p,true)} onRemove={k => removePosition(k,true)}/>
        <button className="secondary-btn full">Änderungen speichern</button>
      </form>}
      {error && <div className="form-error">{error}</div>}
      <div className="button-row quote-actions">{detail.status === "DRAFT" && <button className="primary-btn" onClick={() => action("send")}>Als versendet markieren</button>}{detail.status === "SENT" && <><button className="primary-btn" onClick={() => action("accept")}>Angenommen</button><button className="secondary-btn" onClick={() => action("reject")}>Abgelehnt</button></>}{detail.status === "REJECTED" && <button className="secondary-btn" onClick={() => action("archive")}>Archivieren</button>}{detail.status === "ACCEPTED" && <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); action("convert", { plannedMinutes: Math.round(num(f.get("plannedHours"))*60) }); }}><Field name="plannedHours" label="Geplanter Zeitansatz (Stunden)" type="number" step="0.25"/><button className="primary-btn full">In Auftrag umwandeln</button></form>}</div>
    </Modal>}
  </div>;
}

function PositionEditor({positions,catalog,onAdd,onUpdate,onRemove}:{positions:QuotePosition[];catalog:Row[];onAdd:(id:string)=>void;onUpdate:(key:string,patch:Partial<QuotePosition>)=>void;onRemove:(key:string)=>void}) {
  const [pick,setPick]=useState("");
  const totals=useMemo(()=>positions.reduce((a,x)=>{const net=x.quantity*x.unitPrice;return {net:a.net+net,tax:a.tax+net*x.taxRate/100}}, {net:0,tax:0}),[positions]);
  return <section className="quote-builder"><div className="quote-builder-head"><div><h3>Positionen</h3><p>Artikel und Leistungen aus dem Katalog übernehmen und für dieses Angebot anpassen.</p></div></div>
    <div className="quote-catalog-add"><label className="field"><span>Artikel / Leistung hinzufügen</span><select value={pick} onChange={e=>setPick(e.target.value)}><option value="">Aus Katalog auswählen …</option>{catalog.map(x=><option key={x.id} value={x.id}>{x.sku ? `${x.sku} · ` : ""}{x.name} · {money(x.salesPrice)}/{x.unit}</option>)}</select></label><button type="button" className="secondary-btn" disabled={!pick} onClick={()=>{onAdd(pick);setPick("")}}><Plus size={16}/>Hinzufügen</button></div>
    <div className="quote-position-list">{positions.map((x,i)=><div className="quote-position" key={x.key}><div className="quote-position-no">{i+1}</div><label className="field quote-desc"><span>Bezeichnung</span><input value={x.description} onChange={e=>onUpdate(x.key,{description:e.target.value})}/></label><label className="field"><span>Menge</span><input type="number" step="0.001" value={x.quantity} onChange={e=>onUpdate(x.key,{quantity:num(e.target.value)})}/></label><label className="field"><span>Einheit</span><input value={x.unit} onChange={e=>onUpdate(x.key,{unit:e.target.value})}/></label><label className="field"><span>Einzelpreis netto</span><input type="number" step="0.01" value={x.unitPrice} onChange={e=>onUpdate(x.key,{unitPrice:num(e.target.value)})}/></label><label className="field"><span>USt. %</span><input type="number" step="0.01" value={x.taxRate} onChange={e=>onUpdate(x.key,{taxRate:num(e.target.value)})}/></label><div className="quote-line-total"><span>Gesamt</span><b>{money(x.quantity*x.unitPrice)}</b></div><button type="button" className="mini-icon quote-remove" onClick={()=>onRemove(x.key)} title="Position entfernen"><Trash2 size={17}/></button></div>)}{!positions.length&&<div className="empty-row"><span>Noch keine Positionen. Wähle oben Artikel oder Leistungen aus dem Katalog.</span></div>}</div>
    <div className="quote-totals"><span>Netto <b>{money(totals.net)}</b></span><span>USt. <b>{money(totals.tax)}</b></span><span>Brutto <strong>{money(totals.net+totals.tax)}</strong></span></div>
  </section>;
}

function Modal({title,close,children,wide=false}:{title:string;close:()=>void;children:any;wide?:boolean}){return <div className="drawer-backdrop modal-bg" onMouseDown={close}><div className={`drawer modal ${wide?"quote-modal":""}`} onMouseDown={e=>e.stopPropagation()}><div className="drawer-head"><b>{title}</b><button className="icon-btn" onClick={close}>×</button></div>{children}</div></div>}
function Field(p:{name:string;label:string;type?:string;required?:boolean;defaultValue?:string;step?:string}){return <label className="field"><span>{p.label}</span><input {...p}/></label>}
function Select({name,label,options}:{name:string;label:string;options:{value:string;label:string}[]}){return <label className="field"><span>{label}</span><select name={name}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>}
function Empty({text}:{text:string}){return <div className="empty-row"><span>{text}</span></div>}
function num(v:any){const n=Number(String(v??"").replace(",","."));return Number.isFinite(n)?n:0}
function money(v:any){return new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(Number(v||0))}
function quoteStatus(v:string){return ({DRAFT:"Entwurf",SENT:"Wartet auf Antwort",ACCEPTED:"Angenommen",REJECTED:"Abgelehnt",ARCHIVED:"Archiv",CONVERTED:"Auftrag erstellt"} as Row)[v]||v}
function dateInput(v:any){if(!v)return "";const d=new Date(v);return Number.isNaN(d.getTime())?"":d.toISOString().slice(0,10)}
