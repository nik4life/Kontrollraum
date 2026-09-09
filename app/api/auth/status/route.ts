import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { currentUser } from "../../../../lib/auth";

export async function GET() {
  const [count, user] = await Promise.all([db.user.count(), currentUser()]);
  return NextResponse.json({ installed: count > 0, user: user ? { id: user.id, fullName: user.fullName, email: user.email, company: user.company } : null });
}
