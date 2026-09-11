import { db } from "../../../lib/db";
import { json, requireModule } from "../../../lib/http";

export async function GET() {
  const auth = await requireModule("CATALOG", "view");
  if (!auth.user) return auth.response!;
  const rows = await db.priceList.findMany({
    where: { companyId: auth.user.companyId },
    include: { prices: true },
    orderBy: [{ name: "asc" }],
  });
  return json(rows);
}

export async function POST(req: Request) {
  const auth = await requireModule("CATALOG", "create");
  if (!auth.user) return auth.response!;
  const b = await req.json();
  const code = String(b.code || "").trim().toUpperCase();
  const name = String(b.name || "").trim();
  if (!code || !name) return json({ error: "Code und Name der Preisliste sind erforderlich." }, { status: 400 });
  try {
    const row = await db.priceList.create({ data: { companyId: auth.user.companyId, code, name, description: b.description || null } });
    return json(row, { status: 201 });
  } catch {
    return json({ error: "Diese Preisliste bzw. dieser Code existiert bereits." }, { status: 409 });
  }
}
