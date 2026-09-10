import { db } from "../../../lib/db";
import { nextBusinessNumber } from "../../../lib/business-number";
import { json, requireModule } from "../../../lib/http";

export async function GET() {
  const auth = await requireModule("QUOTES", "view"); if (!auth.user) return auth.response!;
  return json(await db.quote.findMany({
    where: { companyId: auth.user.companyId },
    include: { customer: true, items: true, order: true },
    orderBy: { createdAt: "desc" },
  }));
}

export async function POST(req: Request) {
  const auth = await requireModule("QUOTES", "create"); if (!auth.user) return auth.response!;
  const b = await req.json();
  if (!b.customerId || !String(b.title || "").trim()) return json({ error: "Kunde und Titel sind erforderlich." }, { status: 400 });
  const customer = await db.customer.findFirst({ where: { id: b.customerId, companyId: auth.user.companyId, active: true } });
  if (!customer) return json({ error: "Kunde nicht gefunden." }, { status: 404 });
  const items = Array.isArray(b.items) ? b.items : [];
  const net = items.reduce((s: number, x: any) => s + Number(x.quantity ?? 1) * Number(x.unitPrice ?? 0), 0);
  const tax = items.reduce((s: number, x: any) => s + Number(x.quantity ?? 1) * Number(x.unitPrice ?? 0) * Number(x.taxRate ?? 19) / 100, 0);
  const number = await nextBusinessNumber(auth.user.companyId, "QUOTE");
  const quote = await db.quote.create({ data: {
    companyId: auth.user.companyId,
    customerId: customer.id,
    number,
    title: String(b.title).trim(),
    description: b.description || null,
    validUntil: b.validUntil ? new Date(b.validUntil) : null,
    netTotal: net, taxTotal: tax, grossTotal: net + tax,
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
  }, include: { customer: true, items: true, order: true } });
  return json(quote, { status: 201 });
}
