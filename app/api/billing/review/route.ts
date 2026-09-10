import { db } from "../../../../lib/db";
import { json, requireModule } from "../../../../lib/http";

export async function POST(req: Request) {
  const auth = await requireModule("BILLING", "edit"); if (!auth.user) return auth.response!;
  const b = await req.json();
  const orderId = String(b.orderId || "");
  const order = await db.order.findFirst({ where: { id: orderId, companyId: auth.user.companyId } });
  if (!order) return json({ error: "Auftrag nicht gefunden." }, { status: 404 });
  if (order.status !== "READY_FOR_REVIEW") return json({ error: "Der Auftrag befindet sich nicht in der Rechnungsprüfung." }, { status: 409 });
  const updated = await db.order.update({ where: { id: order.id }, data: { status: "COMPLETED", completedAt: new Date() } });
  return json(updated);
}
