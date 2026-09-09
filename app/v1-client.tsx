"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Building2, Check, ChevronRight, FileUp, Home, LogOut, Package, Plus, ReceiptText, Settings, ShieldCheck, UsersRound, Wrench } from "lucide-react";

type View = "today" | "customers" | "catalog" | "orders" | "billing" | "admin";
type Row = Record<string, any>;

const modules = [
  ["today", "Heute", Home], ["customers", "Kunden", UsersRound], ["catalog", "Artikel", Package],
  ["orders", "Aufträge", Wrench], ["billing", "Abrechnung", ReceiptText], ["admin", "Verwaltung", Settings],
] as const;

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body;
}

export default function V1Client() {
  const [loading, setLoading] = useState(true);
  const [installed, setInstalled] = useState(false);
  const [user, setUser] = useState<Row | null>(null);
  const [view, setView] = useState<View>("today");

  async function boot() {
    setLoading(true);
    try {
      const status = await api("/api/auth/status");
      setInstalled(status.installed);
      setUser(status.user);
    } finally { setLoading(false); }
  }
  useEffect(() => { boot(); }, []);

  if (loading) return <Splash text="Kontrollraum wird vorbereitet …" />;
  if (!installed) return <FirstSetup onDone={boot} />;
  if (!user) return <Login onDone={boot} />;

  async function logout() { await api("/api/auth/logout", { method: "POST" }); setUser(null); }
  return <Shell company={user.company} user={user} view={view} setView={setView} onLogout={logout}>
    {view === "today" && <Today company={user.company} setView={setView} />}
    {view === "customers" && <Customers />}
    {view === "catalog" && <Catalog />}
    {view === "orders" && <Orders />}
    {view === "billing" && <Billing />}
    {view === "admin" && <Admin onCompanyChanged={boot} />}
  </Shell>;
}

function FirstSetup({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [admin, setAdmin] = useState({ fullName: "", email: "", password: "" });
  const [error, setError] = useState("");
  function adminSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    const next = { fullName: String(f.get("fullName")), email: String(f.get("email")), password: String(f.get("password")) };
    if (next.password.length < 8) return setError("Das Passwort muss mindestens 8 Zeichen lang sein.");
    setAdmin(next); setError(""); setStep(2);
  }
  async function companySubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(""); const f = new FormData(e.currentTarget);
    try {
      await api("/api/auth/setup", { method: "POST", body: JSON.stringify({
        ...admin, companyName: f.get("companyName"), street: f.get("street"), zip: f.get("zip"), city: f.get("city"), companyEmail: f.get("companyEmail"), phone: f.get("phone")
      })}); await onDone();
    } catch (e: any) { setError(e.message); }
  }
  if (step === 1) return <main className="install-shell"><form className="install-card" onSubmit={adminSubmit}><Logo/><p className="eyebrow">Erste Installation · 1 von 2</p><h1>Administratorkonto anlegen</h1><p>Das erste Konto erhält Vollzugriff. Weitere Rollen und Benutzer können später angelegt werden.</p><Field name="fullName" label="Dein Name" required/><Field name="email" label="E-Mail-Adresse" type="email" required/><Field name="password" label="Passwort" type="password" required/>{error&&<div className="form-error">{error}</div>}<button className="primary-btn full">Weiter<ChevronRight size={18}/></button></form></main>;
  return <main className="install-shell"><form className="install-card wide" onSubmit={companySubmit}><Logo/><p className="eyebrow">Erste Installation · 2 von 2</p><h1>Unternehmen einrichten</h1><p>Kontrollraum startet danach vollständig leer.</p><div className="form-grid"><Field name="companyName" label="Unternehmensname" required/><Field name="companyEmail" label="Geschäftliche E-Mail" type="email" defaultValue={admin.email}/><Field name="street" label="Straße / Hausnummer"/><Field name="zip" label="PLZ"/><Field name="city" label="Ort"/><Field name="phone" label="Telefon"/></div>{error&&<div className="form-error">{error}</div>}<button className="primary-btn full">Kontrollraum einrichten<Check size={18}/></button><button type="button" className="text-btn" onClick={()=>setStep(1)}>Zurück</button></form></main>;
}

