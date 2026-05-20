import Link from 'next/link'
import { AgendixWordmark } from '@/components/brand/agendix-brand'
import { getMarketingUrl } from '@/lib/urls'
import { PasswordUpdateForm } from './password-update-form'

const marketingHomeUrl = getMarketingUrl('/')

export default function ActualizarContrasenaPage() {
  return (
    <div className="mx-auto flex w-full max-w-[27rem] flex-col">
      <div className="mb-6 flex flex-col items-center text-center">
        <Link
          href={marketingHomeUrl}
          className="inline-flex"
          aria-label="Volver a la landing de Agendix"
        >
          <AgendixWordmark preload className="mx-auto" />
        </Link>
        <p className="mt-3 max-w-xs text-sm leading-6 text-slate-500">
          Crea una contraseña nueva para volver a ingresar a Agendix.
        </p>
      </div>

      <div className="rounded-2xl border border-[#ebe7df] bg-white/90 p-5 shadow-xl shadow-slate-900/[0.06] sm:p-7">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-slate-900">
            Nueva contraseña
          </h1>
          <p className="mt-1.5 text-sm leading-6 text-slate-500">
            El enlace de recuperación deja tu sesión lista para guardar el cambio.
          </p>
        </div>

        <PasswordUpdateForm />
      </div>
    </div>
  )
}
