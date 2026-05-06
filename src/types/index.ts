export type UserRole = "instructor" | "student";

export type Class = {
  id: string;
  instructor_id: string;
  name: string;
  institution: string;
  invite_code: string;
  day_of_week: number | null;
  start_time: string | null;
  end_time: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};

export type ClassWithStats = Class & {
  enrollment_count: number;
  unanswered_qna_count: number;
};

export type Enrollment = {
  id: string;
  class_id: string;
  user_id: string;
  status: "active" | "inactive";
  enrolled_at: string;
};

export type EnrollmentWithEmail = Enrollment & {
  email: string;
  name: string;
};

export type Post = {
  id: string;
  class_id: string;
  author_id: string;
  type: "notice" | "qna";
  title: string;
  content: string;
  link_url: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PostWithAnswer = Post & {
  answer: Post | null;
};

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export type AttendanceStatus = "present" | "late" | "absent" | "excused";

export type AttendanceSession = {
  id: string;
  class_id: string;
  title: string;
  session_date: string;
  check_in_open: boolean;
  created_at: string;
};

export type AttendanceRecord = {
  id: string;
  session_id: string;
  user_id: string;
  status: AttendanceStatus;
  marked_by: string | null;
  marked_at: string;
};

export type AttendanceSessionWithStats = AttendanceSession & {
  counts: Record<AttendanceStatus, number>;
  unmarked: number;
  total_students: number;
};

export type SessionRosterRow = {
  enrollment_id: string;
  user_id: string;
  email: string;
  name: string;
  status: AttendanceStatus | null;
  marked_at: string | null;
};

export type StudentSessionRow = AttendanceSession & {
  my_status: AttendanceStatus | null;
  marked_at: string | null;
};

export type StudentAttendanceSummary = {
  sessions: StudentSessionRow[];
  counts: Record<AttendanceStatus, number>;
  total: number;
  rate: number;
};

export type Material = {
  id: string;
  class_id: string;
  uploader_id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string | null;
  created_at: string;
};