function Login({ onDone }: { onDone: () => void }) {
  const [error,setError]=useState("");
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setError("");const f=new FormData(e.currentTarget);try{await api("/api/auth/login",{method:"POST",body:JSON.stringify({email:f.get("email"),password:f.get("password")})});await onDone()}catch(e:any){setError(e.message)}}
  return <main className="install-shell"><form className="install-card" onSubmit={submit}><Logo/><p className="eyebrow">Anmeldung</p><h1>Willkommen zurück</h1><p>Melde dich an deiner lokalen Kontrollraum-Installation an.</p><Field name="email" label="E-Mail-Adresse" type="email" required/><Field name="password" label="Passwort" type="password" required/>{error&&<div className="form-error">{error}</div>}<button className="primary-btn full">Anmelden<ChevronRight size={18}/></button></form></main>;
}

function Splash({text}:{text:string}) { return <main className="install-shell"><div className="install-card"><Logo/><div className="pulse"/><p>{text}</p></div></main>; }
function Logo({company}:{company?:string}) { return <div className="brand"><div className="brand-mark"><span/><span/><span/></div><div><strong>Kontrollraum</strong><small>{company || "Unternehmenssoftware"}</small></div></div>; }

function Shell({company,user,view,setView,onLogout,children}:{company:Row;user:Row;view:View;setView:(v:View)=>void;onLogout:()=>void;children:any}) {
 return <div className="app-shell"><aside className="sidebar"><Logo company={company?.name}/><nav className="side-nav">{modules.map(([id,label,Icon])=><button key={id} className={`nav-item ${view===id?"active":""}`} onClick={()=>setView(id)}><Icon size={19}/>{label}</button>)}</nav><div className="side-bottom"><div className="local-badge"><ShieldCheck size={16}/><span><b>Local-First</b><small>PostgreSQL lokal</small></span></div><div className="profile-card"><div className="avatar">{initials(user.fullName)}</div><div><b>{user.fullName}</b><small>Administrator</small></div><button className="mini-icon" onClick={onLogout}><LogOut size={15}/></button></div></div></aside><main className="main"><header className="mobile-header"><Logo company={company?.name}/><button className="icon-btn" onClick={onLogout}><LogOut size={19}/></button></header>{children}</main><nav className="bottom-nav">{modules.slice(0,5).map(([id,label,Icon])=><button key={id} className={view===id?"active":""} onClick={()=>setView(id)}><Icon size={20}/><span>{label}</span></button>)}</nav></div>;
}

function Today({company,setView}:{company:Row;setView:(v:View)=>void}) { return <Page title={`Guten Tag${company?.name?", "+company.name:""}`} eyebrow="Heute" subtitle="Kontrollraum zeigt nur, was als Nächstes sinnvoll ist."><section className="empty-hero"><div className="priority-icon"><Plus/></div><div><span>Neue Installation</span><h2>Dein Kontrollraum ist bereit.</h2><p>Lege Kunden und Artikel oder Leistungen an. Danach kannst du einen Auftrag bis zum Rechnungsvorschlag bearbeiten.</p></div><button className="primary-btn" onClick={()=>setView("customers")}>Ersten Kunden anlegen</button></section></Page>; }

