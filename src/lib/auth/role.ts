import type { User } from "@supabase/supabase-js";

export type UserRole = "student" | "instructor";

export function getUserRole(user: User | null | undefined): UserRole {
  const role = user?.app_metadata?.role ?? user?.user_metadata?.role;
  return role === "instructor" ? "instructor" : "student";
}

export function isInstructor(user: User | null | undefined) {
  return getUserRole(user) === "instructor";
}
