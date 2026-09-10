import { db } from "../../../lib/db";
import { nextBusinessNumber } from "../../../lib/business-number";
import { json, requireModule } from "../../../lib/http";

export async function GET() {
  const auth = await requireModule("CUSTOMERS", "view"); if (!auth.user) return auth.response!;
  const rows = await db.customer.findMany({ where: { companyId: auth.user.companyId }, orderBy: { name: "asc" } });
  return json(rows);
}

export async function POST(req: Request) {
  const auth = await requireModule("CUSTOMERS", "create"); if (!auth.user) return auth.response!;
  const b = await req.json();
  if (!String(b.name || "").trim()) return json({ error: "Name fehlt." }, { status: 400 });
  const number = await nextBusinessNumber(auth.user.companyId, "CUSTOMER");
  const row = await db.customer.create({ data: {
    companyId: auth.user.companyId,
    number,
    kind: b.kind || "COMPANY",
    name: String(b.name).trim(),
    contactPerson: b.contactPerson || null,
    street: b.street || null,
    zip: b.zip || null,
    city: b.city || null,
    email: b.email || null,
    phone: b.phone || null,
    vatId: b.vatId || null,
    notes: b.notes || null,
  }});
  return json(row, { status: 201 });
}