function Customers() {
 const [rows,setRows]=useState<Row[]>([]),[open,setOpen]=useState(false),[q,setQ]=useState("");
 async function load(){setRows(await api("/api/customers"))} useEffect(()=>{load()},[]);
 async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);await api("/api/customers",{method:"POST",body:JSON.stringify({number:f.get("number"),name:f.get("name"),contactPerson:f.get("contactPerson"),street:f.get("street"),zip:f.get("zip"),city:f.get("city"),email:f.get("email"),phone:f.get("phone")})});setOpen(false);load()}
 const filtered=rows.filter(x=>x.name.toLowerCase().includes(q.toLowerCase()));
 return <Page title="Kunden" eyebrow="Stammdaten" subtitle="Einmal erfassen, im gesamten Prozess verwenden." action={<button className="primary-btn" onClick={()=>setOpen(true)}><Plus size={17}/>Kunde</button>}><Search value={q} setValue={setQ}/><div className="list-card">{filtered.length?filtered.map(x=><div className="customer-row" key={x.id}><div className="customer-avatar">{initials(x.name)}</div><div><b>{x.name}</b><span>{[x.street,x.zip,x.city].filter(Boolean).join(" · ")||"Keine Anschrift"}</span></div><small>{x.number||"–"}</small><ChevronRight size={17}/></div>):<Empty text="Noch keine Kunden angelegt."/>}</div>{open&&<Modal title="Kunde anlegen" close={()=>setOpen(false)}><form onSubmit={save}><div className="form-grid"><Field name="number" label="Kundennummer"/><Field name="name" label="Name / Firma" required/><Field name="contactPerson" label="Ansprechpartner"/><Field name="street" label="Straße"/><Field name="zip" label="PLZ"/><Field name="city" label="Ort"/><Field name="email" label="E-Mail" type="email"/><Field name="phone" label="Telefon"/></div><button className="primary-btn full">Speichern</button></form></Modal>}</Page>
}

function Catalog() {
 const [rows,setRows]=useState<Row[]>([]),[open,setOpen]=useState(false),[importOpen,setImportOpen]=useState(false);
 async function load(){setRows(await api("/api/catalog"))} useEffect(()=>{load()},[]);
 async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);await api("/api/catalog",{method:"POST",body:JSON.stringify({sku:f.get("sku"),name:f.get("name"),itemType:f.get("itemType"),unit:f.get("unit"),purchasePrice:num(f.get("purchasePrice")),salesPrice:num(f.get("salesPrice")),taxRate:num(f.get("taxRate"))||19})});setOpen(false);load()}
 async function importCsv(file:File){const text=await file.text();const lines=text.split(/\r?\n/).filter(Boolean);if(lines.length<2)return;const h=lines[0].split(";").map(x=>x.trim().toLowerCase());const get=(p:string[],n:string)=>{const i=h.indexOf(n);return i>=0?p[i]:""};const items=lines.slice(1).map(line=>{const p=line.split(";");return{sku:get(p,"sku")||null,name:get(p,"name"),description:get(p,"description"),unit:get(p,"unit")||"Stk",purchasePrice:num(get(p,"purchase_price")),salesPrice:num(get(p,"sales_price")),taxRate:num(get(p,"tax_rate"))||19}}).filter(x=>x.name);await api("/api/catalog/import",{method:"POST",body:JSON.stringify({fileName:file.name,items})});setImportOpen(false);load()}
 return <Page title="Artikel & Leistungen" eyebrow="Katalog" subtitle="Material, Leistungen und eigene Preise." action={<div className="button-row"><button className="secondary-btn" onClick={()=>setImportOpen(true)}><FileUp size={16}/>Import</button><button className="primary-btn" onClick={()=>setOpen(true)}><Plus size={17}/>Position</button></div>}><div className="table-card"><div className="table-head"><span>Artikel</span><span>Typ</span><span>EK</span><span>VK</span></div>{rows.length?rows.map(x=><div className="table-row" key={x.id}><div><b>{x.name}</b><small>{x.sku||"ohne Artikelnummer"}</small></div><span>{x.itemType}</span><span>{money(x.purchasePrice)}</span><strong>{money(x.salesPrice)}</strong></div>):<Empty text="Noch keine Artikel oder Leistungen."/>}</div>{open&&<Modal title="Position anlegen" close={()=>setOpen(false)}><form onSubmit={save}><div className="form-grid"><Field name="sku" label="Artikelnummer"/><Field name="name" label="Bezeichnung" required/><Select name="itemType" label="Typ" options={["MATERIAL","LEISTUNG"]}/><Field name="unit" label="Einheit" defaultValue="Stk"/><Field name="purchasePrice" label="Einkaufspreis" type="number" step="0.01"/><Field name="salesPrice" label="Verkaufspreis" type="number" step="0.01"/><Field name="taxRate" label="USt. %" type="number" defaultValue="19"/></div><button className="primary-btn full">Speichern</button></form></Modal>}{importOpen&&<Modal title="Großhandels-/CSV-Import" close={()=>setImportOpen(false)}><p>Aktuell unterstützt: Semikolon-CSV mit <code>sku;name;description;unit;purchase_price;sales_price;tax_rate</code>. DATANORM/IDS folgen als eigene Adapter.</p><input type="file" accept=".csv,text/csv" onChange={e=>e.target.files?.[0]&&importCsv(e.target.files[0])}/></Modal>}</Page>
}

