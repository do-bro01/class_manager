"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClass, updateClass } from "@/lib/actions/class";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Class } from "@/types";

const DAYS = ["월", "화", "수", "목", "금"];
const HOURS = Array.from({ length: 18 }, (_, i) => i); // 0-17시
const MINUTES = [0, 10, 20, 30, 40, 50]; // 10분 단위

type Props = {
  cls?: Class;
};

function timeStringToHourMinute(timeStr: string): [number, number] {
  if (!timeStr) return [9, 0];
  const [h, m] = timeStr.split(":").map(Number);
  return [h, m];
}

function hourMinuteToTimeString(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export default function ClassForm({ cls }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(
    cls?.day_of_week ?? null,
  );

  const [startHour, startMinute] = timeStringToHourMinute(cls?.start_time ?? "");
  const [endHour, endMinute] = timeStringToHourMinute(cls?.end_time ?? "");

  const [selectedStartHour, setSelectedStartHour] = useState(startHour);
  const [selectedStartMinute, setSelectedStartMinute] = useState(startMinute);
  const [selectedEndHour, setSelectedEndHour] = useState(endHour);
  const [selectedEndMinute, setSelectedEndMinute] = useState(endMinute);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    if (selectedDay !== null) {
      formData.append("day_of_week", selectedDay.toString());
    }

    formData.set(
      "start_time",
      hourMinuteToTimeString(selectedStartHour, selectedStartMinute),
    );
    formData.set(
      "end_time",
      hourMinuteToTimeString(selectedEndHour, selectedEndMinute),
    );

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
          {DAYS.map((day, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedDay(selectedDay === idx ? null : idx)}
              className={`px-3 py-2 rounded-md font-medium transition-colors ${
                selectedDay === idx
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-primary/20"
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>시작 시간</Label>
          <div className="flex gap-2">
            <select
              value={selectedStartHour}
              onChange={(e) => setSelectedStartHour(Number(e.target.value))}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2"
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}
                </option>
              ))}
            </select>
            <select
              value={selectedStartMinute}
              onChange={(e) => setSelectedStartMinute(Number(e.target.value))}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2"
            >
              {MINUTES.map((m) => (
                <option key={m} value={m}>
                  {String(m).padStart(2, "0")}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>종료 시간</Label>
          <div className="flex gap-2">
            <select
              value={selectedEndHour}
              onChange={(e) => setSelectedEndHour(Number(e.target.value))}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2"
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}
                </option>
              ))}
            </select>
            <select
              value={selectedEndMinute}
              onChange={(e) => setSelectedEndMinute(Number(e.target.value))}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2"
            >
              {MINUTES.map((m) => (
                <option key={m} value={m}>
                  {String(m).padStart(2, "0")}
                </option>
              ))}
            </select>
          </div>
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
