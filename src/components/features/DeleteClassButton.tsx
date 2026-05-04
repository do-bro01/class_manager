'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteClass } from '@/lib/actions/class'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export default function DeleteClassButton({
  classId,
  hasStudents,
}: {
  classId: string
  hasStudents: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    setLoading(true)
    const result = await deleteClass(classId)
    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }
    setOpen(false)
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">수업 삭제</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>수업을 삭제하시겠습니까?</DialogTitle>
          <DialogDescription>
            {hasStudents
              ? '이 수업에는 수강생이 등록되어 있습니다. 삭제하면 모든 데이터(수강생, 공지, QnA)가 영구적으로 삭제됩니다.'
              : '삭제된 수업은 복구할 수 없습니다.'}
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>취소</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? '삭제 중...' : '삭제 확인'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
