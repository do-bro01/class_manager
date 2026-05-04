'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import {
  createSession,
  deleteSession,
  toggleCheckInOpen,
} from '@/lib/actions/attendance'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AttendanceSessionWithStats } from '@/types'

type Props = {
  classId: string
  sessions: AttendanceSessionWithStats[]
}

export default function AttendanceSessionList({ classId, sessions }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleCreate(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const res = await createSession(classId, formData)
      if (!res.success) setError(res.error)
      else setShowForm(false)
    })
  }

  function handleToggle(sessionId: string, current: boolean) {
    startTransition(async () => {
      await toggleCheckInOpen(sessionId, classId, !current)
    })
  }

  function handleDelete(sessionId: string) {
    if (!confirm('이 회차를 삭제하시겠습니까? 출결 기록도 함께 삭제됩니다.')) return
    startTransition(async () => {
      await deleteSession(sessionId, classId)
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
          {showForm ? '닫기' : '+ 새 출결 회차'}
        </Button>
        {showForm && (
          <form
            action={handleCreate}
            className="mt-3 p-4 border rounded-lg bg-muted/40 space-y-3"
          >
            <div>
              <Label htmlFor="title">회차 제목</Label>
              <Input
                id="title"
                name="title"
                placeholder="예: 1주차 강의"
                required
                disabled={isPending}
              />
            </div>
            <div>
              <Label htmlFor="session_date">날짜</Label>
              <Input
                id="session_date"
                name="session_date"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
                disabled={isPending}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button size="sm" type="submit" disabled={isPending}>
              {isPending ? '생성 중...' : '회차 생성'}
            </Button>
          </form>
        )}
      </div>

      {sessions.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">
          아직 출결 회차가 없습니다.
        </p>
      ) : (
        sessions.map((s) => (
          <Card key={s.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle className="text-base font-medium">{s.title}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(s.session_date).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                {s.check_in_open ? (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                    체크인 열림
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    체크인 닫힘
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <StatChip label="출석" value={s.counts.present} color="text-green-700" />
                <StatChip label="지각" value={s.counts.late} color="text-amber-700" />
                <StatChip label="결석" value={s.counts.absent} color="text-red-700" />
                <StatChip label="공결" value={s.counts.excused} color="text-blue-700" />
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">
                  미입력 {s.unmarked} / 전체 {s.total_students}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/classes/${classId}/attendance/${s.id}`}>
                  <Button size="sm" variant="outline">출석부 열기</Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => handleToggle(s.id, s.check_in_open)}
                >
                  {s.check_in_open ? '체크인 닫기' : '체크인 열기'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  disabled={isPending}
                  onClick={() => handleDelete(s.id)}
                >
                  삭제
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

function StatChip({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <span className={`font-medium ${color}`}>
      {label} {value}
    </span>
  )
}
