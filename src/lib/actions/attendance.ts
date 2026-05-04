"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isInstructor } from "@/lib/auth/role";
import { getEmailsByUserIds } from "@/lib/auth/users";
import type {
  ActionResult,
  AttendanceSession,
  AttendanceSessionWithStats,
  AttendanceStatus,
  SessionRosterRow,
  StudentAttendanceSummary,
  StudentSessionRow,
} from "@/types";

const ATTENDANCE_STATUSES: AttendanceStatus[] = [
  "present",
  "late",
  "absent",
  "excused",
];

async function requireInstructorOfClass(classId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isInstructor(user)) {
    throw new Error("권한이 없습니다.");
  }
  const { data: cls } = await supabase
    .from("classes")
    .select("id, instructor_id")
    .eq("id", classId)
    .single();
  if (!cls || cls.instructor_id !== user.id) {
    throw new Error("해당 수업의 강사가 아닙니다.");
  }
  return { supabase, user };
}

async function getSessionWithClass(sessionId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("attendance_sessions")
    .select("id, class_id, check_in_open")
    .eq("id", sessionId)
    .single();
  return { supabase, session: data };
}

// ============================================================
// 회차(session) 관리 — 강사 전용
// ============================================================

export async function createSession(
  classId: string,
  formData: FormData,
): Promise<ActionResult<AttendanceSession>> {
  try {
    const { supabase } = await requireInstructorOfClass(classId);

    const title = (formData.get("title") as string)?.trim();
    const session_date = formData.get("session_date") as string;

    if (!title) return { success: false, error: "회차 제목을 입력해주세요." };
    if (!session_date)
      return { success: false, error: "회차 날짜를 선택해주세요." };

    const { data, error } = await supabase
      .from("attendance_sessions")
      .insert({ class_id: classId, title, session_date, check_in_open: false })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath(`/classes/${classId}`);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function createRecurringSessions(
  classId: string,
  params: {
    startDate: string;
    weekdays: number[];
    weeks: number;
    titlePrefix: string;
  },
): Promise<ActionResult<{ count: number }>> {
  try {
    const { supabase } = await requireInstructorOfClass(classId);

    const { startDate, weekdays, weeks, titlePrefix } = params;
    const trimmedPrefix = titlePrefix.trim();

    if (!startDate)
      return { success: false, error: "시작일을 선택해주세요." };
    if (!Array.isArray(weekdays) || weekdays.length === 0)
      return { success: false, error: "요일을 1개 이상 선택해주세요." };
    if (!weeks || weeks < 1 || weeks > 52)
      return { success: false, error: "주차 수는 1~52 사이여야 합니다." };
    if (!trimmedPrefix)
      return { success: false, error: "제목 접두사를 입력해주세요." };
    for (const w of weekdays) {
      if (!Number.isInteger(w) || w < 0 || w > 6)
        return { success: false, error: "요일 값이 올바르지 않습니다." };
    }

    const start = new Date(`${startDate}T00:00:00`);
    if (Number.isNaN(start.getTime()))
      return { success: false, error: "시작일이 올바르지 않습니다." };

    const sortedWeekdays = [...new Set(weekdays)].sort((a, b) => a - b);
    const startDow = start.getDay();

    const sessionsToInsert: {
      class_id: string;
      title: string;
      session_date: string;
      check_in_open: boolean;
    }[] = [];

    for (let week = 0; week < weeks; week++) {
      let occurrenceInWeek = 0;
      for (const dow of sortedWeekdays) {
        const offset = (dow - startDow + 7) % 7 + week * 7;
        const date = new Date(start);
        date.setDate(start.getDate() + offset);
        const iso = date.toISOString().slice(0, 10);
        const suffix =
          sortedWeekdays.length > 1 ? `-${occurrenceInWeek + 1}` : "";
        sessionsToInsert.push({
          class_id: classId,
          title: `${trimmedPrefix} ${week + 1}주차${suffix}`,
          session_date: iso,
          check_in_open: false,
        });
        occurrenceInWeek++;
      }
    }

    const { error } = await supabase
      .from("attendance_sessions")
      .insert(sessionsToInsert);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/classes/${classId}`);
    return { success: true, data: { count: sessionsToInsert.length } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function updateSession(
  sessionId: string,
  classId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireInstructorOfClass(classId);

    const title = (formData.get("title") as string)?.trim();
    const session_date = formData.get("session_date") as string;

    if (!title) return { success: false, error: "회차 제목을 입력해주세요." };
    if (!session_date)
      return { success: false, error: "회차 날짜를 선택해주세요." };

    const { error } = await supabase
      .from("attendance_sessions")
      .update({ title, session_date })
      .eq("id", sessionId)
      .eq("class_id", classId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/classes/${classId}`);
    revalidatePath(`/classes/${classId}/attendance/${sessionId}`);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function deleteSession(
  sessionId: string,
  classId: string,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireInstructorOfClass(classId);

    const { error } = await supabase
      .from("attendance_sessions")
      .delete()
      .eq("id", sessionId)
      .eq("class_id", classId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/classes/${classId}`);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function toggleCheckInOpen(
  sessionId: string,
  classId: string,
  open: boolean,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireInstructorOfClass(classId);

    const { error } = await supabase
      .from("attendance_sessions")
      .update({ check_in_open: open })
      .eq("id", sessionId)
      .eq("class_id", classId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/classes/${classId}`);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ============================================================
// 출결 표기 — 강사 일괄 입력 / 수강생 자가 체크인
// ============================================================

export async function markAttendance(
  sessionId: string,
  classId: string,
  marks: { user_id: string; status: AttendanceStatus | null }[],
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireInstructorOfClass(classId);

    // 안전장치: session_id가 정말 이 수업에 속하는지 확인
    const { data: session } = await supabase
      .from("attendance_sessions")
      .select("id, class_id")
      .eq("id", sessionId)
      .eq("class_id", classId)
      .single();
    if (!session) return { success: false, error: "회차를 찾을 수 없습니다." };

    const upserts = marks.filter((m) => m.status !== null);
    const deletions = marks
      .filter((m) => m.status === null)
      .map((m) => m.user_id);

    // 잘못된 status가 들어오면 거부 (방어적)
    for (const m of upserts) {
      if (!ATTENDANCE_STATUSES.includes(m.status as AttendanceStatus)) {
        return { success: false, error: `허용되지 않는 상태: ${m.status}` };
      }
    }

    if (upserts.length > 0) {
      const { error } = await supabase.from("attendance_records").upsert(
        upserts.map((m) => ({
          session_id: sessionId,
          user_id: m.user_id,
          status: m.status as AttendanceStatus,
          marked_by: user.id,
          marked_at: new Date().toISOString(),
        })),
        { onConflict: "session_id,user_id" },
      );
      if (error) return { success: false, error: error.message };
    }

    if (deletions.length > 0) {
      const { error } = await supabase
        .from("attendance_records")
        .delete()
        .eq("session_id", sessionId)
        .in("user_id", deletions);
      if (error) return { success: false, error: error.message };
    }

    revalidatePath(`/classes/${classId}`);
    revalidatePath(`/classes/${classId}/attendance/${sessionId}`);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function selfCheckIn(sessionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "로그인이 필요합니다." };

  const { session } = await getSessionWithClass(sessionId);
  if (!session) return { success: false, error: "회차를 찾을 수 없습니다." };
  if (!session.check_in_open) {
    return {
      success: false,
      error: "체크인이 닫혀 있습니다. 강사에게 문의하세요.",
    };
  }

  const { data: existing } = await supabase
    .from("attendance_records")
    .select("id, status")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) {
    return { success: false, error: "이미 출결이 기록되어 있습니다." };
  }

  const { error } = await supabase.from("attendance_records").insert({
    session_id: sessionId,
    user_id: user.id,
    status: "present",
    marked_by: user.id,
    marked_at: new Date().toISOString(),
  });

  if (error) return { success: false, error: error.message };

  revalidatePath(`/classes/${session.class_id}`);
  return { success: true, data: undefined };
}

// ============================================================
// 조회
// ============================================================

export async function getSessionsWithStats(
  classId: string,
): Promise<AttendanceSessionWithStats[]> {
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from("attendance_sessions")
    .select("*")
    .eq("class_id", classId)
    .order("session_date", { ascending: false });

  if (!sessions || sessions.length === 0) return [];

  const sessionIds = sessions.map((s) => s.id);

  const { data: records } = await supabase
    .from("attendance_records")
    .select("session_id, status")
    .in("session_id", sessionIds);

  const { count: activeCount } = await supabase
    .from("enrollments")
    .select("*", { count: "exact", head: true })
    .eq("class_id", classId)
    .eq("status", "active");
  const totalStudents = activeCount ?? 0;

  const recordsBySession = new Map<string, { status: AttendanceStatus }[]>();
  for (const r of records ?? []) {
    const arr = recordsBySession.get(r.session_id as string) ?? [];
    arr.push({ status: r.status as AttendanceStatus });
    recordsBySession.set(r.session_id as string, arr);
  }

  return sessions.map((s) => {
    const recs = recordsBySession.get(s.id) ?? [];
    const counts: Record<AttendanceStatus, number> = {
      present: 0,
      late: 0,
      absent: 0,
      excused: 0,
    };
    for (const r of recs) counts[r.status]++;
    const marked = recs.length;
    return {
      ...(s as AttendanceSession),
      counts,
      unmarked: Math.max(0, totalStudents - marked),
      total_students: totalStudents,
    };
  });
}

export async function getSessionRoster(
  sessionId: string,
  classId: string,
): Promise<{ session: AttendanceSession; rows: SessionRosterRow[] } | null> {
  // 강사 전용
  await requireInstructorOfClass(classId);
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("attendance_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("class_id", classId)
    .single();
  if (!session) return null;

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("id, user_id")
    .eq("class_id", classId)
    .eq("status", "active")
    .order("enrolled_at", { ascending: true });

  const enrollmentRows = enrollments ?? [];
  const userIds = enrollmentRows.map((e) => e.user_id as string);

  const [emailMap, { data: records }] = await Promise.all([
    getEmailsByUserIds(userIds),
    userIds.length
      ? supabase
          .from("attendance_records")
          .select("user_id, status, marked_at")
          .eq("session_id", sessionId)
          .in("user_id", userIds)
      : Promise.resolve({ data: [] }),
  ]);

  const recordMap = new Map(
    (records ?? []).map((r: Record<string, unknown>) => [
      r.user_id as string,
      {
        status: r.status as AttendanceStatus,
        marked_at: r.marked_at as string,
      },
    ]),
  );

  const rows: SessionRosterRow[] = enrollmentRows.map(
    (e: Record<string, unknown>) => {
      const userId = e.user_id as string;
      const rec = recordMap.get(userId);
      return {
        enrollment_id: e.id as string,
        user_id: userId,
        email: emailMap.get(userId) ?? "",
        status: rec?.status ?? null,
        marked_at: rec?.marked_at ?? null,
      };
    },
  );

  return { session: session as AttendanceSession, rows };
}

export async function getStudentAttendance(
  classId: string,
): Promise<StudentAttendanceSummary> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      sessions: [],
      counts: { present: 0, late: 0, absent: 0, excused: 0 },
      total: 0,
      rate: 0,
    };
  }

  const { data: sessions } = await supabase
    .from("attendance_sessions")
    .select("*")
    .eq("class_id", classId)
    .order("session_date", { ascending: false });

  const all = (sessions ?? []) as AttendanceSession[];
  const sessionIds = all.map((s) => s.id);

  const { data: myRecords } = sessionIds.length
    ? await supabase
        .from("attendance_records")
        .select("session_id, status, marked_at")
        .eq("user_id", user.id)
        .in("session_id", sessionIds)
    : { data: [] };

  const myMap = new Map(
    (myRecords ?? []).map((r: Record<string, unknown>) => [
      r.session_id as string,
      {
        status: r.status as AttendanceStatus,
        marked_at: r.marked_at as string,
      },
    ]),
  );

  const rows: StudentSessionRow[] = all.map((s) => {
    const rec = myMap.get(s.id);
    return {
      ...s,
      my_status: rec?.status ?? null,
      marked_at: rec?.marked_at ?? null,
    };
  });

  const counts: Record<AttendanceStatus, number> = {
    present: 0,
    late: 0,
    absent: 0,
    excused: 0,
  };
  for (const r of rows) {
    if (r.my_status) counts[r.my_status]++;
  }
  const denom = counts.present + counts.late + counts.absent;
  const rate =
    denom === 0
      ? 0
      : Math.round(((counts.present + counts.late) / denom) * 100);

  return {
    sessions: rows,
    counts,
    total: rows.length,
    rate,
  };
}
