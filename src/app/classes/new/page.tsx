import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import ClassForm from '@/components/features/ClassForm'

export default async function NewClassPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'instructor') redirect('/dashboard')

  return (
    <div className="min-h-screen flex flex-col">
      <Header user={user} />
      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-8">
        <h1 className="text-2xl font-semibold mb-6">새 수업 만들기</h1>
        <ClassForm />
      </main>
    </div>
  )
}
