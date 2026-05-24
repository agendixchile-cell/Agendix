import type { MetadataRoute } from 'next'
import { getMarketingBaseUrl } from '@/lib/urls'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getMarketingBaseUrl()

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/agenda',
        '/admin',
        '/configuracion',
        '/dashboard',
        '/estadisticas',
        '/fichas-clinicas',
        '/pacientes',
        '/profesionales',
        '/reservas',
        '/salas',
        '/servicios',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
