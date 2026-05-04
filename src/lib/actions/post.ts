'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult, Post, PostWithAnswer } from '@/types'

export async function createPost(
  classId: string,
  formData: FormData
): Promise<ActionResult<Post>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '로그인이 필요합니다.' }

  const type = formData.get('type') as 'notice' | 'qna'
  const title = (formData.get('title') as string).trim()
  const content = (formData.get('content') as string).trim()
  const link_url = (formData.get('link_url') as string)?.trim() || null
  const parent_id = (formData.get('parent_id') as string) || null

  if (!title) return { success: false, error: '제목을 입력해주세요.' }
  if (!content) return { success: false, error: '내용을 입력해주세요.' }

  const isInstructor = user.app_metadata?.role === 'instructor'

  if (type === 'notice' && !isInstructor) {
    return { success: false, error: '공지는 강사만 작성할 수 있습니다.' }
  }

  if (link_url) {
    try { new URL(link_url) } catch {
      return { success: false, error: '올바른 URL 형식이 아닙니다.' }
    }
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({ class_id: classId, author_id: user.id, type, title, content, link_url, parent_id })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath(`/classes/${classId}`)
  return { success: true, data }
}

export async function updatePost(
  postId: string,
  classId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '로그인이 필요합니다.' }

  const title = (formData.get('title') as string).trim()
  const content = (formData.get('content') as string).trim()
  const link_url = (formData.get('link_url') as string)?.trim() || null

  if (!title) return { success: false, error: '제목을 입력해주세요.' }
  if (!content) return { success: false, error: '내용을 입력해주세요.' }

  const { error } = await supabase
    .from('posts')
    .update({ title, content, link_url, updated_at: new Date().toISOString() })
    .eq('id', postId)
    .eq('author_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/classes/${classId}`)
  return { success: true, data: undefined }
}

export async function deletePost(postId: string, classId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '로그인이 필요합니다.' }

  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)
    .eq('author_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/classes/${classId}`)
  return { success: true, data: undefined }
}

export async function getNotices(classId: string): Promise<Post[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('posts')
    .select('*')
    .eq('class_id', classId)
    .eq('type', 'notice')
    .is('parent_id', null)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function getQnAs(classId: string): Promise<PostWithAnswer[]> {
  const supabase = await createClient()

  const { data: questions } = await supabase
    .from('posts')
    .select('*')
    .eq('class_id', classId)
    .eq('type', 'qna')
    .is('parent_id', null)
    .order('created_at', { ascending: false })

  if (!questions) return []

  const { data: answers } = await supabase
    .from('posts')
    .select('*')
    .eq('class_id', classId)
    .eq('type', 'qna')
    .not('parent_id', 'is', null)

  const answerMap = new Map((answers ?? []).map((a: Post) => [a.parent_id, a]))

  return questions.map((q: Post) => ({
    ...q,
    answer: answerMap.get(q.id) ?? null,
  }))
}
