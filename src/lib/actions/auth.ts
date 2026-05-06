"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isInstructor as hasInstructorRole } from "@/lib/auth/role";
import type { User } from "@supabase/supabase-js";

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

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role } },
  });

  if (error) {
    return { error: error.message };
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

export function isInstructor(user: User | null) {
  return hasInstructorRole(user);
}
