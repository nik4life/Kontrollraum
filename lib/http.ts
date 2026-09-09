import { NextResponse } from "next/server";
import { currentUser } from "./auth";

type Permission = "view" | "create" | "edit" | "delete";

export async function requireUser() {
  const user = await currentUser();
  if (!user) return { user: null, response: NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 }) };
  return { user, response: null };
}

export async function requireModule(moduleCode: string, permission: Permission = "view") {
  const user = await currentUser();
  if (!user) return { user: null, response: NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 }) };
  const allowed = user.userRoles.some(ur => ur.role.roleModules.some(rm =>
    rm.moduleCode === moduleCode && (
      permission === "view" ? rm.canView :
      permission === "create" ? rm.canCreate :
      permission === "edit" ? rm.canEdit : rm.canDelete
    )
  ));
  if (!allowed) return { user: null, response: NextResponse.json({ error: "Keine Berechtigung für dieses Modul." }, { status: 403 }) };
  return { user, response: null };
}

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}
