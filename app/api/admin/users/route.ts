import bcrypt from "bcryptjs";
import { db } from "../../../../lib/db";
import { json, requireModule } from "../../../../lib/http";

export async function POST(req: Request) {
  const auth = await requireModule("ADMIN", "create"); if (!auth.user) return auth.response!;
  const b = await req.json();
  const fullName = String(b.fullName || "").trim();
  const email = String(b.email || "").trim().toLowerCase();
  const password = String(b.password || "");
  const roleIds = Array.isArray(b.roleIds) ? b.roleIds.map(String) : [];
  if (!fullName || !email) return json({ error: "Name und E-Mail sind erforderlich." }, { status: 400 });
  if (password.length < 8) return json({ error: "Das Startpasswort muss mindestens 8 Zeichen lang sein." }, { status: 400 });
  const duplicate = await db.user.findUnique({ where: { email } });
  if (duplicate) return json({ error: "Diese E-Mail-Adresse wird bereits verwendet." }, { status: 409 });
  const roles = await db.role.findMany({ where: { id: { in: roleIds }, companyId: auth.user.companyId } });
  const user = await db.user.create({
    data: {
      companyId: auth.user.companyId,
      fullName,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      userRoles: { create: roles.map(role => ({ roleId: role.id })) },
    },
    select: { id: true, fullName: true, email: true, active: true, userRoles: { include: { role: true } } },
  });
  return json(user, { status: 201 });
}

export async function PATCH(req: Request) {
  const auth = await requireModule("ADMIN", "edit"); if (!auth.user) return auth.response!;
  const b = await req.json();
  const id = String(b.id || "");
  const existing = await db.user.findFirst({ where: { id, companyId: auth.user.companyId } });
  if (!existing) return json({ error: "Mitarbeiter nicht gefunden." }, { status: 404 });
  const data: { active?: boolean; passwordHash?: string } = {};
  if (typeof b.active === "boolean") data.active = b.active;
  if (b.password) {
    if (String(b.password).length < 8) return json({ error: "Das Passwort muss mindestens 8 Zeichen lang sein." }, { status: 400 });
    data.passwordHash = await bcrypt.hash(String(b.password), 12);
  }
  if (Array.isArray(b.roleIds)) {
    const roles = await db.role.findMany({ where: { id: { in: b.roleIds.map(String) }, companyId: auth.user.companyId } });
    await db.$transaction([
      db.userRole.deleteMany({ where: { userId: id } }),
      ...roles.map(role => db.userRole.create({ data: { userId: id, roleId: role.id } })),
    ]);
  }
  const user = await db.user.update({ where: { id }, data, select: { id: true, fullName: true, email: true, active: true, userRoles: { include: { role: true } } } });
  return json(user);
}
