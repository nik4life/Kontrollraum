"use client";

import { useState } from "react";

export default function TestdatenPage() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function createDemoData() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/demo-data", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      if (body.customersCreated || body.itemsCreated) {
        setMessage(`${body.customersCreated} Testkunden und ${body.itemsCreated} Katalogpositionen wurden angelegt.`);
      } else {
        setMessage("Die Testdaten sind bereits vorhanden. Es wurden keine Duplikate erzeugt.");
      }
    } catch (error: any) {
      setMessage(error.message || "Testdaten konnten nicht angelegt werden.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="install-shell">
      <section className="install-card">
        <p className="eyebrow">Entwicklung · Testdaten</p>
        <h1>Kontrollraum befüllen</h1>
        <p>Legt einmalig 6 realistische Testkunden sowie 12 Material- und Leistungspositionen für Funktionstests an. Wiederholtes Ausführen erzeugt keine Duplikate.</p>
        <button className="primary-btn full" onClick={createDemoData} disabled={busy}>
          {busy ? "Testdaten werden angelegt …" : "Testdaten anlegen"}
        </button>
        {message && <div className="form-error" style={{ background: "#f4f6f8", color: "#17202a" }}>{message}</div>}
        <a className="text-btn" href="/">Zurück zu Kontrollraum</a>
      </section>
    </main>
  );
}
