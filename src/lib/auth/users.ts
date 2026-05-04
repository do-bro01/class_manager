import { createClient } from "@/lib/supabase/server";

export async function getClassMemberEmails(
  classId: string,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_class_member_emails", {
    p_class_id: classId,
  });
  if (error) {
    console.error("[getClassMemberEmails] RPC error:", error);
    return map;
  }
  if (!data) {
    console.warn("[getClassMemberEmails] RPC returned no data");
    return map;
  }
  for (const row of data as { user_id: string; email: string }[]) {
    map.set(row.user_id, row.email ?? "");
  }
  return map;
}
