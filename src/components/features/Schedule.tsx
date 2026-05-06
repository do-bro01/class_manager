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
const START_HOUR = 9;
const END_HOUR = 18;
const COLORS = [
  "bg-muted border-border text-foreground",
  "bg-muted border-border text-foreground",
];

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToHour(minutes: number): number {
  return minutes / 60;
}

interface ScheduleBlock {
  classId: string;
  className: string;
  instructorName: string;
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
  colorIndex: number;
  columnIndex: number;
  maxColumns: number;
}

function getScheduleBlocks(classes: any[]): ScheduleBlock[] {
  const blocks: ScheduleBlock[] = [];
  const dayColumns: Map<number, ScheduleBlock[][]> = new Map();

  for (let day = 0; day < 5; day++) {
    dayColumns.set(day, []);
  }

  for (let i = 0; i < classes.length; i++) {
    const cls = classes[i];
    if (
      cls.day_of_week === null ||
      cls.start_time === null ||
      cls.end_time === null
    ) {
      continue;
    }

    const startMinutes = timeToMinutes(cls.start_time);
    const endMinutes = timeToMinutes(cls.end_time);
    const day = cls.day_of_week;

    const block: ScheduleBlock = {
      classId: cls.id,
      className: cls.name,
      instructorName: cls.instructor?.name || "",
      dayOfWeek: day,
      startMinutes,
      endMinutes,
      colorIndex: i % COLORS.length,
      columnIndex: 0,
      maxColumns: 1,
    };

    const dayBlocks = dayColumns.get(day) || [];
    let columnIndex = 0;

    for (const existingColumn of dayBlocks) {
      let canPlaceInColumn = true;
      for (const existingBlock of existingColumn) {
        if (
          startMinutes < existingBlock.endMinutes &&
          endMinutes > existingBlock.startMinutes
        ) {
          canPlaceInColumn = false;
          break;
        }
      }
      if (canPlaceInColumn) {
        existingColumn.push(block);
        block.columnIndex = columnIndex;
        block.maxColumns = dayBlocks.length;
        for (const col of dayBlocks) {
          for (const b of col) {
            b.maxColumns = dayBlocks.length;
          }
        }
        dayColumns.set(day, dayBlocks);
        blocks.push(block);
        break;
      }
      columnIndex++;
    }

    if (columnIndex >= dayBlocks.length) {
      dayBlocks.push([block]);
      block.columnIndex = columnIndex;
      block.maxColumns = dayBlocks.length;
      dayColumns.set(day, dayBlocks);
      blocks.push(block);
    }
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

  const hours = Array.from(
    { length: END_HOUR - START_HOUR },
    (_, i) => START_HOUR + i,
  );
  const SLOTS_PER_HOUR = 6; // 10분 단위

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <div className="bg-card inline-block min-w-full">
        <div
          className="grid gap-0 relative"
          style={{
            gridTemplateColumns: "60px repeat(5, minmax(120px, 1fr))",
            gridTemplateRows: `auto repeat(${(END_HOUR - START_HOUR) * SLOTS_PER_HOUR}, 10px)`,
          }}
        >
          {/* Header row */}
          <div className="border-b border-r border-border bg-muted p-2 text-center text-xs font-semibold" />
          {DAYS.map((day) => (
            <div
              key={day}
              className="border-b border-r border-border bg-muted p-2 text-center text-xs font-bold"
            >
              {day}
            </div>
          ))}

          {/* Time rows and cells */}
          {hours.map((hour, hourIdx) => (
            <div key={`row-${hour}`} style={{ display: "contents" }}>
              {/* Time label */}
              <div
                className="border-b border-r border-border bg-muted p-2 text-center text-sm font-bold"
                style={{
                  gridColumn: 1,
                  gridRow: `${hourIdx * SLOTS_PER_HOUR + 2} / span ${SLOTS_PER_HOUR}`,
                }}
              >
                {hour}
              </div>

              {/* Day cells */}
              {DAYS.map((_, dayIdx) => (
                <div
                  key={`cell-${dayIdx}-${hour}`}
                  className="border-b border-r border-border bg-background"
                  style={{
                    gridColumn: dayIdx + 2,
                    gridRow: `${hourIdx * SLOTS_PER_HOUR + 2} / span ${SLOTS_PER_HOUR}`,
                  }}
                />
              ))}
            </div>
          ))}

          {/* Class blocks */}
          {blocks.map((block) => {
            const startMinutesFromStart = block.startMinutes - START_HOUR * 60;
            const endMinutesFromStart = block.endMinutes - START_HOUR * 60;

            const startSlot = Math.floor(startMinutesFromStart / 10);
            const endSlot = Math.ceil(endMinutesFromStart / 10);

            const startRow = startSlot + 2;
            const endRow = endSlot + 2;
            const colStart = block.dayOfWeek + 2;

            const startTimeStr = `${String(Math.floor(block.startMinutes / 60)).padStart(2, "0")}:${String(block.startMinutes % 60).padStart(2, "0")}`;
            const endTimeStr = `${String(Math.floor(block.endMinutes / 60)).padStart(2, "0")}:${String(block.endMinutes % 60).padStart(2, "0")}`;

            return (
              <Link
                key={`${block.classId}`}
                href={`/classes/${block.classId}`}
                className={`border-2 border-current rounded px-2 py-1 text-xs ${
                  COLORS[block.colorIndex]
                } hover:shadow-md transition-shadow cursor-pointer flex flex-col overflow-hidden`}
                style={{
                  gridColumn: `${colStart} / span 1`,
                  gridRow: `${startRow} / ${endRow}`,
                  zIndex: block.columnIndex,
                  marginLeft: `${(block.columnIndex / block.maxColumns) * 100}%`,
                  width: `${(1 / block.maxColumns) * 100}%`,
                }}
              >
                <div className="font-bold truncate">
                  {block.className}
                </div>
                <div className="text-xs truncate">
                  {startTimeStr}~{endTimeStr}
                </div>
                {!isInstructor && block.instructorName && (
                  <div className="text-xs truncate">
                    {block.instructorName}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
