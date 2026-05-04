'use client'

import { useState } from 'react'
import { deletePost } from '@/lib/actions/post'
import PostForm from './PostForm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { Post } from '@/types'

type Props = {
  classId: string
  notices: Post[]
  isInstructor: boolean
  currentUserId: string
}

export default function NoticeList({ classId, notices, isInstructor, currentUserId }: Props) {
  const [showForm, setShowForm] = useState(false)

  async function handleDelete(postId: string) {
    if (!confirm('공지를 삭제하시겠습니까?')) return
    await deletePost(postId, classId)
  }

  return (
    <div className="space-y-4">
      {isInstructor && (
        <div>
          <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
            {showForm ? '닫기' : '+ 공지 작성'}
          </Button>
          {showForm && (
            <div className="mt-3 p-4 border rounded-lg bg-muted/40">
              <PostForm classId={classId} type="notice" onSuccess={() => setShowForm(false)} />
            </div>
          )}
        </div>
      )}

      {notices.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">등록된 공지가 없습니다.</p>
      ) : (
        notices.map((notice) => (
          <Card key={notice.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base font-medium">{notice.title}</CardTitle>
                {notice.author_id === currentUserId && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive shrink-0 h-7 px-2"
                    onClick={() => handleDelete(notice.id)}
                  >
                    삭제
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(notice.created_at).toLocaleDateString('ko-KR')}
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm whitespace-pre-wrap">{notice.content}</p>
              {notice.link_url && (
                <>
                  <Separator />
                  <a
                    href={notice.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline break-all"
                  >
                    {notice.link_url}
                  </a>
                </>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
