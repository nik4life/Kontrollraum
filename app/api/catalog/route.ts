import { db } from "../../../lib/db";
import { json, requireUser } from "../../../lib/http";

export async function GET() {
  const auth = await requireUser(); if (!auth.user) return auth.response!;
  const rows = await db.catalogItem.findMany({ where: { companyId: auth.user.companyId }, orderBy: { name: "asc" } });
  return json(rows);
}

export async function POST(req: Request) {
  const auth = await requireUser(); if (!auth.user) return auth.response!;
  const b = await req.json();
  if (!String(b.name || "").trim()) return json({ error: "Bezeichnung fehlt." }, { status: 400 });
  const row = await db.catalogItem.create({ data: {
    companyId: auth.user.companyId,
    sku: b.sku || null,
    name: String(b.name).trim(),
    description: b.description || null,
    itemType: b.itemType || "MATERIAL",
    unit: b.unit || "Stk",
    purchasePrice: b.purchasePrice ?? null,
    salesPrice: b.salesPrice ?? 0,
    taxRate: b.taxRate ?? 19,
  }});
  return json(row, { status: 201 });
}
