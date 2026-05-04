"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const name = formData.get("name") as string;

  const { error } = await supabase.auth.updateUser({ data: { name } });
  if (error) return { error: error.message };

  return { success: "프로필이 업데이트되었습니다." };
}

export async function changeRole() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  try {
    const admin = createAdminClient();
    await admin.auth.admin.updateUserById(user.id, {
      app_metadata: { role: "instructor" },
    });
    return {
      success:
        "강사 권한 요청이 완료되었습니다. 권한 반영에 시간이 걸릴 수 있습니다.",
    };
  } catch (err) {
    return { error: "권한 요청 중 문제가 발생했습니다." };
  }
}
