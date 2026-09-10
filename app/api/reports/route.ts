import { db } from "../../../lib/db";
import { nextBusinessNumber } from "../../../lib/business-number";
import { json, requireModule } from "../../../lib/http";

export async function GET() {
  const auth = await requireModule("REPORTS", "view"); if (!auth.user) return auth.response!;
  return json(await db.report.findMany({
    where: { companyId: auth.user.companyId },
    include: { customer: true, items: true, invoices: true },
    orderBy: { createdAt: "desc" },
  }));
}

export async function POST(req: Request) {
  const auth = await requireModule("REPORTS", "create"); if (!auth.user) return auth.response!;
  const b = await req.json();
  if (!b.customerId || !String(b.title || "").trim()) return json({ error: "Kunde und Titel sind erforderlich." }, { status: 400 });
  const customer = await db.customer.findFirst({ where: { id: b.customerId, companyId: auth.user.companyId, active: true } });
  if (!customer) return json({ error: "Kunde nicht gefunden." }, { status: 404 });
  const items = Array.isArray(b.items) ? b.items : [];
  const number = await nextBusinessNumber(auth.user.companyId, "REPORT");
  const report = await db.report.create({ data: {
    companyId: auth.user.companyId,
    customerId: customer.id,
    number,
    title: String(b.title).trim(),
    description: b.description || null,
    performedAt: b.performedAt ? new Date(b.performedAt) : new Date(),
    workMinutes: Math.max(0, Number(b.workMinutes || 0)),
    hourlyRate: b.hourlyRate === null || b.hourlyRate === undefined || b.hourlyRate === "" ? null : Number(b.hourlyRate),
    status: b.status || "READY_FOR_REVIEW",
    items: { create: items.map((x: any, i: number) => ({
      companyId: auth.user!.companyId,
      catalogItemId: x.catalogItemId || null,
      position: i + 1,
      description: x.description,
      quantity: x.quantity ?? 1,
      unit: x.unit || "Stk",
      unitPrice: x.unitPrice ?? 0,
      taxRate: x.taxRate ?? 19,
    })) },
  }, include: { customer: true, items: true, invoices: true } });
  return json(report, { status: 201 });
}
