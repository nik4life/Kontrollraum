import { db } from "../../../../lib/db";
import { nextBusinessNumber } from "../../../../lib/business-number";
import { json, requireModule } from "../../../../lib/http";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireModule("QUOTES", "view"); if (!auth.user) return auth.response!;
  const { id } = await params;
  const quote = await db.quote.findFirst({ where: { id, companyId: auth.user.companyId }, include: { customer: true, items: true, order: true } });
  return quote ? json(quote) : json({ error: "Angebot nicht gefunden." }, { status: 404 });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireModule("QUOTES", "edit"); if (!auth.user) return auth.response!;
  const { id } = await params;
  const b = await req.json();
  const quote = await db.quote.findFirst({ where: { id, companyId: auth.user.companyId }, include: { items: true, customer: true, order: true } });
  if (!quote) return json({ error: "Angebot nicht gefunden." }, { status: 404 });

  if (b.action === "send") {
    return json(await db.quote.update({ where: { id }, data: { status: "SENT", sentAt: new Date() }, include: { customer: true, items: true, order: true } }));
  }
  if (b.action === "accept") {
    return json(await db.quote.update({ where: { id }, data: { status: "ACCEPTED", respondedAt: new Date(), acceptedAt: new Date(), rejectedAt: null }, include: { customer: true, items: true, order: true } }));
  }
  if (b.action === "reject") {
    return json(await db.quote.update({ where: { id }, data: { status: "REJECTED", respondedAt: new Date(), rejectedAt: new Date() }, include: { customer: true, items: true, order: true } }));
  }
  if (b.action === "archive") {
    return json(await db.quote.update({ where: { id }, data: { status: "ARCHIVED" }, include: { customer: true, items: true, order: true } }));
  }
  if (b.action === "convert") {
    if (quote.status !== "ACCEPTED") return json({ error: "Nur angenommene Angebote können in einen Auftrag umgewandelt werden." }, { status: 409 });
    if (quote.order) return json({ error: "Für dieses Angebot existiert bereits ein Auftrag.", order: quote.order }, { status: 409 });
    const number = await nextBusinessNumber(auth.user.companyId, "ORDER");
    const order = await db.order.create({ data: {
      companyId: auth.user.companyId,
      customerId: quote.customerId,
      number,
      title: quote.title,
      description: quote.description,
      street: quote.customer.street,
      zip: quote.customer.zip,
      city: quote.customer.city,
      status: "PLANNED",
      plannedMinutes: Number.isFinite(Number(b.plannedMinutes)) && Number(b.plannedMinutes) > 0 ? Number(b.plannedMinutes) : null,
      items: { create: quote.items.map(x => ({ companyId: auth.user!.companyId, catalogItemId: x.catalogItemId, position: x.position, description: x.description, quantity: x.quantity, unit: x.unit, unitPrice: x.unitPrice, taxRate: x.taxRate })) },
    }});
    await db.quote.update({ where: { id }, data: { status: "CONVERTED", orderId: order.id } });
    return json(order, { status: 201 });
  }

  if (["REJECTED","ARCHIVED","CONVERTED"].includes(quote.status)) return json({ error: "Dieses Angebot ist abgeschlossen und nicht mehr direkt bearbeitbar." }, { status: 409 });
  const allowed: any = {};
  for (const key of ["title","description","notes"] as const) if (key in b) allowed[key] = b[key] || null;
  if ("validUntil" in b) allowed.validUntil = b.validUntil ? new Date(b.validUntil) : null;
  return json(await db.quote.update({ where: { id }, data: allowed, include: { customer: true, items: true, order: true } }));
}
