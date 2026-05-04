'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { selfCheckIn } from '@/lib/actions/attendance'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AttendanceStatus, StudentAttendanceSummary } from '@/types'

type Props = {
  summary: StudentAttendanceSummary
}

const STATUS_LABEL: Record<AttendanceStatus, { label: string; cls: string }> = {
  present: { label: '출석', cls: 'bg-green-100 text-green-700' },
  late: { label: '지각', cls: 'bg-amber-100 text-amber-700' },
  absent: { label: '결석', cls: 'bg-red-100 text-red-700' },
  excused: { label: '공결', cls: 'bg-blue-100 text-blue-700' },
}

export default function StudentAttendanceView({ summary }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleCheckIn(sessionId: string) {
    startTransition(async () => {
      const res = await selfCheckIn(sessionId)
      if (!res.success) {
        alert(res.error)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* 요약 카드 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">내 출석 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <p className="text-3xl font-semibold">{summary.rate}%</p>
              <p className="text-xs text-muted-foreground">출석률</p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="text-green-700">출석 {summary.counts.present}</span>
              <span className="text-amber-700">지각 {summary.counts.late}</span>
              <span className="text-red-700">결석 {summary.counts.absent}</span>
              <span className="text-blue-700">공결 {summary.counts.excused}</span>
              <span className="text-muted-foreground">/ 전체 회차 {summary.total}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 회차 목록 */}
      {summary.sessions.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">
          아직 출결 회차가 없습니다.
        </p>
      ) : (
        <div className="space-y-3">
          {summary.sessions.map((s) => {
            const tag = s.my_status ? STATUS_LABEL[s.my_status] : null
            const canCheckIn = s.check_in_open && !s.my_status
            return (
              <Card key={s.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-medium">{s.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(s.session_date).toLocaleDateString('ko-KR')}
                        {s.check_in_open && (
                          <span className="ml-2 text-green-700">· 체크인 열림</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {tag ? (
                        <Badge className={`${tag.cls} hover:${tag.cls}`}>{tag.label}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          미입력
                        </Badge>
                      )}
                      {canCheckIn && (
                        <Button
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleCheckIn(s.id)}
                        >
                          지금 출석
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
