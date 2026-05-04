"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = (formData.get("role") as string) || "student";

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message };
  }

  // try to set app_metadata via service role admin client so role is available in JWT
  try {
    const userId = data?.user?.id;
    if (userId && role) {
      const admin = createAdminClient();
      await admin.auth.admin.updateUserById(userId, { app_metadata: { role } });
    }
  } catch (err) {
    // ignore admin errors (service key may not be configured in dev)
  }

  return {
    success:
      "가입 확인 이메일이 발송되었습니다. 이메일을 인증한 후 로그인해주세요.",
  };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export function isInstructor(
  user: { app_metadata?: { role?: string } } | null,
) {
  return user?.app_metadata?.role === "instructor";
}
