"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isInstructor } from "@/lib/auth/role";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/layout/ThemeToggle";
import type { User } from "@supabase/supabase-js";

export default function Header({ user }: { user: User }) {
  const router = useRouter();
  const isInstructorUser = isInstructor(user);
  const name =
    typeof user.user_metadata?.name === "string" ? user.user_metadata.name : "";
  const displayLabel = name ? `${name} (${user.email})` : user.email;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b bg-background sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="font-semibold text-base hover:opacity-80 transition-opacity"
        >
          수업 관리
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="text-sm text-muted-foreground hidden sm:block hover:underline"
          >
            설정
          </Link>
          <span className="text-sm text-muted-foreground hidden sm:block">
            {isInstructorUser ? "교수" : "수강생"} · {displayLabel}
          </span>
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            로그아웃
          </Button>
        </div>
      </div>
    </header>
  );
}
