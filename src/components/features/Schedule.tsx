"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Class } from "@/types";

interface ClassWithInstructor extends Class {
  name: string;
  instructor?: { name: string };
}

type ScheduleProps = {
  classes: any[];
  isInstructor: boolean;
};

const DAYS = ["월", "화", "수", "목", "금"];
const START_HOUR = 8;
const END_HOUR = 22;
const SLOT_MINUTES = 10;
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * (60 / SLOT_MINUTES);

function timeToSlot(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h - START_HOUR) * (60 / SLOT_MINUTES) + m / SLOT_MINUTES;
}

function slotToTime(slot: number): string {
  const totalMinutes = START_HOUR * 60 + slot * SLOT_MINUTES;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

interface ScheduleBlock {
  classId: string;
  className: string;
  instructorName: string;
  dayOfWeek: number;
  startSlot: number;
  endSlot: number;
  columnIndex: number;
  maxColumns: number;
}

function getScheduleBlocks(classes: any[]): ScheduleBlock[] {
  const blocks: ScheduleBlock[] = [];
  const dayColumns: Map<number, ScheduleBlock[][]> = new Map();

  for (let day = 0; day < 5; day++) {
    dayColumns.set(day, []);
  }

  for (const cls of classes) {
    if (
      cls.day_of_week === null ||
      cls.start_time === null ||
      cls.end_time === null
    ) {
      continue;
    }

    const startSlot = timeToSlot(cls.start_time);
    const endSlot = timeToSlot(cls.end_time);
    const day = cls.day_of_week;

    const block: ScheduleBlock = {
      classId: cls.id,
      className: cls.name,
      instructorName: cls.instructor?.name || "",
      dayOfWeek: day,
      startSlot,
      endSlot,
      columnIndex: 0,
      maxColumns: 1,
    };

    const dayBlocks = dayColumns.get(day) || [];
    let columnIndex = 0;

    for (const existingColumn of dayBlocks) {
      let canPlaceInColumn = true;
      for (const existingBlock of existingColumn) {
        if (
          startSlot < existingBlock.endSlot &&
          endSlot > existingBlock.startSlot
        ) {
          canPlaceInColumn = false;
          break;
        }
      }
      if (canPlaceInColumn) {
        existingColumn.push(block);
        block.columnIndex = columnIndex;
        block.maxColumns = Math.max(block.maxColumns, dayBlocks.length);
        for (const col of dayBlocks) {
          for (const b of col) {
            b.maxColumns = Math.max(b.maxColumns, dayBlocks.length);
          }
        }
        break;
      }
      columnIndex++;
    }

    if (columnIndex >= dayBlocks.length) {
      dayBlocks.push([block]);
      block.columnIndex = columnIndex;
      block.maxColumns = dayBlocks.length;
    }

    dayColumns.set(day, dayBlocks);
    blocks.push(block);
  }

  return blocks;
}

export default function Schedule({ classes, isInstructor }: ScheduleProps) {
  const router = useRouter();
  const blocks = getScheduleBlocks(classes);

  if (blocks.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
        등록된 수업이 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <div className="min-w-max">
        <div
          className="grid bg-card"
          style={{ gridTemplateColumns: "60px repeat(5, 1fr)" }}
        >
          <div className="border-b border-r border-border bg-muted p-2 text-center text-xs font-semibold">
            시간
          </div>
          {DAYS.map((day) => (
            <div
              key={day}
              className="border-b border-r border-border bg-muted p-2 text-center text-xs font-semibold"
            >
              {day}
            </div>
          ))}

          {Array.from({ length: TOTAL_SLOTS }).map((_, slotIdx) => {
            const time = slotToTime(slotIdx);
            const showTimeLabel = slotIdx % 6 === 0;

            return (
              <div
                key={`time-${slotIdx}`}
                className={`border-b border-r border-border p-1 text-center text-xs ${
                  slotIdx % 6 === 0 ? "bg-muted" : "bg-background"
                }`}
                style={{ height: "20px" }}
              >
                {showTimeLabel && (
                  <span className="text-muted-foreground">{time}</span>
                )}
              </div>
            );
          })}

          {Array.from({ length: TOTAL_SLOTS }).map((_, slotIdx) => {
            return DAYS.map((_, dayIdx) => {
              const dayBlocks = blocks.filter((b) => b.dayOfWeek === dayIdx);
              const overlappingBlocks = dayBlocks.filter(
                (b) => b.startSlot <= slotIdx && b.endSlot > slotIdx,
              );

              return (
                <div
                  key={`cell-${dayIdx}-${slotIdx}`}
                  className="border-b border-r border-border bg-background"
                  style={{ height: "20px", position: "relative" }}
                />
              );
            });
          })}
        </div>
      </div>

      <div className="space-y-2 p-4">
        {blocks.map((block) => (
          <Link
            key={block.classId}
            href={`/classes/${block.classId}`}
            className="block rounded-md border border-border bg-primary p-3 text-primary-foreground transition-all hover:shadow-md cursor-pointer"
          >
            <div className="font-medium">{block.className}</div>
            {!isInstructor && block.instructorName && (
              <div className="text-sm">{block.instructorName}</div>
            )}
            <div className="text-sm">
              {DAYS[block.dayOfWeek]} {slotToTime(block.startSlot)}-
              {slotToTime(block.endSlot)}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
