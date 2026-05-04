import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, role } = body;
    if (!userId || !role)
      return NextResponse.json({ error: "invalid" }, { status: 400 });

    const admin = createAdminClient();
    await admin.auth.admin.updateUserById(userId, { app_metadata: { role } });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
