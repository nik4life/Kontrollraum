"use client";

import { useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Building2,
  ChevronRight,
  CircleCheckBig,
  Clock3,
  CreditCard,
  FileText,
  Home,
  Menu,
  Package,
  ReceiptText,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  Wrench,
  X,
} from "lucide-react";

type Role = "Chef" | "Monteur" | "Buchhaltung";
type View = "dashboard" | "orders" | "invoice" | "customers";

const roleCopy: Record<Role, string> = {
  Chef: "Guten Morgen, Niklas",
  Monteur: "Guten Morgen, Marco",
  Buchhaltung: "Guten Morgen, Anna",
};

const tasks = {
  Chef: [
    { title: "Rechnung freigeben", subtitle: "Müller GmbH · Auftrag #A-1047", amount: "4.782,00 €", icon: ReceiptText, tone: "accent" },
    { title: "Angebot wartet", subtitle: "Schneider Immobilien · seit 2 Tagen", amount: "8.940,00 €", icon: FileText, tone: "default" },
    { title: "2 Zahlungen überfällig", subtitle: "Gesamt offen seit > 14 Tagen", amount: "3.214,50 €", icon: CreditCard, tone: "warning" },
  ],
  Monteur: [
    { title: "Müller GmbH", subtitle: "Elektroinstallation · Industriestraße 14", amount: "Heute · 07:30", icon: Wrench, tone: "accent" },
    { title: "Zeit noch nicht abgeschlossen", subtitle: "Baustelle Müller GmbH", amount: "5:42 h", icon: Clock3, tone: "warning" },
  ],
  Buchhaltung: [
    { title: "3 Rechnungen versandbereit", subtitle: "Vom Chef freigegeben", amount: "9.826,40 €", icon: ReceiptText, tone: "accent" },
    { title: "5 Zahlungen zuordnen", subtitle: "Bankabgleich · heute", amount: "7.410,22 €", icon: CreditCard, tone: "default" },
    { title: "2 fehlende Belege", subtitle: "August 2026", amount: "prüfen", icon: FileText, tone: "warning" },
  ],
};

const navByRole: Record<Role, { id: View; label: string; icon: typeof Home }[]> = {
  Chef: [
    { id: "dashboard", label: "Heute", icon: Home },
    { id: "orders", label: "Aufträge", icon: BriefcaseBusiness },
    { id: "customers", label: "Kunden", icon: UsersRound },
    { id: "invoice", label: "Finanzen", icon: ReceiptText },
  ],
  Monteur: [
    { id: "dashboard", label: "Heute", icon: Home },
    { id: "orders", label: "Aufträge", icon: BriefcaseBusiness },
    { id: "customers", label: "Kontakte", icon: UsersRound },
  ],
  Buchhaltung: [
    { id: "dashboard", label: "Heute", icon: Home },
    { id: "invoice", label: "Rechnungen", icon: ReceiptText },
    { id: "customers", label: "Kunden", icon: UsersRound },
  ],
};

function Logo() {
  return (
    <div className="brand">
      <div className="brand-mark"><span /><span /><span /></div>
      <div><strong>Kontrollraum</strong><small>Elektro Kern GmbH</small></div>
    </div>
  );
}

