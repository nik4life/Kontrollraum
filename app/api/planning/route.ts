import { db } from "../../../lib/db";
import { json, requireModule } from "../../../lib/http";

export async function GET() {
  const auth = await requireModule("PLANNING", "view"); if (!auth.user) return auth.response!;
  const companyId = auth.user.companyId;
  const [users, orders, absences] = await Promise.all([
    db.user.findMany({ where: { companyId, active: true }, select: { id: true, fullName: true, email: true } }),
    db.order.findMany({
      where: { companyId, status: { notIn: ["INVOICED","CANCELLED"] } },
      include: { customer: true, assignments: { include: { user: { select: { id: true, fullName: true } } } } },
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
    }),
    db.absence.findMany({ where: { companyId }, include: { user: { select: { id: true, fullName: true } } }, orderBy: { startsAt: "asc" } }),
  ]);

  const warnings = orders.flatMap(order => {
    if (!order.scheduledAt) return [];
    if (!order.assignments.length) return [{ orderId: order.id, number: order.number, message: `${order.number} ist terminiert, aber keinem Mitarbeiter zugewiesen.` }];
    const conflicts = order.assignments.filter(a => absences.some(abs => abs.userId === a.userId && abs.startsAt < a.endsAt && abs.endsAt > a.startsAt));
    return conflicts.map(a => ({ orderId: order.id, number: order.number, userId: a.userId, message: `${order.number}: ${a.user.fullName} ist im geplanten Zeitraum nicht verfügbar.` }));
  });

  return json({ users, orders, absences, warnings });
}

export async function POST(req: Request) {
  const auth = await requireModule("PLANNING", "create"); if (!auth.user) return auth.response!;
  const b = await req.json();
  const companyId = auth.user.companyId;

  if (b.action === "absence") {
    const user = await db.user.findFirst({ where: { id: b.userId, companyId, active: true } });
    if (!user) return json({ error: "Mitarbeiter nicht gefunden." }, { status: 404 });
    const startsAt = new Date(b.startsAt), endsAt = new Date(b.endsAt);
    if (!(startsAt < endsAt)) return json({ error: "Der Abwesenheitszeitraum ist ungültig." }, { status: 400 });
    return json(await db.absence.create({ data: { companyId, userId: user.id, type: b.type || "OTHER", startsAt, endsAt, note: b.note || null }, include: { user: { select: { id: true, fullName: true } } } }), { status: 201 });
  }

  if (b.action === "assign") {
    const [order, user] = await Promise.all([
      db.order.findFirst({ where: { id: b.orderId, companyId } }),
      db.user.findFirst({ where: { id: b.userId, companyId, active: true } }),
    ]);
    if (!order || !user) return json({ error: "Auftrag oder Mitarbeiter nicht gefunden." }, { status: 404 });
    const startsAt = new Date(b.startsAt), endsAt = new Date(b.endsAt);
    if (!(startsAt < endsAt)) return json({ error: "Der Einsatzzeitraum ist ungültig." }, { status: 400 });
    const absence = await db.absence.findFirst({ where: { companyId, userId: user.id, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } });
    if (absence) return json({ error: `${user.fullName} ist in diesem Zeitraum gesperrt.` }, { status: 409 });
    const assignment = await db.orderAssignment.create({ data: { companyId, orderId: order.id, userId: user.id, startsAt, endsAt }, include: { user: { select: { id: true, fullName: true } } } });
    await db.order.update({ where: { id: order.id }, data: { scheduledAt: startsAt, scheduledEndAt: endsAt, plannedMinutes: Math.max(1, Math.round((endsAt.getTime() - startsAt.getTime()) / 60000)), status: order.status === "DRAFT" ? "PLANNED" : order.status } });
    return json(assignment, { status: 201 });
  }

  return json({ error: "Unbekannte Planungsaktion." }, { status: 400 });
}
