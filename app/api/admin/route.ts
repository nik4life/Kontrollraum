import { db } from "../../../lib/db";
import { json, requireModule } from "../../../lib/http";

export async function GET() {
  const auth = await requireModule("ADMIN", "view"); if (!auth.user) return auth.response!;
  const [company, roles, modules, users] = await Promise.all([
    db.company.findUnique({ where: { id: auth.user.companyId } }),
    db.role.findMany({ where: { companyId: auth.user.companyId }, include: { roleModules: true }, orderBy: { name: "asc" } }),
    db.module.findMany({ orderBy: { sortOrder: "asc" } }),
    db.user.findMany({ where: { companyId: auth.user.companyId }, select: { id: true, fullName: true, email: true, active: true, userRoles: { include: { role: true } } } }),
  ]);
  return json({ company, roles, modules, users });
}

export async function PATCH(req: Request) {
  const auth = await requireModule("ADMIN", "edit"); if (!auth.user) return auth.response!;
  const b = await req.json();
  const company = await db.company.update({ where: { id: auth.user.companyId }, data: {
    name: b.name,
    legalName: b.legalName || null,
    street: b.street || null,
    zip: b.zip || null,
    city: b.city || null,
    email: b.email || null,
    phone: b.phone || null,
    website: b.website || null,
    taxNumber: b.taxNumber || null,
    vatId: b.vatId || null,
    iban: b.iban || null,
    bic: b.bic || null,
  }});
  return json(company);
}

export async function POST(req: Request) {
  const auth = await requireModule("ADMIN", "create"); if (!auth.user) return auth.response!;
  const b = await req.json();
  const code = String(b.code || b.name || "ROLE").toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
  const role = await db.role.create({ data: {
    companyId: auth.user.companyId,
    code,
    name: b.name,
    description: b.description || null,
    roleModules: { create: (Array.isArray(b.modules) ? b.modules : []).map((moduleCode: string) => ({ moduleCode, canView: true, canCreate: Boolean(b.canCreate), canEdit: Boolean(b.canEdit), canDelete: Boolean(b.canDelete) })) },
  }, include: { roleModules: true } });
  return json(role, { status: 201 });
}
