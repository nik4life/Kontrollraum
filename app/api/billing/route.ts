import { db } from "../../../lib/db";
import { nextBusinessNumber } from "../../../lib/business-number";
import { json, requireModule } from "../../../lib/http";

export async function GET() {
  const auth = await requireModule("BILLING", "view"); if (!auth.user) return auth.response!;
  const rows = await db.invoice.findMany({ where: { companyId: auth.user.companyId }, include: { customer: true, order: true, items: true }, orderBy: { createdAt: "desc" } });
  return json(rows);
}

export async function POST(req: Request) {
  const auth = await requireModule("BILLING", "create"); if (!auth.user) return auth.response!;
  const b = await req.json();
  const order = await db.order.findFirst({ where: { id: b.orderId, companyId: auth.user.companyId }, include: { items: true, materials: true, extras: true, timeEntries: true } });
  if (!order) return json({ error: "Auftrag nicht gefunden." }, { status: 404 });

  const positions: { description: string; quantity: number; unit: string; unitPrice: number; taxRate: number }[] = [];
  for (const x of order.items) positions.push({ description: x.description, quantity: Number(x.quantity), unit: x.unit, unitPrice: Number(x.unitPrice), taxRate: Number(x.taxRate) });
  for (const x of order.materials.filter(x => x.billable && x.unitPrice !== null)) positions.push({ description: x.description, quantity: Number(x.quantity), unit: x.unit, unitPrice: Number(x.unitPrice), taxRate: 19 });
  for (const x of order.timeEntries.filter(x => x.billable && x.hourlyRate !== null && x.minutes > 0)) positions.push({ description: x.description || "Arbeitszeit", quantity: x.minutes / 60, unit: "Std", unitPrice: Number(x.hourlyRate), taxRate: 19 });
  for (const x of order.extras.filter(x => x.approved)) positions.push({ description: `Nachtrag: ${x.description}`, quantity: 1, unit: "pauschal", unitPrice: Number(x.amount), taxRate: 19 });

  const net = positions.reduce((s, x) => s + x.quantity * x.unitPrice, 0);
  const tax = positions.reduce((s, x) => s + x.quantity * x.unitPrice * x.taxRate / 100, 0);
  const number = await nextBusinessNumber(auth.user.companyId, "INVOICE");
  const invoice = await db.invoice.create({ data: {
    companyId: auth.user.companyId,
    customerId: order.customerId,
    orderId: order.id,
    number,
    status: "REVIEW",
    netTotal: net,
    taxTotal: tax,
    grossTotal: net + tax,
    items: { create: positions.map((x, i) => ({ companyId: auth.user!.companyId, position: i + 1, description: x.description, quantity: x.quantity, unit: x.unit, unitPrice: x.unitPrice, taxRate: x.taxRate })) },
  }, include: { customer: true, order: true, items: true } });
  return json(invoice, { status: 201 });
}
