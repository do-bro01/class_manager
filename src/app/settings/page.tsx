import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/layout/Header";
import { createClient } from "@/lib/supabase/server";
import { updateProfile, changeRole } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { User } from "@supabase/supabase-js";

function getMetadataValue(user: User, key: string) {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const value = metadata?.[key];
  return typeof value === "string" ? value : "";
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role =
    user.app_metadata?.role ?? getMetadataValue(user, "role") ?? "student";
  const name = getMetadataValue(user, "name");

  return (
    <div className="min-h-screen flex flex-col">
      <Header user={user} />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">설정</h1>
          <Link href="/dashboard">
            <Button variant="outline">대시보드로</Button>
          </Link>
        </div>

        <section className="space-y-4 mb-6">
          <h2 className="text-lg font-medium">계정 정보</h2>
          <p className="text-sm text-muted-foreground">이메일: {user.email}</p>
          <p className="text-sm text-muted-foreground">
            현재 역할: {role === "instructor" ? "교수" : "수강생"}
          </p>
        </section>

        <section className="space-y-4 mb-6">
          <h2 className="text-lg font-medium">프로필 수정</h2>
          <form action={updateProfile} className="space-y-3 max-w-md">
            <div>
              <Label htmlFor="name">이름</Label>
              <Input id="name" name="name" defaultValue={name} />
            </div>
            <Button type="submit">프로필 저장</Button>
          </form>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium">권한</h2>
          {role === "instructor" ? (
            <p className="text-sm">이미 교수 권한을 보유하고 있습니다.</p>
          ) : (
            <form action={changeRole} className="space-y-3">
              <p className="text-sm text-muted-foreground">
                교수로 신청하면 관리자가 app_metadata에 역할을 부여합니다.
              </p>
              <Button type="submit">교수로 신청</Button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
