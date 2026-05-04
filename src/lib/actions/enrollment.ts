'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult, EnrollmentWithEmail } from '@/types'

export async function joinClassByCode(code: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '로그인이 필요합니다.' }

  const trimmedCode = code.trim().toUpperCase()
  if (!trimmedCode) return { success: false, error: '초대 코드를 입력해주세요.' }

  const { data: cls } = await supabase
    .from('classes')
    .select('id')
    .eq('invite_code', trimmedCode)
    .single()

  if (!cls) return { success: false, error: '유효하지 않은 초대 코드입니다.' }

  const { data: existing } = await supabase
    .from('enrollments')
    .select('id')
    .eq('class_id', cls.id)
    .eq('user_id', user.id)
    .single()

  if (existing) return { success: false, error: '이미 등록된 수업입니다.' }

  const { error } = await supabase.from('enrollments').insert({
    class_id: cls.id,
    user_id: user.id,
    status: 'active',
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard')
  return { success: true, data: undefined }
}

export async function updateEnrollmentStatus(
  enrollmentId: string,
  status: 'active' | 'inactive',
  classId: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'instructor') {
    return { success: false, error: '권한이 없습니다.' }
  }

  const { error } = await supabase
    .from('enrollments')
    .update({ status })
    .eq('id', enrollmentId)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/classes/${classId}`)
  return { success: true, data: undefined }
}

export async function getEnrollments(classId: string): Promise<EnrollmentWithEmail[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('enrollments')
    .select('*, users:user_id(email)')
    .eq('class_id', classId)
    .order('enrolled_at', { ascending: false })

  if (!data) return []

  return data.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    class_id: row.class_id as string,
    user_id: row.user_id as string,
    status: row.status as 'active' | 'inactive',
    enrolled_at: row.enrolled_at as string,
    email: (row.users as { email: string } | null)?.email ?? '',
  }))
}

export async function getEnrolledClasses() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('enrollments')
    .select('*, classes(*)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('enrolled_at', { ascending: false })

  return data ?? []
}
