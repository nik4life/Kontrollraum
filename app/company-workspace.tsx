"use client";
import { FormEvent, useEffect, useState } from "react";

const fields = [
  ["name","Firmenname"],["legalName","Rechtlicher Firmenname"],["street","Straße und Hausnummer"],
  ["zip","PLZ"],["city","Ort"],["email","Geschäftliche E-Mail"],["phone","Telefon"],
  ["website","Website"],["taxNumber","Steuernummer"],["vatId","USt-IdNr."],
  ["iban","IBAN"],["bic","BIC"]
] as const;

export default function CompanyWorkspace() {
  const [company,setCompany] = useState<Record<string,string>>({});
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [message,setMessage] = useState("");
  const [error,setError] = useState("");
  useEffect(()=>{fetch("/api/company").then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||"Laden fehlgeschlagen");setCompany(d)}).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[]);
  async function save(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();setSaving(true);setMessage("");setError("");
    try {
      const data=Object.fromEntries(fields.map(([k])=>[k,company[k]||""]));
      const response=await fetch("/api/company",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
      const result=await response.json();if(!response.ok)throw Error(result.error||"Speichern fehlgeschlagen");
      setCompany(result);setMessage("Betriebsdaten gespeichert. Neue Angebotsdruckansichten verwenden diese Angaben.");
    } catch(e:any){setError(e.message)}finally{setSaving(false)}
  }
  return <div className="page-wrap"><div className="page-head"><div><p className="eyebrow">Verwaltung</p><h1>Betriebsdaten</h1><p>Diese Angaben erscheinen in Angeboten und späteren Rechnungen. Zugangsdaten gehören nicht hierher.</p></div></div>
    <section className="panel" style={{padding:24,maxWidth:850}}>
      {loading?<p>Daten werden geladen …</p>:<form onSubmit={save}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:16}}>
          {fields.map(([key,label])=><label className="field" key={key}><span>{label}</span><input value={company[key]||""} onChange={e=>setCompany(c=>({...c,[key]:e.target.value}))} required={key==="name"} autoComplete="off"/></label>)}
        </div>
        {error&&<p role="alert" style={{color:"#b42318"}}>{error}</p>}
        {message&&<p role="status">{message}</p>}
        <button className="primary-btn" type="submit" disabled={saving}>{saving?"Speichere …":"Betriebsdaten speichern"}</button>
      </form>}
    </section>
  </div>;
}
