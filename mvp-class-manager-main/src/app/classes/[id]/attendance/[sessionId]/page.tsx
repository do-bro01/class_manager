import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getClass } from '@/lib/actions/class'
import { getSessionRoster } from '@/lib/actions/attendance'
import Header from '@/components/layout/Header'
import AttendanceRoster from '@/components/features/AttendanceRoster'
import { Button } from '@/components/ui/button'

export default async function AttendanceRosterPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>
}) {
  const { id, sessionId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (user.app_metadata?.role !== 'instructor') redirect(`/classes/${id}`)

  const cls = await getClass(id)
  if (!cls) notFound()
  if (cls.instructor_id !== user.id) redirect('/dashboard')

  const roster = await getSessionRoster(sessionId, id)
  if (!roster) notFound()

  return (
    <div className="min-h-screen flex flex-col">
      <Header user={user} />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <div className="mb-4">
          <Link
            href={`/classes/${id}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            ← {cls.name}
          </Link>
        </div>

        <div className="mb-6 flex items-start justify-between gap-2 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold">{roster.session.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date(roster.session.session_date).toLocaleDateString('ko-KR')}
              {roster.session.check_in_open && (
                <span className="ml-2 text-green-700">· 체크인 열림</span>
              )}
            </p>
          </div>
          <Link href={`/classes/${id}`}>
            <Button variant="outline" size="sm">수업으로 돌아가기</Button>
          </Link>
        </div>

        <AttendanceRoster classId={id} sessionId={sessionId} rows={roster.rows} />
      </main>
    </div>
  )
}
