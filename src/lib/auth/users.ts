import { createAdminClient } from "@/lib/supabase/admin";

export async function getEmailsByUserIds(
  userIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (userIds.length === 0) return map;

  const admin = createAdminClient();
  const unique = Array.from(new Set(userIds));
  const results = await Promise.all(
    unique.map((id) => admin.auth.admin.getUserById(id)),
  );
  for (let i = 0; i < unique.length; i++) {
    const email = results[i].data.user?.email ?? "";
    map.set(unique[i], email);
  }
  return map;
}
