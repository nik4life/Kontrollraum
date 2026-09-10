import { db } from "../../../lib/db";
import { nextBusinessNumber } from "../../../lib/business-number";
import { json, requireModule } from "../../../lib/http";

export async function GET() {
  const auth = await requireModule("ORDERS", "view"); if (!auth.user) return auth.response!;
  const rows = await db.order.findMany({
    where: { companyId: auth.user.companyId },
    include: { customer: true, items: true, materials: true, extras: true },
    orderBy: { createdAt: "desc" },
  });
  return json(rows);
}

export async function POST(req: Request) {
  const auth = await requireModule("ORDERS", "create"); if (!auth.user) return auth.response!;
  const b = await req.json();
  if (!b.customerId || !String(b.title || "").trim()) return json({ error: "Kunde und Titel sind erforderlich." }, { status: 400 });
  const customer = await db.customer.findFirst({ where: { id: b.customerId, companyId: auth.user.companyId, active: true } });
  if (!customer) return json({ error: "Kunde nicht gefunden." }, { status: 404 });
  const number = await nextBusinessNumber(auth.user.companyId, "ORDER");
  const row = await db.order.create({ data: {
    companyId: auth.user.companyId,
    customerId: customer.id,
    number,
    title: String(b.title).trim(),
    description: b.description || null,
    street: b.street || customer.street || null,
    zip: b.zip || customer.zip || null,
    city: b.city || customer.city || null,
    status: b.status || "PLANNED",
    items: { create: (Array.isArray(b.items) ? b.items : []).map((x: any, i: number) => ({
      companyId: auth.user!.companyId,
      catalogItemId: x.catalogItemId || null,
      position: i + 1,
      description: x.description,
      quantity: x.quantity ?? 1,
      unit: x.unit || "Stk",
      unitPrice: x.unitPrice ?? 0,
      taxRate: x.taxRate ?? 19,
    })) },
  }, include: { customer: true, items: true } });
  return json(row, { status: 201 });
}
