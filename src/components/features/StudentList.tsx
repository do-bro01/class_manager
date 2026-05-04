'use client'

import { useState } from 'react'
import { updateEnrollmentStatus } from '@/lib/actions/enrollment'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { EnrollmentWithEmail } from '@/types'

type Props = {
  classId: string
  enrollments: EnrollmentWithEmail[]
}

export default function StudentList({ classId, enrollments }: Props) {
  const [loading, setLoading] = useState<string | null>(null)

  async function handleToggle(enrollmentId: string, currentStatus: 'active' | 'inactive') {
    setLoading(enrollmentId)
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    await updateEnrollmentStatus(enrollmentId, newStatus, classId)
    setLoading(null)
  }

  if (enrollments.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-8 text-center">
        아직 등록된 수강생이 없습니다.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>이메일</TableHead>
          <TableHead>등록일</TableHead>
          <TableHead>상태</TableHead>
          <TableHead className="text-right">관리</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {enrollments.map((enrollment) => (
          <TableRow key={enrollment.id}>
            <TableCell className="font-medium">{enrollment.email}</TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {new Date(enrollment.enrolled_at).toLocaleDateString('ko-KR')}
            </TableCell>
            <TableCell>
              {enrollment.status === 'active' ? (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">활성</Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">비활성</Badge>
              )}
            </TableCell>
            <TableCell className="text-right">
              <Button
                size="sm"
                variant="ghost"
                disabled={loading === enrollment.id}
                onClick={() => handleToggle(enrollment.id, enrollment.status)}
              >
                {loading === enrollment.id
                  ? '처리 중...'
                  : enrollment.status === 'active' ? '비활성화' : '활성화'}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
