'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { markAttendance } from '@/lib/actions/attendance'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { AttendanceStatus, SessionRosterRow } from '@/types'

type Props = {
  classId: string
  sessionId: string
  rows: SessionRosterRow[]
}

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; tone: string }[] = [
  { value: 'present', label: '출석', tone: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'late', label: '지각', tone: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'absent', label: '결석', tone: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'excused', label: '공결', tone: 'bg-blue-100 text-blue-700 border-blue-200' },
]

export default function AttendanceRoster({ classId, sessionId, rows }: Props) {
  const router = useRouter()
  const [draft, setDraft] = useState<Record<string, AttendanceStatus | null>>(() =>
    Object.fromEntries(rows.map((r) => [r.user_id, r.status]))
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const dirty = rows.some((r) => draft[r.user_id] !== r.status)

  function setStatus(userId: string, status: AttendanceStatus | null) {
    setDraft((prev) => ({ ...prev, [userId]: status }))
  }

  function bulkSet(status: AttendanceStatus) {
    setDraft((prev) => {
      const next = { ...prev }
      for (const r of rows) next[r.user_id] = status
      return next
    })
  }

  function handleSave() {
    setError(null)
    const marks = rows.map((r) => ({
      user_id: r.user_id,
      status: draft[r.user_id] ?? null,
    }))
    startTransition(async () => {
      const res = await markAttendance(sessionId, classId, marks)
      if (!res.success) setError(res.error)
      else router.refresh()
    })
  }

  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-8 text-center">
        등록된 수강생이 없습니다.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">전체 일괄:</span>
        {STATUS_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            size="sm"
            variant="outline"
            onClick={() => bulkSet(opt.value)}
            disabled={isPending}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>이름</TableHead>
            <TableHead>이메일</TableHead>
            <TableHead>상태</TableHead>
            <TableHead className="text-right">최근 입력</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const value = draft[row.user_id]
            return (
              <TableRow key={row.user_id}>
                <TableCell className="font-medium">
                  {row.name || <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-muted-foreground">{row.email}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {STATUS_OPTIONS.map((opt) => {
                      const active = value === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            setStatus(row.user_id, active ? null : opt.value)
                          }
                          className={`text-xs px-2 py-1 rounded border transition ${
                            active
                              ? opt.tone
                              : 'border-transparent text-muted-foreground hover:border-muted-foreground/30'
                          }`}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">
                  {row.marked_at
                    ? new Date(row.marked_at).toLocaleString('ko-KR')
                    : '-'}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between gap-3 pt-2 border-t">
        <div className="text-sm text-muted-foreground">
          {dirty ? '변경사항이 저장되지 않았습니다.' : '변경사항이 없습니다.'}
        </div>
        <div className="flex items-center gap-2">
          {error && <span className="text-sm text-destructive">{error}</span>}
          <Button onClick={handleSave} disabled={!dirty || isPending}>
            {isPending ? '저장 중...' : '저장'}
          </Button>
        </div>
      </div>

      <Legend />
    </div>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground pt-2">
      <Badge variant="outline">선택 해제 = 미입력</Badge>
      <Badge variant="outline">출석률 = (출석 + 지각) / (출석 + 지각 + 결석)</Badge>
      <Badge variant="outline">공결은 출석률 분모 제외</Badge>
    </div>
  )
}
