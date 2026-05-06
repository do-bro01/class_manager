"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isInstructor } from "@/lib/auth/role";
import type { ActionResult, Class } from "@/types";

function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

async function requireInstructor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isInstructor(user)) {
    throw new Error("권한이 없습니다.");
  }
  return { supabase, user };
}

export async function createClass(
  formData: FormData,
): Promise<ActionResult<Class>> {
  try {
    const { supabase, user } = await requireInstructor();

    const name = (formData.get("name") as string).trim();
    const institution = (formData.get("institution") as string).trim();
    const start_date = formData.get("start_date") as string | null;
    const end_date = formData.get("end_date") as string | null;
    const day_of_week_str = formData.get("day_of_week") as string | null;
    const start_time = formData.get("start_time") as string | null;
    const end_time = formData.get("end_time") as string | null;

    if (!name || !institution) {
      return { success: false, error: "과목명과 기관명은 필수입니다." };
    }
    if (start_date && end_date && start_date > end_date) {
      return { success: false, error: "시작일이 종료일보다 늦을 수 없습니다." };
    }

    const day_of_week = day_of_week_str ? parseInt(day_of_week_str) : null;

    if (day_of_week !== null && (start_time || end_time)) {
      if (!start_time || !end_time) {
        return {
          success: false,
          error: "시작 시간과 종료 시간을 모두 입력해주세요.",
        };
      }

      const { data: existingClasses, error: fetchError } = await supabase
        .from("classes")
        .select("id, day_of_week, start_time, end_time")
        .eq("instructor_id", user.id);

      if (fetchError) return { success: false, error: fetchError.message };

      for (const cls of existingClasses || []) {
        if (
          cls.day_of_week === day_of_week &&
          cls.start_time &&
          cls.end_time &&
          cls.start_time < end_time &&
          cls.end_time > start_time
        ) {
          return { success: false, error: "이 시간대에 이미 수업이 있습니다." };
        }
      }
    }

    const invite_code = generateInviteCode();

    const { data, error } = await supabase
      .from("classes")
      .insert({
        name,
        institution,
        invite_code,
        instructor_id: user.id,
        start_date: start_date || null,
        end_date: end_date || null,
        day_of_week,
        start_time: start_time || null,
        end_time: end_time || null,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard");
    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function updateClass(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireInstructor();

    const name = (formData.get("name") as string).trim();
    const institution = (formData.get("institution") as string).trim();
    const start_date = formData.get("start_date") as string | null;
    const end_date = formData.get("end_date") as string | null;
    const day_of_week_str = formData.get("day_of_week") as string | null;
    const start_time = formData.get("start_time") as string | null;
    const end_time = formData.get("end_time") as string | null;

    if (!name || !institution) {
      return { success: false, error: "과목명과 기관명은 필수입니다." };
    }
    if (start_date && end_date && start_date > end_date) {
      return { success: false, error: "시작일이 종료일보다 늦을 수 없습니다." };
    }

    const day_of_week = day_of_week_str ? parseInt(day_of_week_str) : null;

    if (day_of_week !== null && (start_time || end_time)) {
      if (!start_time || !end_time) {
        return {
          success: false,
          error: "시작 시간과 종료 시간을 모두 입력해주세요.",
        };
      }

      const { data: existingClasses, error: fetchError } = await supabase
        .from("classes")
        .select("id, day_of_week, start_time, end_time")
        .eq("instructor_id", user.id);

      if (fetchError) return { success: false, error: fetchError.message };

      for (const cls of existingClasses || []) {
        if (
          cls.id !== id &&
          cls.day_of_week === day_of_week &&
          cls.start_time &&
          cls.end_time &&
          cls.start_time < end_time &&
          cls.end_time > start_time
        ) {
          return { success: false, error: "이 시간대에 이미 수업이 있습니다." };
        }
      }
    }

    const { error } = await supabase
      .from("classes")
      .update({
        name,
        institution,
        start_date: start_date || null,
        end_date: end_date || null,
        day_of_week,
        start_time: start_time || null,
        end_time: end_time || null,
      })
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/classes/${id}`);
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function deleteClass(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireInstructor();

    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function getClasses(): Promise<Class[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("classes")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getClass(id: string): Promise<Class | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("classes")
    .select("*")
    .eq("id", id)
    .single();
  return data;
}