function Orders() {
 const [rows,setRows]=useState<Row[]>([]),[customers,setCustomers]=useState<Row[]>([]),[catalog,setCatalog]=useState<Row[]>([]),[open,setOpen]=useState(false),[detail,setDetail]=useState<Row|null>(null);
 async function load(){const [o,c,k]=await Promise.all([api("/api/orders"),api("/api/customers"),api("/api/catalog")]);setRows(o);setCustomers(c);setCatalog(k)} useEffect(()=>{load()},[]);
 async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const itemId=String(f.get("catalogItemId")||"");const item=catalog.find(x=>x.id===itemId);await api("/api/orders",{method:"POST",body:JSON.stringify({customerId:f.get("customerId"),title:f.get("title"),description:f.get("description"),items:item?[{catalogItemId:item.id,description:item.name,quantity:num(f.get("quantity"))||1,unit:item.unit,unitPrice:Number(item.salesPrice),taxRate:Number(item.taxRate)}]:[]})});setOpen(false);load()}
 async function addDoc(action:string,e:FormEvent<HTMLFormElement>){e.preventDefault();if(!detail)return;const f=new FormData(e.currentTarget);const body:any={action};for(const [k,v] of f.entries())body[k]=["quantity","unitPrice","amount","minutes","hourlyRate"].includes(k)?num(v):v;await api(`/api/orders/${detail.id}`,{method:"PATCH",body:JSON.stringify(body)});setDetail(await api(`/api/orders/${detail.id}`));load()}
 return <Page title="Aufträge" eyebrow="Arbeit" subtitle="Von der Planung bis zum Rechnungsvorschlag." action={<button className="primary-btn" onClick={()=>setOpen(true)} disabled={!customers.length}><Plus size={17}/>Auftrag</button>}><div className="list-card">{rows.length?rows.map(x=><button className="customer-row" key={x.id} onClick={async()=>setDetail(await api(`/api/orders/${x.id}`))}><div className="customer-avatar"><Wrench size={17}/></div><div><b>{x.number} · {x.customer?.name}</b><span>{x.title}</span></div><small>{x.status}</small><ChevronRight size={17}/></button>):<Empty text={customers.length?"Noch keine Aufträge.":"Lege zuerst einen Kunden an."}/>}</div>{open&&<Modal title="Auftrag anlegen" close={()=>setOpen(false)}><form onSubmit={save}><Select name="customerId" label="Kunde" options={customers.map(x=>({value:x.id,label:x.name}))}/><Field name="title" label="Auftrag / Projekt" required/><Field name="description" label="Beschreibung"/><Select name="catalogItemId" label="Erste Position (optional)" options={[{value:"",label:"Keine"},...catalog.map(x=>({value:x.id,label:x.name}))]}/><Field name="quantity" label="Menge" type="number" step="0.001" defaultValue="1"/><button className="primary-btn full">Auftrag anlegen</button></form></Modal>}{detail&&<Modal title={`${detail.number} · ${detail.title}`} close={()=>setDetail(null)}><p><b>{detail.customer?.name}</b> · Status: {detail.status}</p><div className="fact-grid"><div><span>Soll-Positionen</span><b>{detail.items?.length||0}</b></div><div><span>Material Ist</span><b>{detail.materials?.length||0}</b></div><div><span>Nachträge</span><b>{detail.extras?.length||0}</b></div><div><span>Zeiten</span><b>{detail.timeEntries?.length||0}</b></div></div><h3>Material erfassen</h3><form onSubmit={e=>addDoc("material",e)}><div className="form-grid"><Field name="description" label="Material" required/><Field name="quantity" label="Menge" type="number" step="0.001" defaultValue="1"/><Field name="unit" label="Einheit" defaultValue="Stk"/><Field name="unitPrice" label="Abrechnungspreis" type="number" step="0.01"/></div><button className="secondary-btn">Material hinzufügen</button></form><h3>Nachtrag</h3><form onSubmit={e=>addDoc("extra",e)}><div className="form-grid"><Field name="description" label="Zusatzleistung" required/><Field name="amount" label="Netto" type="number" step="0.01"/></div><button className="secondary-btn">Nachtrag hinzufügen</button></form><button className="primary-btn full" onClick={async()=>{await api(`/api/orders/${detail.id}`,{method:"PATCH",body:JSON.stringify({status:"READY_FOR_REVIEW"})});setDetail(null);load()}}>Leistung sachlich abschließen</button></Modal>}</Page>
}

