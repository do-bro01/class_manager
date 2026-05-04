import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getClasses } from '@/lib/actions/class'
import { getEnrolledClasses } from '@/lib/actions/enrollment'
import Header from '@/components/layout/Header'
import InviteCodeInput from '@/components/features/InviteCodeInput'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Class } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const isInstructor = user.app_metadata?.role === 'instructor'

  if (isInstructor) {
    const classes = await getClasses()
    return (
      <div className="min-h-screen flex flex-col">
        <Header user={user} />
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold">내 수업 목록</h1>
            <Link href="/classes/new">
              <Button>+ 새 수업 만들기</Button>
            </Link>
          </div>
          {classes.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <p className="mb-4">아직 등록된 수업이 없습니다.</p>
              <Link href="/classes/new">
                <Button variant="outline">첫 수업 만들기</Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {classes.map((cls: Class) => (
                <Link key={cls.id} href={`/classes/${cls.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardHeader>
                      <CardTitle className="text-base">{cls.name}</CardTitle>
                      <CardDescription>{cls.institution}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          {cls.invite_code}
                        </Badge>
                      </div>
                      {(cls.start_date || cls.end_date) && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {cls.start_date ?? '?'} ~ {cls.end_date ?? '?'}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    )
  }

  // 수강생 뷰
  const enrollments = await getEnrolledClasses()

  return (
    <div className="min-h-screen flex flex-col">
      <Header user={user} />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 space-y-8">
        <section className="space-y-3">
          <h2 className="text-lg font-medium">수업 등록</h2>
          <InviteCodeInput />
        </section>
        <section>
          <h1 className="text-2xl font-semibold mb-4">내 수업 목록</h1>
          {enrollments.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <p>아직 등록된 수업이 없습니다.</p>
              <p className="text-sm mt-1">강사에게 초대 코드를 받아 수업에 참여하세요.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {enrollments.map((enrollment: { id: string; classes: Class }) => {
                const cls = enrollment.classes
                return (
                  <Link key={enrollment.id} href={`/classes/${cls.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                      <CardHeader>
                        <CardTitle className="text-base">{cls.name}</CardTitle>
                        <CardDescription>{cls.institution}</CardDescription>
                      </CardHeader>
                      {(cls.start_date || cls.end_date) && (
                        <CardContent>
                          <p className="text-xs text-muted-foreground">
                            {cls.start_date ?? '?'} ~ {cls.end_date ?? '?'}
                          </p>
                        </CardContent>
                      )}
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