export default function Page() {
  const [role, setRole] = useState<Role>("Chef");
  const [view, setView] = useState<View>("dashboard");
  const [drawer, setDrawer] = useState(false);
  const [invoiceApproved, setInvoiceApproved] = useState(false);
  const nav = useMemo(() => navByRole[role], [role]);

  const switchRole = (next: Role) => {
    setRole(next);
    setView("dashboard");
    setDrawer(false);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Logo />
        <nav className="side-nav">
          {nav.map((item) => <NavButton key={item.id} item={item} active={view === item.id} onClick={() => setView(item.id)} />)}
        </nav>
        <div className="side-bottom">
          <div className="local-badge"><ShieldCheck size={16} /><span><b>Local-First</b><small>System verfügbar</small></span></div>
          <RoleSwitcher role={role} onChange={switchRole} compact />
        </div>
      </aside>

      <main className="main">
        <header className="mobile-header">
          <Logo />
          <button className="icon-btn" onClick={() => setDrawer(true)} aria-label="Menü"><Menu size={22} /></button>
        </header>

        {view === "dashboard" && <Dashboard role={role} onOpenInvoice={() => setView("invoice")} onOpenOrders={() => setView("orders")} />}
        {view === "orders" && <Orders role={role} onOpenInvoice={() => setView("invoice")} />}
        {view === "invoice" && <Invoice role={role} approved={invoiceApproved} onApprove={() => setInvoiceApproved(true)} />}
        {view === "customers" && <Customers />}
      </main>

      <nav className="bottom-nav">
        {nav.slice(0, 4).map((item) => {
          const Icon = item.icon;
          return <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}><Icon size={20} /><span>{item.label}</span></button>;
        })}
      </nav>

      {drawer && <div className="drawer-backdrop" onClick={() => setDrawer(false)}><div className="drawer" onClick={(e) => e.stopPropagation()}><div className="drawer-head"><b>Demo-Rolle wechseln</b><button className="icon-btn" onClick={() => setDrawer(false)}><X size={20} /></button></div><RoleSwitcher role={role} onChange={switchRole} /></div></div>}
    </div>
  );
}

function NavButton({ item, active, onClick }: { item: { id: View; label: string; icon: typeof Home }; active: boolean; onClick: () => void }) {
  const Icon = item.icon;
  return <button className={active ? "nav-item active" : "nav-item"} onClick={onClick}><Icon size={19} /><span>{item.label}</span></button>;
}

function RoleSwitcher({ role, onChange, compact = false }: { role: Role; onChange: (r: Role) => void; compact?: boolean }) {
  if (compact) return <div className="profile-card"><div className="avatar">{role === "Chef" ? "NK" : role === "Monteur" ? "MS" : "AB"}</div><div><b>{role}</b><small>Demo-Ansicht</small></div><select value={role} onChange={(e) => onChange(e.target.value as Role)} aria-label="Rolle"><option>Chef</option><option>Monteur</option><option>Buchhaltung</option></select></div>;
  return <div className="role-grid">{(["Chef", "Monteur", "Buchhaltung"] as Role[]).map((r) => <button key={r} onClick={() => onChange(r)} className={role === r ? "selected" : ""}><div className="avatar">{r === "Chef" ? "NK" : r === "Monteur" ? "MS" : "AB"}</div><span>{r}</span>{role === r && <CircleCheckBig size={18} />}</button>)}</div>;
}

function Dashboard({ role, onOpenInvoice, onOpenOrders }: { role: Role; onOpenInvoice: () => void; onOpenOrders: () => void }) {
  return <div className="page-wrap">
    <div className="page-head"><div><p className="eyebrow">Mittwoch, 19. August</p><h1>{roleCopy[role]}</h1><p>Das ist heute wichtig.</p></div><button className="search-btn"><Search size={18} /><span>Suchen</span></button></div>

    <section className="priority-card">
      <div className="priority-icon"><Sparkles size={22} /></div>
      <div className="priority-copy"><span>Nächster sinnvoller Schritt</span><h2>{role === "Chef" ? "Rechnung Müller GmbH freigeben" : role === "Monteur" ? "Auftrag Müller GmbH dokumentieren" : "Freigegebene Rechnungen versenden"}</h2><p>{role === "Chef" ? "Die Arbeiten sind abgeschlossen. Zwei Nachträge erklären die Abweichung zum Angebot." : role === "Monteur" ? "Arbeitszeit läuft seit 07:30 Uhr. Material und zwei Zusatzleistungen wurden bereits erfasst." : "Drei Rechnungen wurden kaufmännisch geprüft und können jetzt erzeugt werden."}</p></div>
      <button className="primary-btn" onClick={role === "Monteur" ? onOpenOrders : onOpenInvoice}>Öffnen <ChevronRight size={18} /></button>
    </section>

    <div className="section-title"><div><h2>Deine Aufgaben</h2><p>{tasks[role].length} Punkte brauchen Aufmerksamkeit</p></div></div>
    <div className="task-grid">{tasks[role].map((task, i) => { const Icon = task.icon; return <button key={task.title} className={`task-card ${task.tone}`} onClick={i === 0 ? (role === "Monteur" ? onOpenOrders : onOpenInvoice) : undefined}><div className="task-icon"><Icon size={20} /></div><div className="task-content"><b>{task.title}</b><span>{task.subtitle}</span></div><strong>{task.amount}</strong><ChevronRight className="chev" size={18} /></button>; })}</div>

    {role === "Chef" && <><div className="section-title spaced"><div><h2>Betrieb heute</h2><p>Nur die Zahlen, die gerade helfen</p></div></div><div className="metric-grid"><Metric label="Offene Aufträge" value="12" detail="4 heute aktiv" /><Metric label="Unberechnet" value="11.840 €" detail="3 Aufträge erledigt" highlight /><Metric label="Offene Forderungen" value="18.220 €" detail="2 überfällig" /><Metric label="Heute erfasst" value="31,5 h" detail="6 Mitarbeiter" /></div></>}
  </div>;
}

