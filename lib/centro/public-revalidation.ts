import { revalidatePath } from 'next/cache'
import type { createClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export async function revalidateCentroPublicPaths(
  supabase: SupabaseServerClient,
  centroId: string
) {
  const { data } = await supabase
    .from('centros')
    .select('slug')
    .eq('id', centroId)
    .maybeSingle()

  if (!data?.slug) return

  revalidatePath(`/${data.slug}`)
  revalidatePath(`/agendar/${data.slug}`)
}
