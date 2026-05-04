import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getClass } from '@/lib/actions/class'
import Header from '@/components/layout/Header'
import ClassForm from '@/components/features/ClassForm'

export default async function EditClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'instructor') redirect('/dashboard')

  const cls = await getClass(id)
  if (!cls) notFound()

  return (
    <div className="min-h-screen flex flex-col">
      <Header user={user} />
      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-8">
        <h1 className="text-2xl font-semibold mb-6">수업 수정</h1>
        <ClassForm cls={cls} />
      </main>
    </div>
  )
}
