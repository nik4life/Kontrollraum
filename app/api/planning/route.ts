import { db } from "../../../lib/db";
import { json, requireModule } from "../../../lib/http";

export async function GET() {
  const auth = await requireModule("PLANNING", "view"); if (!auth.user) return auth.response!;
  const companyId = auth.user.companyId;
  const [users, orders, absences] = await Promise.all([
    db.user.findMany({ where: { companyId, active: true }, select: { id: true, fullName: true, email: true } }),
    db.order.findMany({ where: { companyId, status: { notIn: ["INVOICED","CANCELLED"] } }, include: { customer: true, assignments: { include: { user: { select: { id: true, fullName: true } } } } }, orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }] }),
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

async function validateSlot(companyId:string,userId:string,startsAt:Date,endsAt:Date,ignoreAssignmentId?:string){
  if (!(startsAt < endsAt)) return "Der Einsatzzeitraum ist ungültig.";
  const absence = await db.absence.findFirst({ where:{companyId,userId,startsAt:{lt:endsAt},endsAt:{gt:startsAt}}});
  if(absence) return "Der Mitarbeiter ist in diesem Zeitraum gesperrt.";
  const overlap = await db.orderAssignment.findFirst({where:{companyId,userId,id:ignoreAssignmentId?{not:ignoreAssignmentId}:undefined,startsAt:{lt:endsAt},endsAt:{gt:startsAt}}});
  if(overlap) return "Der Mitarbeiter hat in diesem Zeitraum bereits einen anderen Einsatz.";
  return null;
}

export async function POST(req: Request) {
  const auth = await requireModule("PLANNING", "create"); if (!auth.user) return auth.response!;
  const b = await req.json(); const companyId = auth.user.companyId;
  if (b.action === "absence") {
    const user = await db.user.findFirst({ where: { id: b.userId, companyId, active: true } }); if (!user) return json({ error: "Mitarbeiter nicht gefunden." }, { status: 404 });
    const startsAt = new Date(b.startsAt), endsAt = new Date(b.endsAt); if (!(startsAt < endsAt)) return json({ error: "Der Abwesenheitszeitraum ist ungültig." }, { status: 400 });
    return json(await db.absence.create({ data: { companyId, userId: user.id, type: b.type || "OTHER", startsAt, endsAt, note: b.note || null }, include: { user: { select: { id: true, fullName: true } } } }), { status: 201 });
  }
  if (b.action === "assign") {
    const [order,user]=await Promise.all([db.order.findFirst({where:{id:b.orderId,companyId}}),db.user.findFirst({where:{id:b.userId,companyId,active:true}})]); if(!order||!user)return json({error:"Auftrag oder Mitarbeiter nicht gefunden."},{status:404});
    const startsAt=new Date(b.startsAt),endsAt=new Date(b.endsAt),problem=await validateSlot(companyId,user.id,startsAt,endsAt); if(problem)return json({error:problem},{status:409});
    const assignment=await db.orderAssignment.create({data:{companyId,orderId:order.id,userId:user.id,startsAt,endsAt},include:{user:{select:{id:true,fullName:true}}}});
    await db.order.update({where:{id:order.id},data:{scheduledAt:startsAt,scheduledEndAt:endsAt,plannedMinutes:Math.max(1,Math.round((endsAt.getTime()-startsAt.getTime())/60000)),status:order.status==="DRAFT"?"PLANNED":order.status}}); return json(assignment,{status:201});
  }
  if (b.action === "move") {
    const assignment=await db.orderAssignment.findFirst({where:{id:b.assignmentId,companyId}}); const user=await db.user.findFirst({where:{id:b.userId,companyId,active:true}}); if(!assignment||!user)return json({error:"Einsatz oder Mitarbeiter nicht gefunden."},{status:404});
    const startsAt=new Date(b.startsAt),endsAt=new Date(b.endsAt),problem=await validateSlot(companyId,user.id,startsAt,endsAt,assignment.id); if(problem)return json({error:problem},{status:409});
    const moved=await db.orderAssignment.update({where:{id:assignment.id},data:{userId:user.id,startsAt,endsAt},include:{user:{select:{id:true,fullName:true}}}});
    const all=await db.orderAssignment.findMany({where:{orderId:assignment.orderId},orderBy:{startsAt:"asc"}}); const first=all[0]; if(first)await db.order.update({where:{id:assignment.orderId},data:{scheduledAt:first.startsAt,scheduledEndAt:first.endsAt}}); return json(moved);
  }
  if (b.action === "remove") {
    const assignment=await db.orderAssignment.findFirst({where:{id:b.assignmentId,companyId}}); if(!assignment)return json({error:"Einsatz nicht gefunden."},{status:404});
    await db.orderAssignment.delete({where:{id:assignment.id}}); const remaining=await db.orderAssignment.findMany({where:{orderId:assignment.orderId},orderBy:{startsAt:"asc"}});
    await db.order.update({where:{id:assignment.orderId},data:{scheduledAt:remaining[0]?.startsAt||null,scheduledEndAt:remaining[0]?.endsAt||null}}); return json({ok:true});
  }
  return json({ error: "Unbekannte Planungsaktion." }, { status: 400 });
}
