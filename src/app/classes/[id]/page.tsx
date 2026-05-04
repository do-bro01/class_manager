import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClass } from "@/lib/actions/class";
import { getEnrollments } from "@/lib/actions/enrollment";
import { getNotices, getQnAs } from "@/lib/actions/post";
import {
  getSessionsWithStats,
  getStudentAttendance,
} from "@/lib/actions/attendance";
import { getMaterials } from "@/lib/actions/material";
import { isInstructor } from "@/lib/auth/role";
import Header from "@/components/layout/Header";
import NoticeList from "@/components/features/NoticeList";
import QnAList from "@/components/features/QnAList";
import StudentList from "@/components/features/StudentList";
import AttendanceSessionList from "@/components/features/AttendanceSessionList";
import StudentAttendanceView from "@/components/features/StudentAttendanceView";
import MaterialsList from "@/components/features/MaterialsList";
import DeleteClassButton from "@/components/features/DeleteClassButton";
import CopyButton from "@/components/features/CopyButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const isInstructorUser = isInstructor(user);
  const cls = await getClass(id);
  if (!cls) notFound();

  const [
    enrollments,
    notices,
    qnas,
    attendanceSessions,
    studentAttendance,
    materials,
  ] = await Promise.all([
    getEnrollments(id),
    getNotices(id),
    getQnAs(id),
    isInstructorUser ? getSessionsWithStats(id) : Promise.resolve([]),
    !isInstructorUser ? getStudentAttendance(id) : Promise.resolve(null),
    getMaterials(id),
  ]);

  const activeEnrollments = enrollments.filter((e) => e.status === "active");

  return (
    <div className="min-h-screen flex flex-col">
      <Header user={user} />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        {/* 수업 헤더 */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                {cls.institution}
              </p>
              <h1 className="text-2xl font-semibold">{cls.name}</h1>
              {(cls.start_date || cls.end_date) && (
                <p className="text-sm text-muted-foreground mt-1">
                  {cls.start_date ?? "?"} ~ {cls.end_date ?? "?"}
                </p>
              )}
            </div>
            {isInstructorUser && (
              <div className="flex items-center gap-2 shrink-0">
                <Link href={`/classes/${id}/edit`}>
                  <Button variant="outline" size="sm">
                    수업 수정
                  </Button>
                </Link>
                <DeleteClassButton
                  classId={id}
                  hasStudents={enrollments.length > 0}
                />
              </div>
            )}
          </div>

          {isInstructorUser && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">초대 코드</span>
              <Badge
                variant="outline"
                className="font-mono text-base px-3 py-1 tracking-widest"
              >
                {cls.invite_code}
              </Badge>
              <CopyButton code={cls.invite_code} />
            </div>
          )}
        </div>

        <Separator className="mb-6" />

        {/* 탭 */}
        <Tabs defaultValue="notices">
          <TabsList>
            <TabsTrigger value="notices">공지 ({notices.length})</TabsTrigger>
            <TabsTrigger value="qna">QnA ({qnas.length})</TabsTrigger>
            <TabsTrigger value="materials">
              자료실 ({materials.length})
            </TabsTrigger>
            <TabsTrigger value="attendance">
              출결{isInstructorUser ? ` (${attendanceSessions.length})` : ""}
            </TabsTrigger>
            {isInstructorUser && (
              <TabsTrigger value="students">
                수강생 ({activeEnrollments.length})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="notices" className="mt-6">
            <NoticeList
              classId={id}
              notices={notices}
              isInstructor={isInstructorUser}
              currentUserId={user.id}
            />
          </TabsContent>

          <TabsContent value="qna" className="mt-6">
            <QnAList
              classId={id}
              qnas={qnas}
              isInstructor={isInstructorUser}
              currentUserId={user.id}
            />
          </TabsContent>

          <TabsContent value="materials" className="mt-6">
            <MaterialsList
              classId={id}
              materials={materials}
              isInstructor={isInstructorUser}
            />
          </TabsContent>

          <TabsContent value="attendance" className="mt-6">
            {isInstructorUser ? (
              <AttendanceSessionList
                classId={id}
                sessions={attendanceSessions}
              />
            ) : (
              studentAttendance && (
                <StudentAttendanceView summary={studentAttendance} />
              )
            )}
          </TabsContent>

          {isInstructorUser && (
            <TabsContent value="students" className="mt-6">
              <StudentList classId={id} enrollments={enrollments} />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}