function Billing() {
 const [invoices,setInvoices]=useState<Row[]>([]),[orders,setOrders]=useState<Row[]>([]);
 async function load(){const [i,o]=await Promise.all([api("/api/billing"),api("/api/orders")]);setInvoices(i);setOrders(o)} useEffect(()=>{load()},[]);
 const billable=orders.filter(x=>["READY_FOR_REVIEW","COMPLETED"].includes(x.status));
 async function create(orderId:string){await api("/api/billing",{method:"POST",body:JSON.stringify({orderId})});load()}
 return <Page title="Abrechnung" eyebrow="Rechnungen" subtitle="Erbrachte Leistung wird zum prüfbaren Rechnungsvorschlag."><h2>Bereit zur Abrechnung</h2><div className="list-card">{billable.length?billable.map(x=><div className="customer-row" key={x.id}><div className="customer-avatar"><ReceiptText size={17}/></div><div><b>{x.customer?.name}</b><span>{x.number} · {x.title}</span></div><button className="secondary-btn" onClick={()=>create(x.id)}>Vorschlag erzeugen</button></div>):<Empty text="Keine abgeschlossenen Aufträge warten auf Abrechnung."/>}</div><h2 className="spaced">Rechnungsvorschläge</h2><div className="list-card">{invoices.length?invoices.map(x=><div className="customer-row" key={x.id}><div className="customer-avatar"><ReceiptText size={17}/></div><div><b>{x.number} · {x.customer?.name}</b><span>{x.order?.title||"Rechnung"} · {x.status}</span></div><strong>{money(x.grossTotal)}</strong></div>):<Empty text="Noch keine Rechnungsvorschläge."/>}</div></Page>
}

