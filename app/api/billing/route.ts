import { db } from "../../../lib/db";
import { nextBusinessNumber } from "../../../lib/business-number";
import { totals } from "../../../lib/discounts";
import { json, requireModule } from "../../../lib/http";

type Position = { description: string; quantity: number; unit: string; unitPrice: number; taxRate: number; discountType?:string; discountValue?:number; discountEligible?:boolean };

export async function GET() {
  const auth = await requireModule("BILLING", "view"); if (!auth.user) return auth.response!;
  const rows = await db.invoice.findMany({
    where: { companyId: auth.user.companyId },
    include: { customer: true, order: true, report: true, items: true },
    orderBy: { createdAt: "desc" },
  });
  return json(rows);
}

export async function POST(req: Request) {
  const auth = await requireModule("BILLING", "create"); if (!auth.user) return auth.response!;
  const b = await req.json();
  const companyId = auth.user.companyId;
  const positions: Position[] = [];
  let customerId: string;
  let orderId: string | null = null;
  let reportId: string | null = null;
  let cashDiscountPercent:number|null=null,cashDiscountDays:number|null=null;

  if (b.orderId) {
    const order = await db.order.findFirst({ where: { id: b.orderId, companyId }, include: { items: true, materials: true, extras: true, timeEntries: true, invoices: true } });
    if (!order) return json({ error: "Auftrag nicht gefunden." }, { status: 404 });
    if (order.invoices.some(x => x.status !== "CANCELLED")) return json({ error: "Für diesen Auftrag existiert bereits eine Rechnung." }, { status: 409 });
    customerId = order.customerId;
    cashDiscountPercent=order.cashDiscountPercent===null?null:Number(order.cashDiscountPercent);
    cashDiscountDays=order.cashDiscountDays;
    orderId = order.id;
    for (const x of order.items) positions.push({ description: x.description, quantity: Number(x.quantity), unit: x.unit, unitPrice: Number(x.unitPrice), taxRate: Number(x.taxRate), discountType:x.discountType,discountValue:Number(x.discountValue),discountEligible:x.discountEligible });
    for (const x of order.materials.filter(x => x.billable && x.unitPrice !== null)) positions.push({ description: x.description, quantity: Number(x.quantity), unit: x.unit, unitPrice: Number(x.unitPrice), taxRate: 19 });
    for (const x of order.timeEntries.filter(x => x.billable && x.hourlyRate !== null && x.minutes > 0)) positions.push({ description: x.description || "Arbeitszeit", quantity: x.minutes / 60, unit: "Std", unitPrice: Number(x.hourlyRate), taxRate: 19 });
    for (const x of order.extras.filter(x => x.approved)) positions.push({ description: `Nachtrag: ${x.description}`, quantity: 1, unit: "pauschal", unitPrice: Number(x.amount), taxRate: 19 });
  } else if (b.reportId) {
    const report = await db.report.findFirst({ where: { id: b.reportId, companyId }, include: { items: true, invoices: true } });
    if (!report) return json({ error: "Rapport nicht gefunden." }, { status: 404 });
    if (!["READY_FOR_REVIEW","APPROVED"].includes(report.status)) return json({ error: "Der Rapport ist noch nicht zur Abrechnung freigegeben." }, { status: 409 });
    if (report.invoices.some(x => x.status !== "CANCELLED")) return json({ error: "Für diesen Rapport existiert bereits eine Rechnung." }, { status: 409 });
    customerId = report.customerId;
    reportId = report.id;
    for (const x of report.items) positions.push({ description: x.description, quantity: Number(x.quantity), unit: x.unit, unitPrice: Number(x.unitPrice), taxRate: Number(x.taxRate) });
    if (report.workMinutes > 0 && report.hourlyRate !== null) positions.push({ description: "Arbeitszeit laut Rapport", quantity: report.workMinutes / 60, unit: "Std", unitPrice: Number(report.hourlyRate), taxRate: 19 });
  } else {
    return json({ error: "Auftrag oder Rapport ist erforderlich." }, { status: 400 });
  }

  if (!positions.length) return json({ error: "Es sind keine abrechenbaren Positionen vorhanden." }, { status: 409 });
  const amount=totals(positions);
  const number = await nextBusinessNumber(companyId, "INVOICE");
  const invoice = await db.$transaction(async tx => {
    const created = await tx.invoice.create({ data: {
      companyId, customerId, orderId, reportId, number, status: "REVIEW",
      netTotal: amount.net, taxTotal: amount.tax, grossTotal: amount.gross, cashDiscountPercent,cashDiscountDays,
      items: { create: positions.map((x, i) => ({ companyId, position: i + 1, description: x.description, quantity: x.quantity, unit: x.unit, unitPrice: x.unitPrice, taxRate: x.taxRate,discountType:x.discountType||"PERCENT",discountValue:x.discountValue||0,discountEligible:x.discountEligible!==false })) },
    }, include: { customer: true, order: true, report: true, items: true } });
    if (orderId) await tx.order.update({ where: { id: orderId }, data: { status: "INVOICED" } });
    if (reportId) await tx.report.update({ where: { id: reportId }, data: { status: "INVOICED" } });
    return created;
  });
  return json(invoice, { status: 201 });
}
