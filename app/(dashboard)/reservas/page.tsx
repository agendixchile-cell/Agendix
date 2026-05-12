import { ReservasManager } from '@/components/reservas/reservas-manager'
import { getReservasPageData } from '@/lib/reservas/page-data'

export default async function ReservasPage() {
  const reservasData = await getReservasPageData()

  return <ReservasManager {...reservasData} viewMode="reservas" />
}
