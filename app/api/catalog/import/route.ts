import { db } from "../../../../lib/db";
import { json, requireModule } from "../../../../lib/http";

export async function POST(req: Request) {
  const auth = await requireModule("CATALOG", "create"); if (!auth.user) return auth.response!;
  const b = await req.json();
  const items = Array.isArray(b.items) ? b.items : [];
  let imported = 0;
  for (const item of items) {
    if (!String(item.name || "").trim()) continue;
    const sku = String(item.sku || "").trim() || null;
    if (sku) {
      await db.catalogItem.upsert({
        where: { companyId_sku: { companyId: auth.user.companyId, sku } },
        update: { name: item.name, description: item.description || null, unit: item.unit || "Stk", purchasePrice: item.purchasePrice ?? null, salesPrice: item.salesPrice ?? 0, taxRate: item.taxRate ?? 19, source: "CSV" },
        create: { companyId: auth.user.companyId, sku, name: item.name, description: item.description || null, unit: item.unit || "Stk", purchasePrice: item.purchasePrice ?? null, salesPrice: item.salesPrice ?? 0, taxRate: item.taxRate ?? 19, source: "CSV" },
      });
    } else {
      await db.catalogItem.create({ data: { companyId: auth.user.companyId, name: item.name, description: item.description || null, unit: item.unit || "Stk", purchasePrice: item.purchasePrice ?? null, salesPrice: item.salesPrice ?? 0, taxRate: item.taxRate ?? 19, source: "CSV" } });
    }
    imported++;
  }
  await db.importJob.create({ data: { companyId: auth.user.companyId, sourceType: "CSV", fileName: b.fileName || null, rowsTotal: items.length, rowsImported: imported } });
  return json({ imported });
}
