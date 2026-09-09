import { db } from "../../../../lib/db";
import { json, requireUser } from "../../../../lib/http";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(); if (!auth.user) return auth.response!;
  const { id } = await ctx.params;
  const row = await db.order.findFirst({ where: { id, companyId: auth.user.companyId }, include: { customer: true, items: true, materials: true, extras: true, timeEntries: true, orderNotes: true } });
  return row ? json(row) : json({ error: "Auftrag nicht gefunden." }, { status: 404 });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(); if (!auth.user) return auth.response!;
  const { id } = await ctx.params;
  const existing = await db.order.findFirst({ where: { id, companyId: auth.user.companyId } });
  if (!existing) return json({ error: "Auftrag nicht gefunden." }, { status: 404 });
  const b = await req.json();
  const action = b.action;
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
  const row = await db.order.update({ where: { id }, data: { status: b.status, completedAt: b.status === "COMPLETED" || b.status === "READY_FOR_REVIEW" ? new Date() : undefined } });
  return json(row);
}
