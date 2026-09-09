import { db } from "../../../lib/db";
import { json, requireUser } from "../../../lib/http";

export async function GET() {
  const auth = await requireUser(); if (!auth.user) return auth.response!;
  const rows = await db.invoice.findMany({ where: { companyId: auth.user.companyId }, include: { customer: true, order: true, items: true }, orderBy: { createdAt: "desc" } });
  return json(rows);
}

export async function POST(req: Request) {
  const auth = await requireUser(); if (!auth.user) return auth.response!;
  const b = await req.json();
  const order = await db.order.findFirst({ where: { id: b.orderId, companyId: auth.user.companyId }, include: { items: true, materials: true, extras: true } });
  if (!order) return json({ error: "Auftrag nicht gefunden." }, { status: 404 });

  const positions: { description: string; quantity: number; unit: string; unitPrice: number; taxRate: number }[] = [];
  for (const x of order.items) positions.push({ description: x.description, quantity: Number(x.quantity), unit: x.unit, unitPrice: Number(x.unitPrice), taxRate: Number(x.taxRate) });
  for (const x of order.materials.filter(x => x.billable && x.unitPrice !== null)) positions.push({ description: x.description, quantity: Number(x.quantity), unit: x.unit, unitPrice: Number(x.unitPrice), taxRate: 19 });
  for (const x of order.extras.filter(x => x.approved)) positions.push({ description: `Nachtrag: ${x.description}`, quantity: 1, unit: "pauschal", unitPrice: Number(x.amount), taxRate: 19 });

  const net = positions.reduce((s, x) => s + x.quantity * x.unitPrice, 0);
  const tax = positions.reduce((s, x) => s + x.quantity * x.unitPrice * x.taxRate / 100, 0);
  const count = await db.invoice.count({ where: { companyId: auth.user.companyId } });
  const number = `RE-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
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
