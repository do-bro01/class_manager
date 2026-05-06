"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isInstructor } from "@/lib/auth/role";
import { getClassMembers } from "@/lib/auth/users";
import type { ActionResult, EnrollmentWithEmail } from "@/types";

export async function joinClassByCode(code: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "로그인이 필요합니다." };

  const trimmedCode = code.trim().toUpperCase();
  if (!trimmedCode)
    return { success: false, error: "초대 코드를 입력해주세요." };

  const { data: cls } = await supabase
    .from("classes")
    .select("id, day_of_week, start_time, end_time")
    .eq("invite_code", trimmedCode)
    .single();

  if (!cls) return { success: false, error: "유효하지 않은 초대 코드입니다." };

  const { data: existing } = await supabase
    .from("enrollments")
    .select("id")
    .eq("class_id", cls.id)
    .eq("user_id", user.id)
    .single();

  if (existing) return { success: false, error: "이미 등록된 수업입니다." };

  if (cls.day_of_week !== null && cls.start_time && cls.end_time) {
    const { data: enrolledClasses } = await supabase
      .from("enrollments")
      .select("classes(id, day_of_week, start_time, end_time)")
      .eq("user_id", user.id)
      .eq("status", "active");

    if (enrolledClasses) {
      for (const enrollment of enrolledClasses) {
        const enrolledCls = (enrollment as any).classes;
        if (
          enrolledCls &&
          enrolledCls.day_of_week === cls.day_of_week &&
          enrolledCls.start_time &&
          enrolledCls.end_time &&
          enrolledCls.start_time < cls.end_time &&
          enrolledCls.end_time > cls.start_time
        ) {
          return {
            success: false,
            error: "참여한 다른 수업과 시간이 겹칩니다.",
          };
        }
      }
    }
  }

  const { error } = await supabase.from("enrollments").insert({
    class_id: cls.id,
    user_id: user.id,
    status: "active",
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/dashboard");
  return { success: true, data: undefined };
}

export async function updateEnrollmentStatus(
  enrollmentId: string,
  status: "active" | "inactive",
  classId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isInstructor(user)) {
    return { success: false, error: "권한이 없습니다." };
  }

  const { error } = await supabase
    .from("enrollments")
    .update({ status })
    .eq("id", enrollmentId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/classes/${classId}`);
  return { success: true, data: undefined };
}

export async function getEnrollments(
  classId: string,
): Promise<EnrollmentWithEmail[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("enrollments")
    .select("id, class_id, user_id, status, enrolled_at")
    .eq("class_id", classId)
    .order("enrolled_at", { ascending: false });

  if (error || !data) return [];

  const memberMap = await getClassMembers(classId);

  return data.map((row) => {
    const m = memberMap.get(row.user_id);
    return {
      id: row.id,
      class_id: row.class_id,
      user_id: row.user_id,
      status: row.status,
      enrolled_at: row.enrolled_at,
      email: m?.email ?? "",
      name: m?.name ?? "",
    };
  });
}

export async function getEnrolledClasses() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("enrollments")
    .select("*, classes(*)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("enrolled_at", { ascending: false });

  return data ?? [];
}
