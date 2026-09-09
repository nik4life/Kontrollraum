import { db } from "../../../lib/db";
import { json, requireUser } from "../../../lib/http";

export async function GET() {
  const auth = await requireUser(); if (!auth.user) return auth.response!;
  const rows = await db.order.findMany({
    where: { companyId: auth.user.companyId },
    include: { customer: true, items: true, materials: true, extras: true },
    orderBy: { createdAt: "desc" },
  });
  return json(rows);
}

export async function POST(req: Request) {
  const auth = await requireUser(); if (!auth.user) return auth.response!;
  const b = await req.json();
  if (!b.customerId || !String(b.title || "").trim()) return json({ error: "Kunde und Titel sind erforderlich." }, { status: 400 });
  const count = await db.order.count({ where: { companyId: auth.user.companyId } });
  const number = b.number || `AU-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
  const row = await db.order.create({ data: {
    companyId: auth.user.companyId,
    customerId: b.customerId,
    number,
    title: String(b.title).trim(),
    description: b.description || null,
    street: b.street || null,
    zip: b.zip || null,
    city: b.city || null,
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
