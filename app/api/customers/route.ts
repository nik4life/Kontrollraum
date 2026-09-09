import { db } from "../../../lib/db";
import { json, requireUser } from "../../../lib/http";

export async function GET() {
  const auth = await requireUser(); if (!auth.user) return auth.response!;
  const rows = await db.customer.findMany({ where: { companyId: auth.user.companyId }, orderBy: { name: "asc" } });
  return json(rows);
}

export async function POST(req: Request) {
  const auth = await requireUser(); if (!auth.user) return auth.response!;
  const b = await req.json();
  if (!String(b.name || "").trim()) return json({ error: "Name fehlt." }, { status: 400 });
  const row = await db.customer.create({ data: {
    companyId: auth.user.companyId,
    number: b.number || null,
    name: String(b.name).trim(),
    contactPerson: b.contactPerson || null,
    street: b.street || null,
    zip: b.zip || null,
    city: b.city || null,
    email: b.email || null,
    phone: b.phone || null,
  }});
  return json(row, { status: 201 });
}
