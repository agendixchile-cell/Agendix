import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getMarketingUrl } from '@/lib/urls'

const marketingHomeUrl = getMarketingUrl('/')

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#FCFBF9]">
      <header className="fixed left-0 right-0 top-0 z-20 px-4 py-4 sm:px-6">
        <Link
          href={marketingHomeUrl}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200/80 bg-white/90 px-3 text-sm font-semibold text-slate-600 shadow-sm shadow-slate-900/[0.04] transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Volver a la landing
        </Link>
      </header>
      <main className="flex min-h-screen items-center justify-center p-4 pt-20 sm:p-6 sm:pt-24">
        <div className="w-full">{children}</div>
      </main>
    </div>
  )
}
