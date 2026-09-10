import { db } from "../../../../lib/db";
import { json, requireModule } from "../../../../lib/http";

export async function POST(req: Request) {
  const auth = await requireModule("BILLING", "edit"); if (!auth.user) return auth.response!;
  const b = await req.json();
  const companyId = auth.user.companyId;

  if (b.orderId) {
    const order = await db.order.findFirst({ where: { id: String(b.orderId), companyId } });
    if (!order) return json({ error: "Auftrag nicht gefunden." }, { status: 404 });
    if (order.status !== "READY_FOR_REVIEW") return json({ error: "Der Auftrag befindet sich nicht in der Rechnungsprüfung." }, { status: 409 });
    return json(await db.order.update({ where: { id: order.id }, data: { status: "COMPLETED", completedAt: new Date() } }));
  }

  if (b.reportId) {
    const report = await db.report.findFirst({ where: { id: String(b.reportId), companyId } });
    if (!report) return json({ error: "Rapport nicht gefunden." }, { status: 404 });
    if (report.status !== "READY_FOR_REVIEW") return json({ error: "Der Rapport befindet sich nicht in der Rechnungsprüfung." }, { status: 409 });
    return json(await db.report.update({ where: { id: report.id }, data: { status: "APPROVED" } }));
  }

  return json({ error: "Auftrag oder Rapport ist erforderlich." }, { status: 400 });
}
