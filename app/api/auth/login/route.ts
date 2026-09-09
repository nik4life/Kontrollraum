import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "../../../../lib/db";
import { createSession } from "../../../../lib/auth";

export async function POST(req: Request) {
  const body = await req.json();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: "Anmeldung fehlgeschlagen." }, { status: 401 });
  }
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
