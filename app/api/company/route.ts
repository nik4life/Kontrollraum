import { db } from "../../../lib/db";
import { json, requireUser } from "../../../lib/http";

const editable = ["name","legalName","street","zip","city","email","phone","website","taxNumber","vatId","iban","bic"] as const;

export async function GET() {
  const auth = await requireUser();
  if (!auth.user) return auth.response!;
  const company = await db.company.findUnique({ where: { id: auth.user.companyId } });
  return company ? json(company) : json({ error: "Betrieb nicht gefunden." }, { status: 404 });
}

export async function PATCH(req: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response!;
  const admin = auth.user.userRoles.some(x => x.role.code === "ADMIN");
  if (!admin) return json({ error: "Nur Administratoren dürfen Betriebsdaten ändern." }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Ungültige Daten." }, { status: 400 });
  const data: Record<string, string | null> = {};
  for (const field of editable) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      if (typeof body[field] !== "string") return json({ error: "Ungültiges Feld: " + field }, { status: 400 });
      const value = body[field].trim();
      if (value.length > 300) return json({ error: "Feld zu lang: " + field }, { status: 400 });
      data[field] = value || null;
    }
  }
  if (data.name === null) return json({ error: "Firmenname darf nicht leer sein." }, { status: 400 });
  const company = await db.company.update({ where: { id: auth.user.companyId }, data });
  return json(company);
}
