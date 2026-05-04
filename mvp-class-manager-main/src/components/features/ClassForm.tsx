'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClass, updateClass } from '@/lib/actions/class'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Class } from '@/types'

type Props = {
  cls?: Class
}

export default function ClassForm({ cls }: Props) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = cls
      ? await updateClass(cls.id, formData)
      : await createClass(formData)

    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }

    if (!cls && result.success) {
      const created = (result as { success: true; data: Class }).data
      router.push(`/classes/${created.id}`)
    } else {
      router.push(`/classes/${cls!.id}`)
    }
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="institution">기관명 *</Label>
        <Input
          id="institution"
          name="institution"
          placeholder="예: 강남대학교"
          defaultValue={cls?.institution}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">과목명 *</Label>
        <Input
          id="name"
          name="name"
          placeholder="예: 웹 프로그래밍 기초"
          defaultValue={cls?.name}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_date">시작일</Label>
          <Input
            id="start_date"
            name="start_date"
            type="date"
            defaultValue={cls?.start_date ?? ''}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_date">종료일</Label>
          <Input
            id="end_date"
            name="end_date"
            type="date"
            defaultValue={cls?.end_date ?? ''}
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? '저장 중...' : cls ? '수정 완료' : '수업 만들기'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          취소
        </Button>
      </div>
    </form>
  )
}