function Metric({ label, value, detail, highlight = false }: { label: string; value: string; detail: string; highlight?: boolean }) {
  return <div className={highlight ? "metric-card highlight" : "metric-card"}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function Orders({ role, onOpenInvoice }: { role: Role; onOpenInvoice: () => void }) {
  return <div className="page-wrap"><div className="page-head"><div><p className="eyebrow">Aufträge</p><h1>{role === "Monteur" ? "Meine Arbeit" : "Aufträge im Betrieb"}</h1><p>Vom Auftrag bis zur fertigen Leistung.</p></div></div>
    <div className="order-card featured"><div className="order-top"><span className="status-pill green">In Arbeit</span><span>#A-1047</span></div><h2>Müller GmbH</h2><p>Elektroinstallation Lagererweiterung</p><div className="address"><Building2 size={17} /><span>Industriestraße 14, 77815 Bühl</span></div><div className="order-progress"><div><span>Angebot</span><b>4.520,00 €</b></div><div><span>Erfasste Leistung</span><b>4.782,00 €</b></div></div><div className="progress-track"><span style={{ width: "92%" }} /></div><div className="chip-row"><span><Clock3 size={15} /> 17,5 h</span><span><Package size={15} /> 14 Positionen</span><span><FileText size={15} /> 2 Nachträge</span></div><button className="primary-btn full" onClick={onOpenInvoice}>{role === "Monteur" ? "Auftrag dokumentieren" : "Rechnungsvorschlag ansehen"}<ChevronRight size={18} /></button></div>
    <div className="list-card"><OrderRow status="Geplant" id="#A-1048" customer="Schneider Immobilien" job="Unterverteilung erneuern" date="Morgen" /><OrderRow status="Wartet" id="#A-1049" customer="Mayer & Sohn" job="Wallbox Installation" date="Fr, 21.08." /></div>
  </div>;
}

function OrderRow({ status, id, customer, job, date }: { status: string; id: string; customer: string; job: string; date: string }) {
  return <div className="order-row"><div><span className="status-pill">{status}</span><small>{id}</small></div><div><b>{customer}</b><span>{job}</span></div><strong>{date}</strong><ChevronRight size={18} /></div>;
}

function Invoice({ role, approved, onApprove }: { role: Role; approved: boolean; onApprove: () => void }) {
  if (role === "Monteur") return <WorkDocumentation />;
  return <div className="page-wrap narrow"><div className="page-head"><div><p className="eyebrow">Rechnungsvorschlag · #A-1047</p><h1>Müller GmbH</h1><p>Das System hat Angebot und tatsächlich erfasste Leistung abgeglichen.</p></div></div>
    <section className={approved ? "approval-hero approved" : "approval-hero"}><div><span>{approved ? "Freigegeben" : "Prüfung erforderlich"}</span><h2>{approved ? "Bereit für die Buchhaltung" : "+262,00 € gegenüber Angebot"}</h2><p>{approved ? "Die Rechnung kann jetzt erzeugt und versendet werden." : "Die Differenz ist vollständig durch zwei dokumentierte Nachträge erklärt."}</p></div><CircleCheckBig size={34} /></section>
    <div className="compare-grid"><div><span>Angebot</span><strong>4.520,00 €</strong><small>netto</small></div><div className="arrow">→</div><div><span>Rechnungsvorschlag</span><strong>4.782,00 €</strong><small>netto</small></div></div>
    <section className="panel"><div className="panel-head"><div><h2>Abweichungen</h2><p>Nur das prüfen, was sich geändert hat.</p></div><span className="count-badge">2</span></div><DiffRow title="Zusätzliche Steckdose Lager" meta="Nachtrag · Marco bestätigt" value="+148,00 €" /><DiffRow title="Kabelweg geändert" meta="Nachtrag · Foto dokumentiert" value="+114,00 €" /></section>
    <section className="panel"><div className="panel-head"><div><h2>Dokumentation</h2><p>Aus dem Auftrag übernommen.</p></div></div><div className="fact-grid"><div><span>Arbeitszeit</span><b>17,5 h</b></div><div><span>Material</span><b>14 Pos.</b></div><div><span>Fotos</span><b>8</b></div><div><span>Abschluss</span><b>18.08.2026</b></div></div></section>
    {!approved && <div className="sticky-action"><div><span>Voraussichtlicher Rechnungsbetrag</span><strong>5.690,58 € <small>brutto</small></strong></div><button className="primary-btn" onClick={onApprove}>Kaufmännisch freigeben <CircleCheckBig size={18} /></button></div>}
  </div>;
}

function DiffRow({ title, meta, value }: { title: string; meta: string; value: string }) { return <div className="diff-row"><div><b>{title}</b><span>{meta}</span></div><strong>{value}</strong><CircleCheckBig size={18} /></div>; }

function WorkDocumentation() {
  return <div className="page-wrap narrow"><div className="page-head"><div><p className="eyebrow">Auftrag #A-1047</p><h1>Müller GmbH</h1><p>Dokumentiere nur, was du heute wirklich gemacht hast.</p></div></div><div className="timer-card"><div><Clock3 size={24} /><div><span>Arbeitszeit läuft</span><strong>05:42:18</strong><small>Start 07:30 Uhr</small></div></div><button className="secondary-btn">Beenden</button></div><div className="action-grid"><ActionCard icon={Package} title="Material" value="14 Positionen" /><ActionCard icon={Clock3} title="Zeit" value="17,5 h gesamt" /><ActionCard icon={FileText} title="Nachtrag" value="2 erfasst" /><ActionCard icon={Wrench} title="Leistung" value="Bearbeiten" /></div><section className="panel"><div className="panel-head"><div><h2>Heute dokumentiert</h2><p>Alles landet automatisch im Auftrag.</p></div></div><DiffRow title="NYM-J 3x1,5 · 42 m" meta="Material · 09:18 Uhr" value="erfasst" /><DiffRow title="Zusätzliche Steckdose Lager" meta="Nachtrag · 10:42 Uhr" value="+148 €" /></section><button className="primary-btn full">Arbeiten abschließen <CircleCheckBig size={18} /></button></div>;
}

function ActionCard({ icon: Icon, title, value }: { icon: typeof Package; title: string; value: string }) { return <button className="action-card"><div><Icon size={20} /></div><b>{title}</b><span>{value}</span><ChevronRight size={17} /></button>; }

function Customers() {
  return <div className="page-wrap"><div className="page-head"><div><p className="eyebrow">Kontakte</p><h1>Kunden</h1><p>Einmal erfasst, überall verfügbar.</p></div><button className="primary-btn">+ Kunde</button></div><div className="search-field"><Search size={18} /><input placeholder="Kunde, Ort oder Ansprechpartner suchen" /></div><div className="list-card"><Customer name="Müller GmbH" city="Bühl" open="1 Auftrag · 4.782 €" initials="MG" /><Customer name="Schneider Immobilien" city="Baden-Baden" open="1 Angebot · 8.940 €" initials="SI" /><Customer name="Mayer & Sohn" city="Rastatt" open="1 Auftrag" initials="MS" /><Customer name="Privatkunde Weber" city="Lichtenau" open="Keine offenen Vorgänge" initials="PW" /></div></div>;
}

function Customer({ name, city, open, initials }: { name: string; city: string; open: string; initials: string }) { return <button className="customer-row"><div className="customer-avatar">{initials}</div><div><b>{name}</b><span>{city}</span></div><small>{open}</small><ChevronRight size={18} /></button>; }
