import { db } from "../../../../lib/db";
import { json, requireModule } from "../../../../lib/http";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireModule("ORDERS", "view"); if (!auth.user) return auth.response!;
  const { id } = await ctx.params;
  const row = await db.order.findFirst({ where: { id, companyId: auth.user.companyId }, include: { customer: true, items: true, materials: true, extras: true, timeEntries: true, orderNotes: true } });
  return row ? json(row) : json({ error: "Auftrag nicht gefunden." }, { status: 404 });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireModule("ORDERS", "edit"); if (!auth.user) return auth.response!;
  const { id } = await ctx.params;
  const existing = await db.order.findFirst({ where: { id, companyId: auth.user.companyId } });
  if (!existing) return json({ error: "Auftrag nicht gefunden." }, { status: 404 });
  const b = await req.json();
  const action = b.action;
  if (["INVOICED","CANCELLED"].includes(existing.status) && ["item","material","extra","time","note"].includes(action)) return json({ error: "Dieser Auftrag ist abgeschlossen." }, { status: 409 });
  if (action === "item") {
    const description = String(b.description || "").trim();
    const quantity = Number(b.quantity), unitPrice = Number(b.unitPrice), taxRate = Number(b.taxRate ?? 19);
    if (!description || description.length > 2000 || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0 || !Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) return json({ error: "Ungültige Auftragsposition." }, { status: 400 });
    const last = await db.orderItem.aggregate({ where: { orderId: id, companyId: auth.user.companyId }, _max: { position: true } });
    return json(await db.orderItem.create({ data: { companyId: auth.user.companyId, orderId: id, position: (last._max.position || 0) + 1, description, quantity, unit: String(b.unit || "Stk").slice(0,30), unitPrice, taxRate } }));
  }

  if (action === "material") {
    const row = await db.materialUsage.create({ data: { companyId: auth.user.companyId, orderId: id, catalogItemId: b.catalogItemId || null, description: b.description, quantity: b.quantity ?? 1, unit: b.unit || "Stk", unitPrice: b.unitPrice ?? null } });
    return json(row);
  }
  if (action === "extra") {
    const row = await db.extraWork.create({ data: { companyId: auth.user.companyId, orderId: id, description: b.description, amount: b.amount ?? 0, approved: Boolean(b.approved) } });
    return json(row);
  }
  if (action === "time") {
    const row = await db.timeEntry.create({ data: { companyId: auth.user.companyId, orderId: id, userId: auth.user.id, minutes: b.minutes ?? 0, description: b.description || null, hourlyRate: b.hourlyRate ?? null } });
    return json(row);
  }
  if (action === "note") {
    const row = await db.orderNote.create({ data: { companyId: auth.user.companyId, orderId: id, userId: auth.user.id, note: b.note } });
    return json(row);
  }
  const allowedStatuses = ["DRAFT","PLANNED","IN_PROGRESS","READY_FOR_REVIEW","COMPLETED","INVOICED","CANCELLED"];
  if (!allowedStatuses.includes(String(b.status || ""))) return json({ error: "Ungültiger Auftragsstatus." }, { status: 400 });
  const row = await db.order.update({ where: { id }, data: { status: b.status, completedAt: b.status === "COMPLETED" || b.status === "READY_FOR_REVIEW" ? new Date() : undefined } });
  return json(row);
}
