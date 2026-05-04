"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const name = formData.get("name") as string;

  const { error } = await supabase.auth.updateUser({ data: { name } });
  if (error) throw new Error(error.message);

  redirect("/settings");
}

export async function changeRole() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.auth.updateUser({
    data: { role: "instructor" },
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect("/settings");
}
