'use client'

import { useState } from 'react'
import { createPost } from '@/lib/actions/post'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Props = {
  classId: string
  type: 'notice' | 'qna'
  parentId?: string
  onSuccess?: () => void
  titlePlaceholder?: string
  contentPlaceholder?: string
  hideTitle?: boolean
}

export default function PostForm({
  classId,
  type,
  parentId,
  onSuccess,
  titlePlaceholder,
  contentPlaceholder,
  hideTitle,
}: Props) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    formData.set('type', type)
    if (parentId) formData.set('parent_id', parentId)
    if (hideTitle) formData.set('title', '답변')

    const result = await createPost(classId, formData)
    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }

    ;(e.target as HTMLFormElement).reset()
    onSuccess?.()
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {!hideTitle && (
        <div className="space-y-1">
          <Label htmlFor="title">제목</Label>
          <Input id="title" name="title" placeholder={titlePlaceholder ?? '제목을 입력하세요'} required />
        </div>
      )}
      <div className="space-y-1">
        <Label htmlFor="content">내용</Label>
        <Textarea id="content" name="content" placeholder={contentPlaceholder ?? '내용을 입력하세요'} rows={4} required />
      </div>
      {type === 'notice' && (
        <div className="space-y-1">
          <Label htmlFor="link_url">링크 (선택)</Label>
          <Input id="link_url" name="link_url" type="url" placeholder="https://..." />
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="sm" disabled={loading}>
        {loading ? '등록 중...' : '등록'}
      </Button>
    </form>
  )
}
