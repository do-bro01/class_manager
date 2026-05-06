"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClass, updateClass } from "@/lib/actions/class";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Class } from "@/types";

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const SELECTABLE_DAYS = [0, 1, 2, 3, 4]; // Mon-Fri

type Props = {
  cls?: Class;
};

export default function ClassForm({ cls }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(cls?.day_of_week ?? null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    if (selectedDay !== null) {
      formData.append("day_of_week", selectedDay.toString());
    }

    const result = cls
      ? await updateClass(cls.id, formData)
      : await createClass(formData);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (!cls && result.success) {
      const created = (result as { success: true; data: Class }).data;
      router.push(`/classes/${created.id}`);
    } else {
      router.push(`/classes/${cls!.id}`);
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="institution">기관명 *</Label>
        <Input
          id="institution"
          name="institution"
          placeholder="예: 강남대학교"
          defaultValue={cls?.institution}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">과목명 *</Label>
        <Input
          id="name"
          name="name"
          placeholder="예: 웹 프로그래밍 기초"
          defaultValue={cls?.name}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>요일 *</Label>
        <div className="flex gap-2 flex-wrap">
          {DAYS.map((day, idx) => {
            const isSelectable = SELECTABLE_DAYS.includes(idx);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => isSelectable && setSelectedDay(selectedDay === idx ? null : idx)}
                disabled={!isSelectable}
                className={`px-3 py-2 rounded-md font-medium transition-colors ${
                  isSelectable
                    ? selectedDay === idx
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-primary/20"
                    : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_time">시작 시간</Label>
          <Input
            id="start_time"
            name="start_time"
            type="time"
            step="600"
            defaultValue={cls?.start_time ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_time">종료 시간</Label>
          <Input
            id="end_time"
            name="end_time"
            type="time"
            step="600"
            defaultValue={cls?.end_time ?? ""}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_date">시작일</Label>
          <Input
            id="start_date"
            name="start_date"
            type="date"
            defaultValue={cls?.start_date ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_date">종료일</Label>
          <Input
            id="end_date"
            name="end_date"
            type="date"
            defaultValue={cls?.end_date ?? ""}
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "저장 중..." : cls ? "수정 완료" : "수업 만들기"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          취소
        </Button>
      </div>
    </form>
  );
}
