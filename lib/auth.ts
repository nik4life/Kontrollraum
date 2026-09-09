import crypto from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";

const COOKIE = "kr_session";
const SESSION_DAYS = 30;

function digest(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await db.session.create({ data: { userId, tokenHash: digest(token), expiresAt } });
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.SESSION_COOKIE_SECURE === "true",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: digest(token) } });
  store.set(COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", expires: new Date(0) });
}

export async function currentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: digest(token) },
    include: { user: { include: { company: true, userRoles: { include: { role: { include: { roleModules: true } } } } } } },
  });
  if (!session || session.expiresAt <= new Date() || !session.user.active) return null;
  return session.user;
}
