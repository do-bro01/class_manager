'use client'

import { useState } from 'react'
import { deletePost } from '@/lib/actions/post'
import PostForm from './PostForm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { PostWithAnswer } from '@/types'

type Props = {
  classId: string
  qnas: PostWithAnswer[]
  isInstructor: boolean
  currentUserId: string
}

export default function QnAList({ classId, qnas, isInstructor, currentUserId }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)

  async function handleDelete(postId: string) {
    if (!confirm('삭제하시겠습니까?')) return
    await deletePost(postId, classId)
  }

  return (
    <div className="space-y-4">
      {!isInstructor && (
        <div>
          <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
            {showForm ? '닫기' : '+ 질문 작성'}
          </Button>
          {showForm && (
            <div className="mt-3 p-4 border rounded-lg bg-muted/40">
              <PostForm
                classId={classId}
                type="qna"
                onSuccess={() => setShowForm(false)}
                titlePlaceholder="질문 제목"
                contentPlaceholder="질문 내용을 입력하세요"
              />
            </div>
          )}
        </div>
      )}

      {qnas.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">등록된 질문이 없습니다.</p>
      ) : (
        qnas.map((qna) => (
          <Card key={qna.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base font-medium">{qna.title}</CardTitle>
                  {qna.answer ? (
                    <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100">
                      답변 완료
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">미답변</Badge>
                  )}
                </div>
                {qna.author_id === currentUserId && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive shrink-0 h-7 px-2"
                    onClick={() => handleDelete(qna.id)}
                  >
                    삭제
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(qna.created_at).toLocaleDateString('ko-KR')}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm whitespace-pre-wrap">{qna.content}</p>

              {qna.answer && (
                <div className="ml-4 pl-4 border-l-2 border-primary/30 space-y-1">
                  <p className="text-xs font-medium text-primary">강사 답변</p>
                  <p className="text-sm whitespace-pre-wrap">{qna.answer.content}</p>
                  {qna.answer.author_id === currentUserId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive h-6 px-2 text-xs"
                      onClick={() => handleDelete(qna.answer!.id)}
                    >
                      답변 삭제
                    </Button>
                  )}
                </div>
              )}

              {isInstructor && !qna.answer && (
                <div>
                  {replyingTo === qna.id ? (
                    <div className="ml-4 pl-4 border-l-2 border-primary/30">
                      <PostForm
                        classId={classId}
                        type="qna"
                        parentId={qna.id}
                        onSuccess={() => setReplyingTo(null)}
                        contentPlaceholder="답변 내용을 입력하세요"
                        hideTitle
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-1"
                        onClick={() => setReplyingTo(null)}
                      >
                        취소
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setReplyingTo(qna.id)}
                    >
                      답변 작성
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
