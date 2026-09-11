import { db } from "../../../../../lib/db";
import { requireModule } from "../../../../../lib/http";

function esc(v: unknown) {
  return String(v ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]!));
}
function money(v: unknown) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(Number(v || 0));
}
function qty(v: unknown) {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 3 }).format(Number(v || 0));
}
function date(v: Date | null | undefined) {
  return v ? new Intl.DateTimeFormat("de-DE").format(v) : "–";
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireModule("QUOTES", "view");
  if (!auth.user) return auth.response!;
  const { id } = await params;
  const quote = await db.quote.findFirst({
    where: { id, companyId: auth.user.companyId },
    include: { customer: true, company: true, items: { orderBy: { position: "asc" } } },
  });
  if (!quote) return new Response("Angebot nicht gefunden.", { status: 404 });

  const rows = quote.items.map(x => `<tr><td>${x.position}</td><td><strong>${esc(x.description)}</strong></td><td class="num">${qty(x.quantity)}</td><td>${esc(x.unit)}</td><td class="num">${money(x.unitPrice)}</td><td class="num"><strong>${money(Number(x.quantity) * Number(x.unitPrice))}</strong></td></tr>`).join("");
  const companyAddress = [quote.company.street, [quote.company.zip, quote.company.city].filter(Boolean).join(" ")].filter(Boolean).map(esc).join(" · ");
  const customerAddress = [quote.customer.street, [quote.customer.zip, quote.customer.city].filter(Boolean).join(" ")].filter(Boolean).map(esc).join("<br>");
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(quote.number)} – ${esc(quote.title)}</title><style>
  @page{size:A4;margin:16mm 15mm 17mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#17202a;margin:0;font-size:10.5pt;line-height:1.42}.toolbar{position:fixed;right:18px;top:18px;display:flex;gap:8px}.toolbar button{border:0;border-radius:8px;padding:9px 14px;font-weight:700;cursor:pointer}.toolbar .print{background:#17202a;color:#fff}.doc{max-width:180mm;margin:0 auto}.head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #17202a;padding-bottom:10mm}.company h1{font-size:19pt;margin:0 0 2mm}.company p{margin:0;color:#66717d;font-size:9pt}.docmeta{text-align:right}.docmeta b{display:block;font-size:18pt}.docmeta span{color:#6f7882;font-size:9pt}.address{margin-top:12mm;display:grid;grid-template-columns:1fr 1fr;gap:12mm}.label{font-size:8pt;text-transform:uppercase;letter-spacing:.08em;color:#8d969f;font-weight:700;margin-bottom:2mm}.address strong{display:block;font-size:11pt;margin-bottom:1mm}.project{margin:10mm 0 7mm}.project h2{font-size:15pt;margin:0 0 2mm}.project p{margin:0;color:#505b66}.meta{display:flex;gap:8mm;margin-top:4mm;color:#68737d;font-size:9pt}.items{width:100%;border-collapse:collapse;margin-top:7mm}.items th{font-size:8pt;text-transform:uppercase;letter-spacing:.04em;color:#7c858f;text-align:left;border-bottom:1px solid #aeb5bc;padding:2.5mm 2mm}.items td{border-bottom:1px solid #e2e5e8;padding:3mm 2mm;vertical-align:top}.items .num{text-align:right;white-space:nowrap}.items th.num{text-align:right}.totals{margin-left:auto;margin-top:6mm;width:72mm}.totals div{display:flex;justify-content:space-between;padding:1.5mm 0}.totals .gross{border-top:1px solid #17202a;margin-top:1.5mm;padding-top:3mm;font-size:13pt}.footer{margin-top:14mm;border-top:1px solid #d9dde1;padding-top:4mm;color:#7b858f;font-size:8.5pt;display:flex;justify-content:space-between;gap:8mm}.note{margin-top:8mm;font-size:9pt;color:#555f69}@media print{.toolbar{display:none}.doc{max-width:none}}
  </style></head><body><div class="toolbar"><button onclick="window.close()">Schließen</button><button class="print" onclick="window.print()">PDF / Drucken</button></div><main class="doc"><section class="head"><div class="company"><h1>${esc(quote.company.name)}</h1><p>${companyAddress}</p><p>${esc(quote.company.email || "")}${quote.company.phone ? ` · ${esc(quote.company.phone)}` : ""}</p></div><div class="docmeta"><span>Angebot</span><b>${esc(quote.number)}</b><span>Version ${quote.version}</span></div></section><section class="address"><div><div class="label">Angebot für</div><strong>${esc(quote.customer.name)}</strong><div>${customerAddress}</div>${quote.customer.contactPerson ? `<div>${esc(quote.customer.contactPerson)}</div>` : ""}</div><div><div class="label">Angebotsdaten</div><div>Datum: ${date(quote.createdAt)}</div><div>Gültig bis: ${date(quote.validUntil)}</div></div></section><section class="project"><div class="label">Projekt</div><h2>${esc(quote.title)}</h2>${quote.description ? `<p>${esc(quote.description)}</p>` : ""}</section><table class="items"><thead><tr><th>Pos.</th><th>Beschreibung</th><th class="num">Menge</th><th>Einheit</th><th class="num">EP netto</th><th class="num">GP netto</th></tr></thead><tbody>${rows}</tbody></table><section class="totals"><div><span>Netto</span><b>${money(quote.netTotal)}</b></div><div><span>USt.</span><b>${money(quote.taxTotal)}</b></div><div class="gross"><span>Brutto</span><strong>${money(quote.grossTotal)}</strong></div></section>${quote.notes ? `<section class="note">${esc(quote.notes)}</section>` : ""}<footer class="footer"><span>${esc(quote.company.name)}${companyAddress ? ` · ${companyAddress}` : ""}</span><span>${quote.company.iban ? `IBAN ${esc(quote.company.iban)}` : ""}${quote.company.vatId ? ` · USt-IdNr. ${esc(quote.company.vatId)}` : ""}</span></footer></main></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" } });
}
