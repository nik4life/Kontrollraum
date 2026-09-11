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
    if (!quote.items.length) return json({ error: "Ein leeres Angebot kann nicht versendet werden." }, { status: 400 });
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

  if (b.action === "update") {
    const items = Array.isArray(b.items) ? b.items : null;
    if (items && !items.length && quote.status !== "DRAFT") return json({ error: "Nur ein Entwurf darf ohne Positionen gespeichert werden." }, { status: 400 });
    for (const item of items || []) {
      if (!String(item.description || "").trim()) return json({ error: "Jede Position benötigt eine Bezeichnung." }, { status: 400 });
      if (item.catalogItemId) {
        const exists = await db.catalogItem.findFirst({ where: { id: item.catalogItemId, companyId: auth.user.companyId, active: true }, select: { id: true } });
        if (!exists) return json({ error: "Eine Angebotsposition verweist auf einen ungültigen Katalogartikel." }, { status: 400 });
      }
    }
    const net = (items || quote.items).reduce((s: number, x: any) => s + Number(x.quantity ?? 1) * Number(x.unitPrice ?? 0), 0);
    const tax = (items || quote.items).reduce((s: number, x: any) => s + Number(x.quantity ?? 1) * Number(x.unitPrice ?? 0) * Number(x.taxRate ?? 19) / 100, 0);
    const data: any = {
      title: String(b.title ?? quote.title).trim(),
      description: b.description || null,
      validUntil: b.validUntil ? new Date(b.validUntil) : null,
      netTotal: net,
      taxTotal: tax,
      grossTotal: net + tax,
    };
    if (quote.status === "ACCEPTED") data.version = quote.version + 1;
    if (items) {
      data.items = {
        deleteMany: {},
        create: items.map((x: any, i: number) => ({
          companyId: auth.user!.companyId,
          catalogItemId: x.catalogItemId || null,
          position: i + 1,
          description: String(x.description).trim(),
          quantity: Number(x.quantity ?? 1),
          unit: x.unit || "Stk",
          unitPrice: Number(x.unitPrice ?? 0),
          taxRate: Number(x.taxRate ?? 19),
        })),
      };
    }
    return json(await db.quote.update({ where: { id }, data, include: { customer: true, items: true, order: true } }));
  }

  const allowed: any = {};
  for (const key of ["title","description","notes"] as const) if (key in b) allowed[key] = b[key] || null;
  if ("validUntil" in b) allowed.validUntil = b.validUntil ? new Date(b.validUntil) : null;
  return json(await db.quote.update({ where: { id }, data: allowed, include: { customer: true, items: true, order: true } }));
}