function Admin({onCompanyChanged}:{onCompanyChanged:()=>void}) {
 const [data,setData]=useState<Row|null>(null),[roleOpen,setRoleOpen]=useState(false);
 async function load(){setData(await api("/api/admin"))} useEffect(()=>{load()},[]);
 async function saveCompany(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);await api("/api/admin",{method:"PATCH",body:JSON.stringify(Object.fromEntries(f.entries()))});await load();onCompanyChanged()}
 async function saveRole(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const mods=data.modules.filter((m:Row)=>f.get(`m_${m.code}`)==="on").map((m:Row)=>m.code);await api("/api/admin",{method:"POST",body:JSON.stringify({name:f.get("name"),description:f.get("description"),modules:mods,canCreate:true,canEdit:true})});setRoleOpen(false);load()}
 if(!data)return <Splash text="Verwaltung wird geladen …"/>;
 const c=data.company;
 return <Page title="Verwaltung" eyebrow="Betrieb" subtitle="Unternehmensdaten, Benutzer, Rollen und Module."><section className="panel"><h2>Unternehmensdaten</h2><form onSubmit={saveCompany}><div className="form-grid"><Field name="name" label="Unternehmensname" defaultValue={c.name} required/><Field name="legalName" label="Firmierung" defaultValue={c.legalName||""}/><Field name="street" label="Straße" defaultValue={c.street||""}/><Field name="zip" label="PLZ" defaultValue={c.zip||""}/><Field name="city" label="Ort" defaultValue={c.city||""}/><Field name="email" label="E-Mail" defaultValue={c.email||""}/><Field name="phone" label="Telefon" defaultValue={c.phone||""}/><Field name="taxNumber" label="Steuernummer" defaultValue={c.taxNumber||""}/><Field name="vatId" label="USt-IdNr." defaultValue={c.vatId||""}/><Field name="iban" label="IBAN" defaultValue={c.iban||""}/></div><button className="primary-btn">Speichern</button></form></section><section className="panel"><div className="panel-head"><div><h2>Rollen & Module</h2><p>Jede Rolle sieht nur die zugeordneten Module.</p></div><button className="secondary-btn" onClick={()=>setRoleOpen(true)}><Plus size={16}/>Rolle</button></div>{data.roles.map((r:Row)=><div className="diff-row" key={r.id}><div><b>{r.name}</b><span>{r.roleModules.map((x:Row)=>x.moduleCode).join(" · ")}</span></div><strong>{r.systemRole?"System":"Eigene Rolle"}</strong></div>)}</section>{roleOpen&&<Modal title="Rolle anlegen" close={()=>setRoleOpen(false)}><form onSubmit={saveRole}><Field name="name" label="Rollenname" required/><Field name="description" label="Beschreibung"/><div className="module-checks">{data.modules.map((m:Row)=><label key={m.code}><input type="checkbox" name={`m_${m.code}`}/><span><b>{m.label}</b><small>{m.description}</small></span></label>)}</div><button className="primary-btn full">Rolle speichern</button></form></Modal>}</Page>
}

function Page({title,eyebrow,subtitle,action,children}:{title:string;eyebrow:string;subtitle:string;action?:any;children:any}){return <div className="page-wrap"><div className="page-head"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>{children}</div>}
function Empty({text}:{text:string}){return <div className="empty-row"><span>{text}</span></div>}
function Search({value,setValue}:{value:string;setValue:(v:string)=>void}){return <div className="search-field"><input value={value} onChange={e=>setValue(e.target.value)} placeholder="Suchen …"/></div>}
function Modal({title,close,children}:{title:string;close:()=>void;children:any}){return <div className="drawer-backdrop modal-bg" onMouseDown={close}><div className="drawer modal" onMouseDown={e=>e.stopPropagation()}><div className="drawer-head"><b>{title}</b><button className="icon-btn" onClick={close}>×</button></div>{children}</div></div>}
function Field(p:{name:string;label:string;type?:string;required?:boolean;defaultValue?:string;step?:string}){return <label className="field"><span>{p.label}</span><input {...p}/></label>}
function Select({name,label,options}:{name:string;label:string;options:(string|{value:string;label:string})[]}){return <label className="field"><span>{label}</span><select name={name}>{options.map((o,i)=>typeof o==="string"?<option key={o} value={o}>{o}</option>:<option key={o.value+String(i)} value={o.value}>{o.label}</option>)}</select></label>}
function initials(v:string=""){return v.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"KR"}
function num(v:any){const n=Number(String(v??"").replace(",","."));return Number.isFinite(n)?n:0}
function money(v:any){if(v===null||v===undefined||v==="")return "–";return new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(Number(v))}
