import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { currentUser } from "../../../../lib/auth";

export async function GET() {
  const [count, user] = await Promise.all([db.user.count(), currentUser()]);
  if (!user) return NextResponse.json({ installed: count > 0, user: null });
  const permissions: Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean }> = {};
  for (const userRole of user.userRoles) {
    for (const p of userRole.role.roleModules) {
      const current = permissions[p.moduleCode] || { view: false, create: false, edit: false, delete: false };
      permissions[p.moduleCode] = {
        view: current.view || p.canView,
        create: current.create || p.canCreate,
        edit: current.edit || p.canEdit,
        delete: current.delete || p.canDelete,
      };
    }
  }
  return NextResponse.json({ installed: count > 0, user: { id: user.id, fullName: user.fullName, email: user.email, company: user.company, permissions } });
}
