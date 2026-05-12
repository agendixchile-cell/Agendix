import { redirect } from 'next/navigation'
import { isDemoMode } from '@/lib/auth/demo'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  if (isDemoMode()) {
    redirect('/agenda')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  redirect(user ? '/agenda' : '/login')
}
