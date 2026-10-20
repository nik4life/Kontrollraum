import { db } from "../../../lib/db";
import { nextBusinessNumber } from "../../../lib/business-number";
import { json, requireModule } from "../../../lib/http";
import { totals, validateCashTerms, validateLines } from "../../../lib/discounts";

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
  let amount, cash;
  try { validateLines(items); cash=validateCashTerms(b.cashDiscountPercent,b.cashDiscountDays); amount=totals(items); }
  catch(e:any){return json({error:e.message},{status:400});}
  const number = await nextBusinessNumber(auth.user.companyId, "QUOTE");
  const quote = await db.quote.create({ data: {
    companyId: auth.user.companyId,
    customerId: customer.id,
    number,
    title: String(b.title).trim(),
    description: b.description || null,
    validUntil: b.validUntil ? new Date(b.validUntil) : null,
    netTotal: amount.net, taxTotal: amount.tax, grossTotal: amount.gross,
    cashDiscountPercent: cash.percent, cashDiscountDays: cash.days,
    items: { create: items.map((x: any, i: number) => ({
      companyId: auth.user!.companyId,
      catalogItemId: x.catalogItemId || null,
      position: i + 1,
      description: x.description,
      quantity: x.quantity ?? 1,
      unit: x.unit || "Stk",
      unitPrice: x.unitPrice ?? 0,
      taxRate: x.taxRate ?? 19,
      discountType: x.discountType === "AMOUNT" ? "AMOUNT" : "PERCENT",
      discountValue: Number(x.discountValue || 0),
      discountEligible: x.discountEligible !== false,
    })) },
  }, include: { customer: true, items: true, order: true } });
  return json(quote, { status: 201 });
}
