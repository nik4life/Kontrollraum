import { db } from "../../../lib/db";
import { nextBusinessNumber } from "../../../lib/business-number";
import { json, requireModule } from "../../../lib/http";

export async function GET() {
  const auth = await requireModule("CATALOG", "view"); if (!auth.user) return auth.response!;
  const rows = await db.catalogItem.findMany({ where: { companyId: auth.user.companyId }, orderBy: { name: "asc" } });
  return json(rows);
}

export async function POST(req: Request) {
  const auth = await requireModule("CATALOG", "create"); if (!auth.user) return auth.response!;
  const b = await req.json();
  if (!String(b.name || "").trim()) return json({ error: "Bezeichnung fehlt." }, { status: 400 });
  const sku = await nextBusinessNumber(auth.user.companyId, "CATALOG");
  const row = await db.catalogItem.create({ data: {
    companyId: auth.user.companyId,
    sku,
    name: String(b.name).trim(),
    description: b.description || null,
    itemType: b.itemType || "MATERIAL",
    unit: b.unit || "Stk",
    purchasePrice: b.purchasePrice ?? null,
    salesPrice: b.salesPrice ?? 0,
    taxRate: b.taxRate ?? 19,
    source: "MANUAL",
  }});
  return json(row, { status: 201 });
}
