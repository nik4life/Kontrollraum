import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "../../../../lib/db";
import { createSession } from "../../../../lib/auth";

export async function POST(req: Request) {
  if (await db.user.count()) return NextResponse.json({ error: "Installation ist bereits initialisiert." }, { status: 409 });
  const body = await req.json();
  const fullName = String(body.fullName || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const companyName = String(body.companyName || "").trim();
  if (!fullName || !email || password.length < 8 || !companyName) return NextResponse.json({ error: "Pflichtfelder fehlen oder das Passwort ist zu kurz." }, { status: 400 });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await db.$transaction(async (tx) => {
    const company = await tx.company.create({ data: {
      name: companyName,
      street: body.street || null,
      zip: body.zip || null,
      city: body.city || null,
      email: body.companyEmail || email,
      phone: body.phone || null,
    }});
    const admin = await tx.user.create({ data: { companyId: company.id, fullName, email, passwordHash } });
    const role = await tx.role.create({ data: { companyId: company.id, code: "ADMIN", name: "Administrator", description: "Vollzugriff auf Kontrollraum", systemRole: true } });
    const modules = await tx.module.findMany({ select: { code: true } });
    if (modules.length) await tx.roleModule.createMany({ data: modules.map(m => ({ roleId: role.id, moduleCode: m.code, canView: true, canCreate: true, canEdit: true, canDelete: true })) });
    await tx.userRole.create({ data: { userId: admin.id, roleId: role.id } });
    return admin;
  });
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
