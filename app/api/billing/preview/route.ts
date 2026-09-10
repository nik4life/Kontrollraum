import { db } from "../../../../lib/db";
import { json, requireModule } from "../../../../lib/http";

type Position = { description: string; quantity: number; unit: string; unitPrice: number; taxRate: number; source: string };

export async function POST(req: Request) {
  const auth = await requireModule("BILLING", "view"); if (!auth.user) return auth.response!;
  const b = await req.json();
  const companyId = auth.user.companyId;
  const positions: Position[] = [];
  let source: any = null;

  if (b.orderId) {
    const order = await db.order.findFirst({ where: { id: b.orderId, companyId }, include: { customer: true, items: true, materials: true, extras: true, timeEntries: true } });
    if (!order) return json({ error: "Auftrag nicht gefunden." }, { status: 404 });
    source = { kind: "order", id: order.id, number: order.number, title: order.title, customer: order.customer };
    for (const x of order.items) positions.push({ description: x.description, quantity: Number(x.quantity), unit: x.unit, unitPrice: Number(x.unitPrice), taxRate: Number(x.taxRate), source: "Auftragsposition" });
    for (const x of order.materials.filter(x => x.billable && x.unitPrice !== null)) positions.push({ description: x.description, quantity: Number(x.quantity), unit: x.unit, unitPrice: Number(x.unitPrice), taxRate: 19, source: "Material Ist" });
    for (const x of order.timeEntries.filter(x => x.billable && x.hourlyRate !== null && x.minutes > 0)) positions.push({ description: x.description || "Arbeitszeit", quantity: x.minutes / 60, unit: "Std", unitPrice: Number(x.hourlyRate), taxRate: 19, source: "Arbeitszeit" });
    for (const x of order.extras.filter(x => x.approved)) positions.push({ description: `Nachtrag: ${x.description}`, quantity: 1, unit: "pauschal", unitPrice: Number(x.amount), taxRate: 19, source: "Nachtrag" });
  } else if (b.reportId) {
    const report = await db.report.findFirst({ where: { id: b.reportId, companyId }, include: { customer: true, items: true } });
    if (!report) return json({ error: "Rapport nicht gefunden." }, { status: 404 });
    source = { kind: "report", id: report.id, number: report.number, title: report.title, customer: report.customer };
    for (const x of report.items) positions.push({ description: x.description, quantity: Number(x.quantity), unit: x.unit, unitPrice: Number(x.unitPrice), taxRate: Number(x.taxRate), source: "Rapportposition" });
    if (report.workMinutes > 0 && report.hourlyRate !== null) positions.push({ description: "Arbeitszeit laut Rapport", quantity: report.workMinutes / 60, unit: "Std", unitPrice: Number(report.hourlyRate), taxRate: 19, source: "Arbeitszeit" });
  } else return json({ error: "Auftrag oder Rapport ist erforderlich." }, { status: 400 });

  const netTotal = positions.reduce((s,x)=>s+x.quantity*x.unitPrice,0);
  const taxTotal = positions.reduce((s,x)=>s+x.quantity*x.unitPrice*x.taxRate/100,0);
  return json({ source, positions, netTotal, taxTotal, grossTotal: netTotal + taxTotal });
}
