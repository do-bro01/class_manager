import { createClient } from "@/lib/supabase/server";

export type ClassMember = { email: string; name: string };
export type InstructorProfile = {
  user_id: string;
  email: string;
  name: string;
};

export async function getClassMembers(
  classId: string,
): Promise<Map<string, ClassMember>> {
  const map = new Map<string, ClassMember>();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_class_members", {
    p_class_id: classId,
  });
  if (error || !data) return map;
  for (const row of data as { user_id: string; email: string; name: string }[]) {
    map.set(row.user_id, {
      email: row.email ?? "",
      name: row.name ?? "",
    });
  }
  return map;
}

export async function getClassInstructor(
  classId: string,
): Promise<InstructorProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_class_instructor", {
    p_class_id: classId,
  });
  if (error || !data || (data as unknown[]).length === 0) return null;
  const row = (data as { user_id: string; email: string; name: string }[])[0];
  return {
    user_id: row.user_id,
    email: row.email ?? "",
    name: row.name ?? "",
  };
}
