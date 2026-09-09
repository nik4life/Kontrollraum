import { NextResponse } from "next/server";
import { currentUser } from "./auth";

export async function requireUser() {
  const user = await currentUser();
  if (!user) return { user: null, response: NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 }) };
  return { user, response: null };
}

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}
